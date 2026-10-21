import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/finding_editor_screen.dart';
import 'package:kivilo/screens/inspection_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _LostResponseApi extends Api {
  _LostResponseApi() : super(attachAuth: false, cache: ReadCache());
  final creates = <Map<String, dynamic>>[];
  final updates = <Map<String, dynamic>>[];
  Map<String, dynamic>? saved;

  @override
  Future<String> createFinding(
    String inspectionId,
    Map<String, dynamic> data,
  ) async {
    creates.add(Map.of(data));
    if (saved == null) {
      saved = Map.of(data);
      throw ApiFailure.noConnection;
    }
    expect(
      data,
      creates.first,
      reason: 'Retry must resolve the original request exactly',
    );
    return 'finding-1';
  }

  @override
  Future<void> updateFinding(
    String inspectionId,
    String findingId,
    Map<String, dynamic> data,
  ) async {
    expect(findingId, 'finding-1');
    updates.add(Map.of(data));
    saved!.addAll(data);
  }

  @override
  Future<InspectionDetail> inspection(String id) async =>
      InspectionDetail.fromJson({
        'id': id,
        'tenancyRecordId': 'tenancy-1',
        'kind': 'CHECK_OUT',
        'status': 'COMPLETED',
        'property': '2 Marina Boulevard',
        'landlord': 'Landlord',
        'landlordId': 'landlord',
        'tenant': 'Tenant',
        'tenantId': 'tenant',
        'summary': null,
        'baselineId': 'check-in',
        'checkOutId': null,
        'shareToken': null,
        'shareUrl': null,
        'checkOutItems': [
          {'id': 'worktop', 'label': 'Kitchen · Worktop'},
        ],
        'checkInItems': <Map<String, dynamic>>[],
        'latestAssessment': null,
        'assessmentDraftChanged': true,
        'signatures': <Map<String, dynamic>>[],
        'findings': [
          if (saved != null)
            {
              ...saved!,
              'id': 'finding-1',
              'itemLabel': 'Kitchen · Worktop',
              'baselineLabel': null,
              'editedByHuman': true,
              'maintenanceCaseId': null,
              'maintenanceCaseTitle': null,
            },
        ],
        'rooms': <Map<String, dynamic>>[],
        'maintenanceHistory': <Map<String, dynamic>>[],
      });
}

Future<void> _open(WidgetTester tester, _LostResponseApi api) async {
  tester.view.physicalSize = const Size(393, 1200);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: InspectionScreen(id: 'check-out', api: api),
    ),
  );
  await tester.pumpAndSettle();
  final add = find.widgetWithText(TextButton, 'Add');
  await tester.scrollUntilVisible(add, 250);
  await tester.ensureVisible(add);
  await tester.pumpAndSettle();
  await tester.tap(add);
  await tester.pumpAndSettle();
  await tester.tap(find.text('Kitchen · Worktop'));
  await tester.pumpAndSettle();
}

Future<void> _rationale(WidgetTester tester, String text) async {
  final field = find.widgetWithText(TextField, 'Rationale');
  await tester.ensureVisible(field);
  await tester.pumpAndSettle();
  await tester.enterText(field, text);
  await tester.pumpAndSettle();
}

Future<void> _save(WidgetTester tester) async {
  final button = find.widgetWithText(FilledButton, 'Add finding');
  await tester.ensureVisible(button);
  await tester.pumpAndSettle();
  await tester.tap(button);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'lost create response resolves the original request then saves revised text',
    (tester) async {
      final api = _LostResponseApi();
      await _open(tester, api);
      await _rationale(tester, 'A scratch on the edge.');
      await _save(tester);
      expect(find.byType(FindingEditorScreen), findsOneWidget);
      await _rationale(tester, 'A deep scratch along the front edge.');
      await _save(tester);
      expect(api.creates, hasLength(2));
      expect(api.creates.first['clientId'], isNotEmpty);
      expect(
        api.updates.single['rationale'],
        'A deep scratch along the front edge.',
      );
      expect(api.saved!['rationale'], 'A deep scratch along the front edge.');
      expect(find.byType(FindingEditorScreen), findsNothing);
    },
  );

  testWidgets(
    'cancel after a lost response refreshes the already-saved finding',
    (tester) async {
      final api = _LostResponseApi();
      await _open(tester, api);
      await _rationale(tester, 'A scratch on the edge.');
      await _save(tester);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(find.byType(FindingEditorScreen), findsNothing);
      final text = find.text('A scratch on the edge.');
      await tester.scrollUntilVisible(text, 200);
      expect(text, findsOneWidget);
      expect(api.creates, hasLength(1));
    },
  );
}
