import 'dart:async';

import 'package:intl/date_symbol_data_local.dart';

/// The app loads date names in `AppLanguage.load` before its first frame; tests start
/// from the same place.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  await initializeDateFormatting();
  await testMain();
}
