import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:in_app_purchase_platform_interface/in_app_purchase_platform_interface.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';
import 'package:in_app_purchase_storekit/store_kit_2_wrappers.dart';

import '../models/billing.dart';
import 'api.dart';
import 'store_billing.dart';

class AppleBilling extends StoreBilling {
  AppleBilling({
    required this.api,
    required this.store,
    required this.ownedPurchases,
  }) {
    _subscription = store.purchaseStream.listen(
      (purchases) {
        final owner = _syncOwner();
        if (owner != null) {
          _processing = _processing.then((_) => _process(purchases, owner));
        }
      },
      onError: (Object error) {
        _purchasing = false;
        errorMessage =
            'The App Store could not finish checking purchases. Try Restore purchases.';
        if (!_disposed) notifyListeners();
      },
    );
  }

  static AppleBilling? current;
  static bool get supported =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;
  static void install(Api api) {
    if (!supported || current != null) return;
    InAppPurchaseStoreKitPlatform.registerPlatform();
    current = AppleBilling(
      api: api,
      store: InAppPurchasePlatform.instance,
      ownedPurchases: () async {
        final latest = <String, SK2Transaction>{};
        for (final transaction in await SK2Transaction.transactions()) {
          final previous = latest[transaction.originalId];
          if (previous == null ||
              int.parse(transaction.purchaseDate) >
                  int.parse(previous.purchaseDate)) {
            latest[transaction.originalId] = transaction;
          }
        }
        final transactions = {
          for (final entry in latest.values) entry.id: entry,
        };
        for (final entry in await SK2Transaction.unfinishedTransactions()) {
          transactions[entry.id] = entry;
        }
        return transactions.values
            .map(
              (transaction) => SK2PurchaseDetails(
                productID: transaction.productId,
                purchaseID: transaction.id,
                verificationData: PurchaseVerificationData(
                  localVerificationData: '',
                  serverVerificationData: transaction.receiptData ?? '',
                  source: 'app_store',
                ),
                transactionDate: transaction.purchaseDate,
                status: PurchaseStatus.purchased,
                appAccountToken: transaction.appAccountToken,
                sk2Transaction: transaction,
              ),
            )
            .toList();
      },
    );
  }

  final Api api;
  final InAppPurchasePlatform store;
  final Future<List<PurchaseDetails>> Function() ownedPurchases;
  late final StreamSubscription<List<PurchaseDetails>> _subscription;
  final _changes = StreamController<void>.broadcast();
  final _unresolved = <String, PurchaseDetails>{};
  Future<void> _processing = Future.value();
  Future<void>? _restoring;
  String? _restoringOwner;
  String? _owner;
  Timer? _retry;
  bool _purchasing = false;
  bool _verifying = false;
  bool _disposed = false;
  bool _foreground = true;
  @override
  String? errorMessage;
  @override
  String? message;
  @override
  String get provider => 'apple';
  @override
  String get storeName => 'App Store';
  @override
  bool get busy => _purchasing || _verifying || _restoring != null;
  @override
  Stream<void> get planChanges => _changes.stream;
  @override
  Future<StoreBillingStatus> status(String workspace) =>
      api.appleBillingStatus(workspace);

  @override
  Future<List<ProductDetails>> products(List<StorePlanProduct> catalog) async {
    if (!await store.isAvailable()) {
      throw const ApiFailure(
        'The App Store is unavailable. Check your connection and Apple Account.',
        null,
      );
    }
    final response = await store.queryProductDetails(
      catalog.map((entry) => entry.productId).toSet(),
    );
    if (response.error != null) {
      throw const ApiFailure(
        'The App Store could not load prices. Try again.',
        null,
      );
    }
    return response.productDetails
        .where(
          (product) => catalog.any((entry) => entry.productId == product.id),
        )
        .toList()
      ..sort(
        (a, b) => catalog
            .indexWhere((entry) => entry.productId == a.id)
            .compareTo(catalog.indexWhere((entry) => entry.productId == b.id)),
      );
  }

  @override
  Future<void> purchase({
    required String agencyId,
    required ProductDetails product,
  }) async {
    if (busy) return;
    final owner = _syncOwner();
    if (owner == null) return;
    _purchasing = true;
    errorMessage = null;
    message = null;
    notifyListeners();
    try {
      final context = await api.applePurchaseContext(
        agencyId: agencyId,
        productId: product.id,
        expectedOwnerId: owner,
      );
      final token = context['appAccountToken'] as String;
      // Refuse another account/workspace's live subscription in the same group
      // before opening Apple's sheet. The server independently enforces ownership.
      final owned = await ownedPurchases();
      for (final purchase in owned.whereType<SK2PurchaseDetails>()) {
        final team = product.id.startsWith('kivilo_pro_team_');
        if (purchase.productID.startsWith('kivilo_pro_team_') != team) continue;
        final expiry = purchase.sk2Transaction?.expirationDate;
        if (expiry != null &&
            int.parse(expiry) > DateTime.now().millisecondsSinceEpoch &&
            purchase.appAccountToken?.toLowerCase() != token.toLowerCase()) {
          throw const ApiFailure(
            'This Apple Account already has a plan for another Kivilo account or workspace. Restore it in the account that bought it.',
            409,
          );
        }
      }
      if (api.currentOwnerId != owner || _disposed) return;
      final launched = await store.buyNonConsumable(
        purchaseParam: Sk2PurchaseParam(
          productDetails: product,
          applicationUserName: token,
        ),
      );
      if (!launched) {
        throw const ApiFailure(
          'The App Store did not open the purchase. Try again.',
          null,
        );
      }
    } catch (error) {
      if (api.currentOwnerId != owner || _disposed) return;
      _purchasing = false;
      errorMessage = _safeError(error);
      notifyListeners();
    }
  }

  String? _syncOwner() {
    final owner = api.currentOwnerId;
    if (_owner != owner) {
      _owner = owner;
      _purchasing = false;
      _retry?.cancel();
      _retry = null;
      _unresolved.clear();
      errorMessage = null;
      message = null;
    }
    return owner;
  }

  Future<void> resume() async {
    _foreground = true;
    if (_syncOwner() != null) await restore(quiet: true);
  }

  void suspend() {
    _foreground = false;
    _retry?.cancel();
    _retry = null;
  }

  @override
  Future<void> restore({bool quiet = false}) {
    final owner = _syncOwner();
    if (owner == null || _disposed) return Future.value();
    final pending = _restoring;
    if (pending != null) {
      if (_restoringOwner == owner) return pending;
      return pending.then((_) => restore(quiet: quiet));
    }
    late final Future<void> next;
    next = _restore(owner, quiet).whenComplete(() {
      if (identical(_restoring, next)) {
        _restoring = null;
        _restoringOwner = null;
      }
      if (!_disposed) notifyListeners();
    });
    _restoringOwner = owner;
    _restoring = next;
    notifyListeners();
    return next;
  }

  Future<void> _restore(String owner, bool quiet) async {
    try {
      // Only an explicit Restore tap asks for signed current entitlements.
      // Quiet resumption retries unfinished transactions without a login prompt.
      if (!quiet) await store.restorePurchases();
      final purchases = await ownedPurchases();
      if (api.currentOwnerId != owner || _disposed) return;
      final pending = {
        ..._unresolved,
        // Transaction.all supplies ownership metadata without a JWS in this
        // plugin. Restore emits signed current entitlements on purchaseStream;
        // unfinishedTransactions supplies signed purchases for offline retry.
        for (final purchase in purchases)
          if (purchase.purchaseID != null &&
              purchase.verificationData.serverVerificationData.isNotEmpty)
            purchase.purchaseID!: purchase,
      };
      _processing = _processing.then(
        (_) => _process(pending.values.toList(), owner),
      );
      await _processing;
      if (!quiet &&
          purchases.isEmpty &&
          api.currentOwnerId == owner &&
          !_disposed) {
        message = 'No purchases found for this Apple Account.';
      }
    } catch (error) {
      if (api.currentOwnerId != owner || _disposed) return;
      errorMessage = _safeError(error);
      _scheduleRetry();
    }
  }

  Future<void> _process(List<PurchaseDetails> purchases, String owner) async {
    for (final purchase in purchases) {
      if (api.currentOwnerId != owner || _disposed) return;
      _purchasing = false;
      if (purchase.status == PurchaseStatus.pending) {
        message =
            'Payment is pending with Apple. Your plan will update when it is approved.';
        notifyListeners();
        continue;
      }
      if (purchase.status == PurchaseStatus.canceled ||
          purchase.status == PurchaseStatus.error) {
        message = purchase.status == PurchaseStatus.canceled
            ? 'Purchase canceled. Your plan is unchanged.'
            : null;
        errorMessage = purchase.status == PurchaseStatus.error
            ? 'The App Store could not finish the purchase. Try Restore purchases.'
            : null;
        notifyListeners();
        continue;
      }
      if (purchase.status != PurchaseStatus.purchased &&
          purchase.status != PurchaseStatus.restored) {
        continue;
      }
      final id = purchase.purchaseID;
      if (id == null) continue;
      _verifying = true;
      notifyListeners();
      try {
        final verified = await api.verifyApplePurchase(
          signedTransaction: purchase.verificationData.serverVerificationData,
          expectedOwnerId: owner,
        );
        if (api.currentOwnerId != owner || _disposed) return;
        if (!verified) {
          throw const ApiFailure(
            'Your purchase is still being verified. Try again.',
            503,
          );
        }
        // Never finish before the backend has durably verified and assigned it.
        // Unfinished StoreKit transactions survive app termination and offline work.
        await store.completePurchase(purchase);
        if (api.currentOwnerId != owner || _disposed) return;
        _unresolved.remove(id);
        errorMessage = null;
        message = 'Your App Store purchases are up to date.';
        _changes.add(null);
      } catch (error) {
        if (api.currentOwnerId != owner || _disposed) return;
        errorMessage = _safeError(error);
        if (error is! ApiFailure ||
            error.statusCode == null ||
            error.statusCode! >= 500) {
          _unresolved[id] = purchase;
        } else {
          _unresolved.remove(id);
        }
      } finally {
        _verifying = false;
        if (!_disposed) notifyListeners();
      }
    }
    if (_unresolved.isNotEmpty) _scheduleRetry();
  }

  void _scheduleRetry() {
    if (_disposed || !_foreground || _retry != null) return;
    final owner = _owner;
    _retry = Timer(const Duration(seconds: 30), () {
      _retry = null;
      if (owner != null && api.currentOwnerId == owner) {
        unawaited(restore(quiet: true));
      }
    });
  }

  String _safeError(Object error) => error is ApiFailure
      ? error.message
      : 'Could not confirm your App Store purchase. Try Restore purchases when you have signal.';

  @override
  void dispose() {
    _disposed = true;
    _retry?.cancel();
    unawaited(_subscription.cancel());
    unawaited(_changes.close());
    super.dispose();
  }
}
