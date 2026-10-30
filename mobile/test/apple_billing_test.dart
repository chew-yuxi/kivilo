import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_app_purchase_platform_interface/in_app_purchase_platform_interface.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/billing.dart';
import 'package:kivilo/screens/billing_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/apple_billing.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

const token = 'a7ef9d30-25ca-40b0-b8df-263dcb6f4d28';
const productId = 'kivilo_pro_monthly';
const catalog = [StorePlanProduct(productId: productId, seats: 1)];
ProductDetails product([String price = 'S\$39.00']) => ProductDetails(
  id: productId,
  title: 'Kivilo Pro',
  description: '25 active properties',
  price: price,
  rawPrice: 39,
  currencyCode: 'SGD',
);
PurchaseDetails purchase(
  String id, {
  PurchaseStatus status = PurchaseStatus.purchased,
}) => SK2PurchaseDetails(
  productID: productId,
  purchaseID: id,
  verificationData: PurchaseVerificationData(
    localVerificationData: '',
    serverVerificationData: 'signed-$id',
    source: 'app_store',
  ),
  transactionDate: '1000',
  status: status,
  appAccountToken: token,
);

class BillingApi extends Api {
  BillingApi() : super(attachAuth: false, cache: ReadCache());
  String? owner = 'alice';
  final verified = <(String, String)>[];
  Future<bool> Function()? verify;
  Completer<Map<String, dynamic>>? context;
  @override
  String? get currentOwnerId => owner;
  @override
  Future<Map<String, dynamic>> applePurchaseContext({
    required String agencyId,
    required String productId,
    required String expectedOwnerId,
  }) async => context?.future ?? {'appAccountToken': token};
  @override
  Future<bool> verifyApplePurchase({
    required String signedTransaction,
    required String expectedOwnerId,
  }) async {
    verified.add((signedTransaction, expectedOwnerId));
    return verify == null ? true : await verify!();
  }

  @override
  Future<String?> workspacePreference() async => 'personal';
  @override
  Future<AgencyIndex> agencies() async =>
      const AgencyIndex(agencies: [], invitations: []);
  @override
  Future<StoreBillingStatus> appleBillingStatus(String agencyId) async =>
      const StoreBillingStatus(
        products: catalog,
        canPurchase: true,
        canManageBilling: true,
        seats: 1,
        seatsNeeded: 1,
        activeProperties: 2,
        limit: 5,
        pro: false,
      );
}

class AppleStore extends InAppPurchasePlatform {
  final updates = StreamController<List<PurchaseDetails>>.broadcast();
  final finished = <String?>[];
  final bought = <PurchaseParam>[];
  int syncs = 0;
  String price = 'S\$39.00';
  @override
  Stream<List<PurchaseDetails>> get purchaseStream => updates.stream;
  @override
  Future<bool> isAvailable() async => true;
  @override
  Future<ProductDetailsResponse> queryProductDetails(
    Set<String> identifiers,
  ) async =>
      ProductDetailsResponse(productDetails: [product(price)], notFoundIDs: []);
  @override
  Future<bool> buyNonConsumable({required PurchaseParam purchaseParam}) async {
    bought.add(purchaseParam);
    return true;
  }

  @override
  Future<void> completePurchase(PurchaseDetails purchase) async {
    finished.add(purchase.purchaseID);
  }

  @override
  Future<void> restorePurchases({String? applicationUserName}) async {
    syncs++;
  }
}

void main() {
  late BillingApi api;
  late AppleStore store;
  late AppleBilling billing;
  late List<PurchaseDetails> owned;
  setUp(() {
    api = BillingApi();
    store = AppleStore();
    owned = [];
    billing = AppleBilling(
      api: api,
      store: store,
      ownedPurchases: () async => owned,
    );
  });
  tearDown(() async {
    billing.dispose();
    await store.updates.close();
  });

  test('finishes only after durable server verification', () async {
    owned = [purchase('1')];
    final verified = Completer<bool>();
    api.verify = () => verified.future;
    final restored = billing.restore();
    await Future<void>.delayed(Duration.zero);
    expect(api.verified, [('signed-1', 'alice')]);
    expect(store.finished, isEmpty);
    verified.complete(true);
    await restored;
    expect(store.finished, ['1']);
  });

  test(
    'keeps a failed verification unfinished and retries it after reconnect',
    () async {
      owned = [purchase('1')];
      api.verify = () async => throw const ApiFailure('Offline', 503);
      await billing.resume();
      expect(store.finished, isEmpty);
      billing.suspend();
      api.verify = null;
      await billing.resume();
      expect(store.finished, ['1']);
      expect(store.syncs, 0);
    },
  );

  test('does not verify metadata-only historical transactions during restore', () async {
    owned = [SK2PurchaseDetails(
      productID: productId,
      purchaseID: 'finished',
      verificationData: PurchaseVerificationData(
        localVerificationData: '', serverVerificationData: '', source: 'app_store',
      ),
      transactionDate: '1000', status: PurchaseStatus.purchased, appAccountToken: token,
    )];
    await billing.restore();
    expect(api.verified, isEmpty);
    expect(store.finished, isEmpty);
    store.updates.add([purchase('finished', status: PurchaseStatus.restored)]);
    await Future<void>.delayed(Duration.zero);
    expect(api.verified, [('signed-finished', 'alice')]);
    expect(store.finished, ['finished']);
    expect(billing.errorMessage, isNull);
  });

  test(
    'does not finish or announce a plan after account switching during verification',
    () async {
      owned = [purchase('1')];
      final verified = Completer<bool>();
      api.verify = () => verified.future;
      final restored = billing.restore();
      await Future<void>.delayed(Duration.zero);
      api.owner = 'bob';
      verified.complete(true);
      await restored;
      expect(store.finished, isEmpty);
      expect(billing.message, isNull);
    },
  );

  testWidgets('stops automatic retries after a definitive rejection without finishing the purchase', (tester) async {
    // The processing future and retry timer must share the widget test's clock.
    billing.dispose();
    billing = AppleBilling(api: api, store: store, ownedPurchases: () async => owned);
    owned = [purchase('1')];
    api.verify = () async => throw const ApiFailure('Offline', 503);
    await billing.resume();
    api.verify = () async => throw const ApiFailure('Purchase belongs to another account', 404);
    await tester.pump(const Duration(seconds: 30));
    await tester.pump();
    expect(api.verified, hasLength(2));
    await tester.pump(const Duration(seconds: 60));
    expect(api.verified, hasLength(2));
    expect(store.finished, isEmpty);
  });

  test(
    'puts the server account token on the Apple purchase and cancels a stale context',
    () async {
      await billing.purchase(agencyId: 'personal', product: product());
      expect(store.bought.single, isA<Sk2PurchaseParam>());
      expect(store.bought.single.applicationUserName, token);
      api.owner = 'bob';
      await billing.resume();
      api.context = Completer<Map<String, dynamic>>();
      final pending = billing.purchase(
        agencyId: 'personal',
        product: product(),
      );
      await Future<void>.delayed(Duration.zero);
      api.owner = 'carol';
      api.context!.complete({'appAccountToken': token});
      await pending;
      expect(store.bought, hasLength(1));
    },
  );

  test(
    'pending approval and cancellation never verify or finish a payment',
    () async {
      store.updates.add([purchase('1', status: PurchaseStatus.pending)]);
      await Future<void>.delayed(Duration.zero);
      expect(billing.message, contains('pending'));
      store.updates.add([purchase('1', status: PurchaseStatus.canceled)]);
      await Future<void>.delayed(Duration.zero);
      expect(billing.message, contains('canceled'));
      expect(api.verified, isEmpty);
      expect(store.finished, isEmpty);
    },
  );

  testWidgets(
    'shows the current Apple price, restoration, and subscription terms',
    (tester) async {
      store.price = 'S\$49.00';
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: BillingScreen(api: api, billing: billing),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('S\$49.00/month'), findsOneWidget);
      expect(find.text('S\$39.00/month'), findsNothing);
      expect(find.text('Subscribe with App Store'), findsOneWidget);
      expect(find.textContaining('Google Play'), findsNothing);
      await tester.scrollUntilVisible(find.text('Terms of Use'), 300);
      expect(find.text('Restore purchases'), findsOneWidget);
      expect(find.text('Terms of Use'), findsOneWidget);
      expect(find.text('Privacy policy'), findsOneWidget);
    },
  );
}
