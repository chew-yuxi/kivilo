class PlayPlanProduct {
  const PlayPlanProduct({
    required this.productId,
    required this.basePlanId,
    required this.seats,
  });

  final String productId;
  final String basePlanId;
  final int seats;

  factory PlayPlanProduct.fromJson(Map<String, dynamic> json) =>
      PlayPlanProduct(
        productId: json['productId'] as String,
        basePlanId: json['basePlanId'] as String,
        seats: json['seats'] as int,
      );
}

class PlayBillingStatus {
  const PlayBillingStatus({
    required this.products,
    required this.canPurchase,
    required this.canManageBilling,
    required this.seats,
    required this.seatsNeeded,
    required this.activeProperties,
    required this.limit,
    required this.pro,
    this.provider,
    this.currentProductId,
    this.subscriptionStatus,
    this.currentPeriodEnd,
    this.cancelAtPeriodEnd = false,
    this.managedByName,
  });

  final List<PlayPlanProduct> products;
  final bool canPurchase;
  final bool canManageBilling;
  final int seats;
  final int seatsNeeded;
  final int activeProperties;
  final int limit;
  final bool pro;
  final String? provider;
  final String? currentProductId;
  final String? subscriptionStatus;
  final DateTime? currentPeriodEnd;
  final bool cancelAtPeriodEnd;
  final String? managedByName;

  factory PlayBillingStatus.fromJson(Map<String, dynamic> json) =>
      PlayBillingStatus(
        products: (json['products'] as List<dynamic>)
            .map(
              (item) => PlayPlanProduct.fromJson(item as Map<String, dynamic>),
            )
            .toList(),
        canPurchase: json['canPurchase'] as bool,
        canManageBilling: json['canManageBilling'] as bool,
        seats: json['seats'] as int,
        seatsNeeded: json['seatsNeeded'] as int,
        activeProperties: json['activeProperties'] as int,
        limit: json['limit'] as int,
        pro: json['plan'] == 'PRO',
        provider: json['provider'] as String?,
        currentProductId: json['currentProductId'] as String?,
        subscriptionStatus: json['subscriptionStatus'] as String?,
        currentPeriodEnd: json['currentPeriodEnd'] == null
            ? null
            : DateTime.parse(json['currentPeriodEnd'] as String),
        cancelAtPeriodEnd: json['cancelAtPeriodEnd'] as bool,
        managedByName: json['managedByName'] as String?,
      );
}

class PlayPurchaseContext {
  const PlayPurchaseContext({
    required this.obfuscatedAccountId,
    this.replacementTokenHash,
    this.replacementMode,
  });

  final String obfuscatedAccountId;
  final String? replacementTokenHash;
  final String? replacementMode;

  factory PlayPurchaseContext.fromJson(Map<String, dynamic> json) =>
      PlayPurchaseContext(
        obfuscatedAccountId: json['obfuscatedAccountId'] as String,
        replacementTokenHash: json['replacementTokenHash'] as String?,
        replacementMode: json['replacementMode'] as String?,
      );
}

class PlayVerification {
  const PlayVerification({required this.acknowledged, required this.pending});
  final bool acknowledged;
  final bool pending;

  factory PlayVerification.fromJson(Map<String, dynamic> json) =>
      PlayVerification(
        acknowledged: json['acknowledged'] as bool,
        pending: json['purchasePending'] as bool,
      );
}
