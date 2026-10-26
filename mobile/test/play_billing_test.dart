import 'dart:async';
import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_app_purchase_android/billing_client_wrappers.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';
import 'package:in_app_purchase_platform_interface/in_app_purchase_platform_interface.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/billing.dart';
import 'package:kivilo/screens/billing_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/play_billing.dart';

GooglePlayPurchaseDetails purchase(
  String token, {
  String product = 'kivilo_pro',
  bool pending = false,
}) => GooglePlayPurchaseDetails.fromPurchase(
  PurchaseWrapper(
    orderId: 'order',
    packageName: 'one.kivilo.kivilo',
    purchaseTime: 1,
    purchaseToken: token,
    signature: 'signature',
    products: [product],
    isAutoRenewing: true,
    originalJson: '{}',
    isAcknowledged: false,
    purchaseState: pending
        ? PurchaseStateWrapper.pending
        : PurchaseStateWrapper.purchased,
  ),
).single;

GooglePlayProductDetails product(
  String id, {
  String? offerId,
  String basePlan = 'monthly',
  String price = 'SGD 39.00',
}) => GooglePlayProductDetails.fromProductDetails(
  ProductDetailsWrapper(
    productId: id,
    title: 'Kivilo Pro',
    name: 'Kivilo Pro',
    description: 'Property inspections',
    productType: ProductType.subs,
    subscriptionOfferDetails: [
      SubscriptionOfferDetailsWrapper(
        basePlanId: basePlan,
        offerId: offerId,
        offerTags: const [],
        offerIdToken: '$id:$basePlan:$offerId',
        pricingPhases: [
          PricingPhaseWrapper(
            billingCycleCount: 0,
            billingPeriod: 'P1M',
            formattedPrice: price,
            priceAmountMicros: 39000000,
            priceCurrencyCode: 'SGD',
            recurrenceMode: RecurrenceMode.infiniteRecurring,
          ),
        ],
      ),
    ],
  ),
).single;

const solo = PlayPlanProduct(
  productId: 'kivilo_pro',
  basePlanId: 'monthly',
  seats: 1,
);
const team = PlayPlanProduct(
  productId: 'kivilo_pro_team_2',
  basePlanId: 'monthly',
  seats: 2,
);

class BillingApi extends Api {
  BillingApi() : super(attachAuth: false);
  String? owner = 'alice';
  final verified = <(String, String)>[];
  final contexts = <(String, String, String)>[];
  final statusCalls = <String>[];
  PlayPurchaseContext context = const PlayPurchaseContext(
    obfuscatedAccountId: 'opaque',
  );
  Future<PlayVerification> Function()? verify;
  Completer<PlayPurchaseContext>? pendingContext;
  bool teamCanManage = true;
  bool pro = false;
  String? currentProductId;

  @override
  String? get currentOwnerId => owner;

  @override
  Future<PlayPurchaseContext> playPurchaseContext({
    required String agencyId,
    required String productId,
    required String expectedOwnerId,
  }) async {
    contexts.add((agencyId, productId, expectedOwnerId));
    return pendingContext?.future ?? context;
  }

  @override
  Future<PlayVerification> verifyPlayPurchase({
    required String purchaseToken,
    required String expectedOwnerId,
  }) async {
    verified.add((purchaseToken, expectedOwnerId));
    return verify == null
        ? const PlayVerification(acknowledged: true, pending: false)
        : await verify!();
  }

  @override
  Future<String?> workspacePreference() async => 'personal';

  @override
  Future<AgencyIndex> agencies() async => const AgencyIndex(
    agencies: [
      AgencySummary(
        id: 'agency',
        name: 'Harbour Team',
        role: 'OWNER',
        memberCount: 2,
      ),
    ],
    invitations: [],
  );

  @override
  Future<PlayBillingStatus> playBillingStatus(String agencyId) async {
    statusCalls.add(agencyId);
    final agency = agencyId == 'agency';
    return PlayBillingStatus(
      products: [agency ? team : solo],
      canPurchase: !agency || teamCanManage,
      canManageBilling: !agency || teamCanManage,
      seats: agency ? 2 : 1,
      seatsNeeded: agency ? 2 : 1,
      activeProperties: 3,
      limit: pro ? 25 : 5,
      pro: pro,
      provider: currentProductId == null ? null : 'google_play',
      currentProductId: currentProductId,
      managedByName: teamCanManage ? null : 'Alex Owner',
    );
  }
}

class PlayStore extends InAppPurchasePlatform {
  final updates = StreamController<List<PurchaseDetails>>.broadcast();
  final bought = <GooglePlayPurchaseParam>[];
  final details = <ProductDetails>[];
  bool available = true;
  bool launch = true;
  int acknowledgements = 0;

  @override
  Stream<List<PurchaseDetails>> get purchaseStream => updates.stream;
  @override
  Future<bool> isAvailable() async => available;
  @override
  Future<ProductDetailsResponse> queryProductDetails(
    Set<String> identifiers,
  ) async => ProductDetailsResponse(
    productDetails: details
        .where((product) => identifiers.contains(product.id))
        .toList(),
    notFoundIDs: [],
  );
  @override
  Future<bool> buyNonConsumable({required PurchaseParam purchaseParam}) async {
    bought.add(purchaseParam as GooglePlayPurchaseParam);
    return launch;
  }

  @override
  Future<void> completePurchase(PurchaseDetails purchase) async {
    acknowledgements++;
  }
}

void main() {
  late BillingApi api;
  late PlayStore store;
  late PlayBilling billing;
  late List<GooglePlayPurchaseDetails> owned;
  var changes = 0;

  setUp(() {
    api = BillingApi();
    store = PlayStore();
    owned = [];
    changes = 0;
    billing = PlayBilling(
      api: api,
      store: store,
      ownedPurchases: () async => owned,
    );
    billing.planChanges.listen((_) => changes++);
  });
  tearDown(() async {
    billing.dispose();
    await store.updates.close();
  });

  test(
    'only regular monthly base plans are shown, ordered by seat catalog',
    () async {
      store.details.addAll([
        product(team.productId),
        product(solo.productId, offerId: 'trial'),
        product(solo.productId, basePlan: 'yearly'),
        product(solo.productId),
      ]);
      final available = await billing.products([solo, team]);
      expect(available.map((product) => product.id), [
        solo.productId,
        team.productId,
      ]);
    },
  );

  test(
    'the server receives the token and payer before a plan refresh; client never acknowledges',
    () async {
      owned = [purchase('proof')];
      final verified = Completer<PlayVerification>();
      api.verify = () => verified.future;
      final restored = billing.restore();
      await Future<void>.delayed(Duration.zero);
      expect(api.verified, [('proof', 'alice')]);
      expect(changes, 0);
      expect(store.acknowledgements, 0);
      verified.complete(
        const PlayVerification(acknowledged: true, pending: false),
      );
      await restored;
      await Future<void>.delayed(Duration.zero);
      expect(changes, 1);
      expect(store.acknowledgements, 0);
    },
  );

  testWidgets(
    'pending payment is recorded at the server without granting and retries later',
    (tester) async {
      billing.dispose();
      billing = PlayBilling(
        api: api,
        store: store,
        ownedPurchases: () async => owned,
      );
      billing.planChanges.listen((_) => changes++);
      owned = [purchase('pending', pending: true)];
      api.verify = () async =>
          const PlayVerification(acknowledged: false, pending: true);
      await billing.restore();
      expect(api.verified.length, 1);
      expect(changes, 0);
      expect(billing.message, contains('Payment is pending'));
      expect(store.acknowledgements, 0);
      owned = [purchase('pending')];
      api.verify = () async =>
          const PlayVerification(acknowledged: true, pending: false);
      await tester.pump(const Duration(seconds: 30));
      await tester.pump();
      expect(api.verified.length, 2);
      expect(changes, 1);
    },
  );

  test(
    'a failed verification keeps the purchase recoverable without acknowledgement',
    () async {
      owned = [purchase('proof')];
      api.verify = () async =>
          throw const ApiFailure('Purchase belongs to another account.', 404);
      await billing.restore();
      expect(billing.errorMessage, contains('another account'));
      expect(changes, 0);
      expect(store.acknowledgements, 0);
      api.verify = null;
      await billing.restore();
      await Future<void>.delayed(Duration.zero);
      expect(api.verified.length, 2);
      expect(changes, 1);
    },
  );

  test(
    'signed-out purchases wait for sign-in and re-query Google Play',
    () async {
      api.owner = null;
      owned = [purchase('proof')];
      await billing.resume();
      expect(api.verified, isEmpty);
      api.owner = 'bob';
      await billing.resume();
      expect(api.verified, [('proof', 'bob')]);
    },
  );

  test(
    'switching accounts during verification cannot update the new account UI',
    () async {
      owned = [purchase('proof')];
      final verified = Completer<PlayVerification>();
      api.verify = () => verified.future;
      final restore = billing.restore();
      await Future<void>.delayed(Duration.zero);
      api.owner = 'bob';
      verified.complete(
        const PlayVerification(acknowledged: true, pending: false),
      );
      await restore;
      expect(changes, 0);
    },
  );

  test(
    'team purchase passes a server-issued binding and selected offer to Play',
    () async {
      final selected = product(team.productId);
      await billing.purchase(agencyId: 'agency', product: selected);
      expect(api.contexts, [('agency', team.productId, 'alice')]);
      expect(store.bought.single.applicationUserName, 'opaque');
      expect(store.bought.single.offerToken, selected.offerToken);
      expect(store.bought.single.changeSubscriptionParam, isNull);
    },
  );

  test(
    'seat changes must replace the exact server-owned token with time proration',
    () async {
      owned = [purchase('current', product: 'kivilo_pro_team_1')];
      api.context = PlayPurchaseContext(
        obfuscatedAccountId: 'team-binding',
        replacementTokenHash: sha256.convert(utf8.encode('current')).toString(),
        replacementMode: 'withTimeProration',
      );
      await billing.purchase(
        agencyId: 'agency',
        product: product(team.productId),
      );
      final change = store.bought.single.changeSubscriptionParam!;
      expect(
        change.oldPurchaseDetails.verificationData.serverVerificationData,
        'current',
      );
      expect(change.replacementMode, ReplacementMode.withTimeProration);
    },
  );

  test(
    'missing replacement token refuses purchase instead of creating a duplicate subscription',
    () async {
      api.context = const PlayPurchaseContext(
        obfuscatedAccountId: 'team',
        replacementTokenHash: 'missing',
        replacementMode: 'withTimeProration',
      );
      await billing.purchase(
        agencyId: 'agency',
        product: product(team.productId),
      );
      expect(store.bought, isEmpty);
      expect(billing.errorMessage, contains('Google Play account that bought'));
    },
  );

  test(
    'same SKU owned elsewhere cannot be bought or transferred to another team',
    () async {
      owned = [purchase('another-team', product: team.productId)];
      await billing.purchase(
        agencyId: 'agency',
        product: product(team.productId),
      );
      expect(store.bought, isEmpty);
      expect(billing.errorMessage, contains('cannot be moved'));
    },
  );

  test('account change while preparing cannot launch Google Play', () async {
    api.pendingContext = Completer<PlayPurchaseContext>();
    final buying = billing.purchase(
      agencyId: 'personal',
      product: product(solo.productId),
    );
    api.owner = 'bob';
    api.pendingContext!.complete(api.context);
    await buying;
    expect(store.bought, isEmpty);
    expect(billing.errorMessage, contains('Account changed'));
  });

  test(
    'native errors cannot expose purchase tokens in user-facing messages',
    () async {
      owned = [purchase('proof')];
      api.verify = () async =>
          throw StateError('private purchase-token-secret');
      await billing.restore();
      expect(billing.errorMessage, isNot(contains('purchase-token-secret')));
      expect(billing.errorMessage, contains('Restore purchases'));
    },
  );

  testWidgets(
    'billing screen offers personal and team seats at Google Play prices',
    (tester) async {
      store.details.addAll([
        product(solo.productId, price: 'THB 999.00'),
        product(team.productId, price: 'THB 1,998.00'),
      ]);
      await tester.pumpWidget(
        MaterialApp(
          home: BillingScreen(api: api, billing: billing),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('1 seat · THB 999.00/month'), findsOneWidget);
      await tester.tap(find.text('Personal'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Harbour Team').last);
      await tester.pumpAndSettle();
      expect(api.statusCalls.last, 'agency');
      expect(find.text('2 seats · THB 1,998.00/month'), findsOneWidget);
      expect(find.textContaining('50 active properties'), findsOneWidget);
      await tester.ensureVisible(find.text('Subscribe with Google Play'));
      await tester.tap(find.text('Subscribe with Google Play'));
      await tester.pump();
      expect(api.contexts.single.$1, 'agency');
    },
  );

  testWidgets('an ordinary team member sees the payer and cannot buy', (
    tester,
  ) async {
    api.teamCanManage = false;
    store.details.add(product(solo.productId));
    await tester.pumpWidget(
      MaterialApp(
        home: BillingScreen(api: api, billing: billing),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Personal'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Harbour Team').last);
    await tester.pumpAndSettle();
    expect(find.text('Alex Owner manages this subscription.'), findsOneWidget);
    expect(find.text('Subscribe with Google Play'), findsNothing);
  });

  testWidgets('an expired subscription can buy its same product again', (
    tester,
  ) async {
    api.currentProductId = solo.productId;
    store.details.add(product(solo.productId));
    await tester.pumpWidget(
      MaterialApp(
        home: BillingScreen(api: api, billing: billing),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Change plan in Google Play'),
      200,
    );
    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Change plan in Google Play'),
    );
    expect(button.onPressed, isNotNull);
  });

  for (final size in [const Size(320, 568), const Size(390, 844)]) {
    testWidgets(
      'team price, renewal terms and purchase fit $size with large text',
      (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        store.details.addAll([
          product(solo.productId),
          product(team.productId, price: 'SGD 78.00'),
        ]);
        await tester.pumpWidget(
          MaterialApp(
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: const TextScaler.linear(1.5)),
              child: child!,
            ),
            home: BillingScreen(api: api, billing: billing),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text('Personal'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Harbour Team').last);
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.textContaining('Renews automatically'),
          150,
        );
        expect(find.textContaining('SGD 78.00 each month'), findsOneWidget);
        await tester.scrollUntilVisible(
          find.text('Subscribe with Google Play'),
          150,
        );
        expect(tester.takeException(), isNull);
        await tester.tap(find.text('Subscribe with Google Play'));
        await tester.pump();
        expect(api.contexts.single.$1, 'agency');
      },
    );
  }
}
