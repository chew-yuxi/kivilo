import 'package:flutter/widgets.dart';

import '../screens/maintenance_case_screen.dart';
import '../screens/report_screen.dart';
import '../screens/inspections_screen.dart';
import 'api.dart';

/// The screen a notification's href opens, for the notifications list and a tapped push
/// alike, or null for one the app has no screen for. An update to a signed report opens
/// the report, where it is read and acknowledged; its href names only the update, so the
/// report is looked up first, through the same read scope as everything else.
Future<Widget?> notificationScreen(String? href, Api api) async {
  final path = href ?? '';
  if (path == '/inspections') return const InspectionsScreen();
  final maintenance = RegExp(r'^/maintenance/([^/]+)$').firstMatch(path);
  if (maintenance != null) {
    return MaintenanceCaseScreen(caseId: maintenance.group(1)!);
  }
  final update = RegExp(r'^/updates/([^/]+)$').firstMatch(path);
  if (update != null) {
    return ReportScreen(id: await api.addendumReport(update.group(1)!));
  }
  return null;
}
