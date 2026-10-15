import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/inspection_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _PreviewApi extends Api {
  _PreviewApi() : super(attachAuth: false, cache: ReadCache());

  @override
  Future<InspectionDetail> inspection(String id) async =>
      const InspectionDetail(
        id: 'inspection-1',
        kind: 'CHECK_IN',
        status: 'DRAFT',
        property: '42 Cairnhill Rise',
        landlord: 'Landlord',
        tenant: 'Tenant',
        landlordId: 'landlord-1',
        tenantId: 'tenant-1',
        summary: null,
        rooms: [
          RoomSummary(
            id: 'reviewed-room',
            name: 'Kitchen',
            status: 'REVIEWED',
            items: 3,
            photos: 1,
            videos: 0,
            previewUrl: 'https://example.invalid/kitchen.jpg',
          ),
          RoomSummary(
            id: 'unreviewed-room',
            name: 'Bathroom',
            status: 'REVIEW',
            items: 1,
            photos: 1,
            videos: 0,
            previewUrl: 'https://example.invalid/bathroom.jpg',
          ),
        ],
        signatures: [],
        findings: [],
        baselineId: null,
        checkOutId: null,
        shareToken: null,
        shareUrl: null,
        latestAssessment: null,
        assessmentDraftChanged: false,
        maintenanceHistory: [],
        checkOutItems: [],
        checkInItems: [],
      );
}

void main() {
  testWidgets('reviewed and unreviewed room cards show photo previews', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1179, 4000);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: InspectionScreen(id: 'inspection-1', api: _PreviewApi()),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Image && widget.semanticLabel == 'Kitchen preview',
      ),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Image && widget.semanticLabel == 'Bathroom preview',
      ),
      findsOneWidget,
    );
  });
}
