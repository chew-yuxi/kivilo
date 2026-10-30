import 'package:flutter/foundation.dart';
import 'package:in_app_purchase_platform_interface/in_app_purchase_platform_interface.dart';

import '../models/billing.dart';

/// Both stores share the plan screen; each keeps its own purchase lifecycle.
abstract class StoreBilling extends ChangeNotifier {
  String get provider;
  String get storeName;
  bool get busy;
  String? get errorMessage;
  String? get message;
  Stream<void> get planChanges;
  Future<StoreBillingStatus> status(String workspace);
  Future<List<ProductDetails>> products(List<StorePlanProduct> catalog);
  Future<void> purchase({
    required String agencyId,
    required ProductDetails product,
  });
  Future<void> restore({bool quiet = false});
}
