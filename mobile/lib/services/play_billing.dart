import 'dart:async';
import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase_android/billing_client_wrappers.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';
import 'package:in_app_purchase_platform_interface/in_app_purchase_platform_interface.dart';

import '../models/billing.dart';
import 'api.dart';

/// The store supplies the price and purchase token. Only Kivilo's server verifies,
/// grants and acknowledges it. Play keeps unacknowledged purchases across restarts.
class PlayBilling extends ChangeNotifier {
  PlayBilling({
    required this.api,
    required this.store,
    required this.ownedPurchases,
  }) {
    _subscription = store.purchaseStream.listen(
      (purchases) {
        if (_disposed) return;
        final owner = _syncOwner();
        if (owner == null) return;
        _processing = _processing.then((_) => _process(purchases, owner));
      },
      onError: (Object error) {
        _purchasing = false;
        errorMessage =
            'Google Play could not finish checking purchases. Try Restore purchases.';
        notifyListeners();
      },
    );
  }

  static PlayBilling? current;
  static bool get supported =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  /// Installs the one listener before the app's first screen, including signed-out
  /// launches. Purchases wait until the verified Kivilo account is available.
  static void install(Api api) {
    if (!supported || current != null) return;
    InAppPurchaseAndroidPlatform.registerPlatform();
    final addition =
        InAppPurchasePlatformAddition.instance!
            as InAppPurchaseAndroidPlatformAddition;
    current = PlayBilling(
      api: api,
      store: InAppPurchasePlatform.instance,
      ownedPurchases: () async {
        final result = await addition.queryPastPurchases();
        if (result.error != null) {
          throw const ApiFailure(
            'Google Play could not check your existing purchases. Try again.',
            null,
          );
        }
        return result.pastPurchases;
      },
    );
  }

  final Api api;
  final InAppPurchasePlatform store;
  final Future<List<GooglePlayPurchaseDetails>> Function() ownedPurchases;
  late final StreamSubscription<List<PurchaseDetails>> _subscription;
  final _changes = StreamController<void>.broadcast();
  Stream<void> get planChanges => _changes.stream;
  Future<void> _processing = Future.value();
  Future<void>? _restoring;
  String? _restoringOwner;
  final _unresolvedTokens = <String>{};
  bool _queryNeedsRetry = false;
  Timer? _retry;
  bool _purchasing = false;
  bool _verifying = false;
  bool _disposed = false;
  bool _foreground = true;
  String? _owner;
  String? errorMessage;
  String? message;
  bool get busy => _purchasing || _verifying || _restoring != null;

  Future<List<GooglePlayProductDetails>> products(
    List<PlayPlanProduct> catalog,
  ) async {
    if (catalog.isEmpty) return [];
    if (!await store.isAvailable()) {
      throw const ApiFailure(
        'Google Play is unavailable. Check your connection and Play Store account.',
        null,
      );
    }
    final response = await store.queryProductDetails(
      catalog.map((p) => p.productId).toSet(),
    );
    if (response.error != null) {
      throw const ApiFailure(
        'Google Play could not load prices. Please try again.',
        null,
      );
    }
    // Only the regular monthly base plan is sold here. An introductory phase's
    // first price must never be presented as the recurring monthly price.
    return response.productDetails.whereType<GooglePlayProductDetails>().where((
      product,
    ) {
      final index = product.subscriptionIndex;
      final offers = product.productDetails.subscriptionOfferDetails;
      if (index == null || offers == null) return false;
      final offer = offers[index];
      return catalog.any(
            (entry) =>
                entry.productId == product.id &&
                entry.basePlanId == offer.basePlanId,
          ) &&
          offer.offerId == null &&
          offer.installmentPlanDetails == null &&
          offer.pricingPhases.length == 1 &&
          offer.pricingPhases.single.billingPeriod == 'P1M' &&
          offer.pricingPhases.single.recurrenceMode ==
              RecurrenceMode.infiniteRecurring &&
          offer.pricingPhases.single.priceAmountMicros > 0;
    }).toList()..sort(
      (a, b) => catalog
          .indexWhere((entry) => entry.productId == a.id)
          .compareTo(catalog.indexWhere((entry) => entry.productId == b.id)),
    );
  }

  Future<void> purchase({
    required String agencyId,
    required GooglePlayProductDetails product,
  }) async {
    if (busy) return;
    final owner = _syncOwner();
    if (owner == null) {
      errorMessage = 'Sign in to your Kivilo account before subscribing.';
      notifyListeners();
      return;
    }
    _purchasing = true;
    errorMessage = null;
    message = null;
    notifyListeners();
    try {
      final context = await api.playPurchaseContext(
        agencyId: agencyId,
        productId: product.id,
        expectedOwnerId: owner,
      );
      final owned = await ownedPurchases();
      GooglePlayPurchaseDetails? previous;
      if (context.replacementTokenHash != null) {
        previous = owned
            .where(
              (purchase) =>
                  sha256
                      .convert(
                        utf8.encode(
                          purchase.verificationData.serverVerificationData,
                        ),
                      )
                      .toString() ==
                  context.replacementTokenHash,
            )
            .firstOrNull;
        if (previous == null) {
          throw const ApiFailure(
            'Use the Google Play account that bought this subscription to change its seats. Your current plan is unchanged.',
            409,
          );
        }
        if (context.replacementMode != 'withTimeProration') {
          throw const ApiFailure(
            'This plan change is unavailable. Please refresh and try again.',
            409,
          );
        }
      }
      if (owned.any(
        (purchase) =>
            purchase.productID == product.id &&
            purchase.verificationData.serverVerificationData !=
                previous?.verificationData.serverVerificationData,
      )) {
        throw const ApiFailure(
          'This Google Play account already owns this plan. Restore purchases in the Kivilo account that bought it. A purchase cannot be moved to another team.',
          409,
        );
      }
      if (api.currentOwnerId != owner) {
        throw const ApiFailure('Account changed. Open this page again.', 401);
      }
      final launched = await store.buyNonConsumable(
        purchaseParam: GooglePlayPurchaseParam(
          productDetails: product,
          applicationUserName: context.obfuscatedAccountId,
          offerToken: product.offerToken,
          changeSubscriptionParam: previous == null
              ? null
              : ChangeSubscriptionParam(
                  oldPurchaseDetails: previous,
                  replacementMode: ReplacementMode.withTimeProration,
                ),
        ),
      );
      if (!launched) {
        throw const ApiFailure(
          'Google Play did not open the purchase. Please try again.',
          null,
        );
      }
    } catch (error) {
      _purchasing = false;
      errorMessage = _safeError(error);
      notifyListeners();
    }
  }

  /// Called on sign-in and every foreground return, including after Play's payment
  /// sheet or subscription settings. No cached entitlement is used to grant access.
  Future<void> resume() async {
    _foreground = true;
    if (_syncOwner() == null) return;
    await restore(quiet: true);
  }

  String? _syncOwner() {
    final owner = api.currentOwnerId;
    if (_owner != owner) {
      _owner = owner;
      _purchasing = false;
      errorMessage = null;
      message = null;
      _retry?.cancel();
      _retry = null;
      _unresolvedTokens.clear();
      _queryNeedsRetry = false;
      notifyListeners();
    }
    return owner;
  }

  void suspend() {
    _foreground = false;
    _retry?.cancel();
    _retry = null;
  }

  Future<void> restore({bool quiet = false}) {
    if (_disposed) return Future.value();
    final owner = _syncOwner();
    if (owner == null) return Future.value();
    final existing = _restoring;
    if (existing != null) {
      if (_restoringOwner == owner) return existing;
      // A new sign-in must get its own owned-purchase query after the previous
      // account's restore exits, rather than joining a result it cannot use.
      return existing.then((_) {
        if (!_disposed && api.currentOwnerId == owner) {
          return restore(quiet: quiet);
        }
      });
    }
    late final Future<void> next;
    next = _restore(quiet: quiet, owner: owner).whenComplete(() {
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

  Future<void> _restore({required bool quiet, required String owner}) async {
    if (api.currentOwnerId != owner || _disposed) return;
    if (!quiet) {
      errorMessage = null;
      message = 'Checking Google Play purchases…';
    }
    try {
      // queryPastPurchases preserves PENDING status; the generic restore method
      // labels every result RESTORED, including an unpaid pending purchase.
      final previouslyUnresolved = Set<String>.of(_unresolvedTokens);
      final purchases = await ownedPurchases();
      if (api.currentOwnerId != owner || _disposed) return;
      // Only a complete owned-purchase query can retire an absent token. A stream
      // update is partial and says nothing about other unresolved purchases.
      _queryNeedsRetry = false;
      final ownedTokens = purchases
          .map((purchase) => purchase.verificationData.serverVerificationData)
          .toSet();
      _unresolvedTokens.removeWhere(
        (token) =>
            previouslyUnresolved.contains(token) &&
            !ownedTokens.contains(token),
      );
      _processing = _processing.then((_) => _process(purchases, owner));
      await _processing;
      if (api.currentOwnerId != owner || _disposed) return;
      if (!quiet && purchases.isEmpty) {
        message = 'No purchases found for this Google Play account.';
      }
    } catch (error) {
      if (api.currentOwnerId != owner || _disposed) return;
      errorMessage = _safeError(error);
      _queryNeedsRetry = true;
      _scheduleRetry();
    }
  }

  Future<void> _process(List<PurchaseDetails> purchases, String owner) async {
    if (api.currentOwnerId != owner || _disposed) return;
    final seen = <String>{};
    for (final purchase in purchases) {
      if (api.currentOwnerId != owner || _disposed) return;
      if (purchase.status == PurchaseStatus.canceled) {
        _unresolvedTokens.remove(
          purchase.verificationData.serverVerificationData,
        );
        _purchasing = false;
        message = 'Purchase canceled. Your plan is unchanged.';
        notifyListeners();
        continue;
      }
      if (purchase.status == PurchaseStatus.error) {
        _purchasing = false;
        errorMessage =
            'Google Play could not finish the purchase. Try Restore purchases before buying again.';
        notifyListeners();
        continue;
      }
      final token = purchase.verificationData.serverVerificationData;
      if (token.isEmpty || !seen.add(token)) continue;
      if (purchase.status != PurchaseStatus.purchased &&
          purchase.status != PurchaseStatus.restored &&
          purchase.status != PurchaseStatus.pending) {
        continue;
      }
      _verifying = true;
      notifyListeners();
      try {
        final verified = await api.verifyPlayPurchase(
          purchaseToken: token,
          expectedOwnerId: owner,
        );
        if (api.currentOwnerId != owner || _disposed) return;
        if (verified.pending || !verified.acknowledged) {
          message = verified.pending
              ? 'Payment is pending in Google Play. Your plan will update after payment is confirmed.'
              : 'Your purchase is still being confirmed. We will check again automatically.';
          _unresolvedTokens.add(token);
        } else {
          // The server acknowledges only after committing the verified entitlement.
          // Android has no separate local completion; calling completePurchase here
          // would send a duplicate acknowledgement from this now-stale store result.
          errorMessage = null;
          message = 'Purchase restored. Your plan is up to date.';
          _unresolvedTokens.remove(token);
          _changes.add(null);
        }
      } catch (error) {
        if (api.currentOwnerId == owner && !_disposed) {
          errorMessage = _safeError(error);
          if (error is! ApiFailure ||
              error.statusCode == null ||
              error.statusCode! >= 500) {
            _unresolvedTokens.add(token);
          } else {
            _unresolvedTokens.remove(token);
          }
        }
      } finally {
        _purchasing = false;
        _verifying = false;
        if (!_disposed) notifyListeners();
      }
    }
    if (_unresolvedTokens.isNotEmpty || _queryNeedsRetry) {
      _scheduleRetry();
    } else {
      _retry?.cancel();
      _retry = null;
    }
  }

  void _scheduleRetry() {
    if (!_foreground || _retry != null || _disposed) return;
    final owner = _owner;
    _retry = Timer(const Duration(seconds: 30), () {
      _retry = null;
      if (owner != null && api.currentOwnerId == owner) {
        unawaited(restore(quiet: true));
      }
    });
  }

  // Native errors may carry purchase tokens. Never forward them to general error
  // reporting or print them; API failures already carry safe public wording.
  String _safeError(Object error) => error is ApiFailure
      ? error.message
      : 'Could not confirm your Google Play purchase. Try Restore purchases when you have signal.';

  @override
  void dispose() {
    _disposed = true;
    _retry?.cancel();
    unawaited(_subscription.cancel());
    unawaited(_changes.close());
    super.dispose();
  }
}
