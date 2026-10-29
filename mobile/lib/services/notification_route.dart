import 'package:flutter/widgets.dart';

import '../screens/maintenance_case_screen.dart';
import '../screens/report_screen.dart';
import '../screens/properties_screen.dart';
import '../screens/property_screen.dart';
import '../screens/inspection_screen.dart';
import '../screens/renewal_screen.dart';
import '../screens/team_screen.dart';
import '../screens/tenancy_screen.dart';
import '../screens/supporting_documents_screen.dart';
import 'api.dart';

/// The screen a notification's href opens, for the notifications list, a tapped push
/// and a Home task alike, or null for one the app has no screen for. An update to a
/// signed report opens the report, where it is read and acknowledged; its href names
/// only the update, so the report is looked up first, through the same read scope as
/// everything else. Each screen authorizes its own read, so an href never grants access.
Future<Widget?> notificationScreen(String? href, Api api) async {
  final path = href ?? '';
  if (path == '/team') return TeamScreen(api: api);
  // Older notifications link to /inspections; the Properties tab replaced that list.
  if (path == '/inspections') return PropertiesScreen(api: api);
  final uri = Uri.tryParse(path);
  final documents = uri != null && !uri.hasScheme && !uri.hasAuthority
      ? RegExp(r'^/tenancies/([^/]+)/documents$').firstMatch(uri.path)
      : null;
  if (documents != null) {
    return SupportingDocumentsScreen(
      tenancyId: documents.group(1)!,
      initialRequestId: uri!.queryParameters['requestId'],
      api: api,
    );
  }
  final inspection = RegExp(r'^/inspections/([^/]+)$').firstMatch(path);
  if (inspection != null) {
    return InspectionScreen(id: inspection.group(1)!, api: api);
  }
  final maintenance = RegExp(r'^/maintenance/([^/]+)$').firstMatch(path);
  if (maintenance != null) {
    return MaintenanceCaseScreen(caseId: maintenance.group(1)!, api: api);
  }
  // The web signing page; in the app a party reads and signs on the report screen.
  final sign = RegExp(r'^/sign/([^/]+)$').firstMatch(path);
  if (sign != null) return ReportScreen(id: sign.group(1)!, api: api);
  final renewal = RegExp(r'^/renewals/([^/]+)$').firstMatch(path);
  if (renewal != null) {
    return RenewalScreen(tenancyId: renewal.group(1)!, api: api);
  }
  final property = RegExp(r'^/properties/([^/]+)$').firstMatch(path);
  if (property != null) {
    return PropertyScreen(propertyId: property.group(1)!, api: api);
  }
  final tenancy = RegExp(r'^/tenancies/([^/]+)$').firstMatch(path);
  if (tenancy != null) {
    final summary = (await api.tenancies())
        .where((row) => row.id == tenancy.group(1))
        .firstOrNull;
    if (summary == null) throw const ApiFailure('Tenancy not found', 404);
    return TenancyScreen(tenancy: summary, api: api);
  }
  final update = RegExp(r'^/updates/([^/]+)$').firstMatch(path);
  if (update != null) {
    return ReportScreen(
      id: await api.addendumReport(update.group(1)!),
      api: api,
    );
  }
  return null;
}
