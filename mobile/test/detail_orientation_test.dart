import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/screens/inspection_screen.dart';
import 'package:kivilo/screens/room_screen.dart';
import 'package:kivilo/screens/tenancy_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:kivilo/ui/page_context_title.dart';

const _address = '#04-11, 12 Holland Avenue, Singapore 278991';

class _OrientationApi extends Api {
  _OrientationApi({this.status = 'DRAFT', this.roomStatus = 'REVIEW'})
    : super(attachAuth: false, cache: ReadCache());

  final String status;
  final String roomStatus;

  @override
  Future<InspectionDetail> inspection(String id) async => InspectionDetail(
    id: id,
    kind: 'CHECK_OUT',
    status: status,
    property: _address,
    landlord: 'Landlord',
    tenant: 'Tenant',
    landlordId: 'landlord-1',
    tenantId: 'tenant-1',
    summary: null,
    rooms: [
      RoomSummary(
        id: 'room-1',
        name: 'Kitchen',
        status: roomStatus,
        items: 1,
        photos: 0,
        videos: 0,
      ),
    ],
    signatures: const [],
    findings: const [],
    baselineId: null,
    checkOutId: null,
    shareToken: null,
    shareUrl: null,
    latestAssessment: null,
    assessmentDraftChanged: false,
    maintenanceHistory: const [],
    checkOutItems: const [],
    checkInItems: const [],
  );

  @override
  Future<RoomDetail> room(String inspectionId, String roomId) async =>
      RoomDetail(
        id: roomId,
        name: 'Kitchen',
        status: roomStatus,
        items: const [],
        captures: const [],
      );

  @override
  Future<List<MaintenanceCaseSummary>> maintenanceCases(
    String tenancyId,
  ) async => [];

  @override
  Future<List<PropertyAssetSummary>> propertyAssets(String propertyId) async =>
      [];

  @override
  Future<TenancyDetail> tenancy(String tenancyId) async => TenancyDetail(
    id: tenancyId,
    role: 'AGENT',
    agentMayAgreeCosts: false,
    canEditMinorRepairCap: false,
    canEditAgentAuthority: false,
  );
}

Future<void> _pump(WidgetTester tester, Widget screen) async {
  await tester.pumpWidget(MaterialApp(theme: buildKiviloTheme(), home: screen));
  await tester.pumpAndSettle();
}

void main() {
  for (final (status, roomStatus, expected) in [
    ('DRAFT', 'PENDING', 'Step 1 of 3: Rooms, current'),
    ('DRAFT', 'PROCESSING', 'Step 1 of 3: Rooms, current'),
    ('DRAFT', 'FAILED', 'Step 1 of 3: Rooms, current'),
    ('DRAFT', 'REVIEW', 'Step 2 of 3: Review, current'),
    ('DRAFT', 'REVIEWED', 'Step 2 of 3: Review, current'),
    ('AWAITING_SIGNATURE', 'REVIEWED', 'Step 3 of 3: Sign, current'),
    ('COMPLETED', 'REVIEWED', 'Step 3 of 3: Sign, complete'),
  ]) {
    testWidgets('$status / $roomStatus shows the actual handover stage', (
      tester,
    ) async {
      final semantics = tester.ensureSemantics();
      try {
        await _pump(
          tester,
          InspectionScreen(
            id: 'inspection-1',
            api: _OrientationApi(status: status, roomStatus: roomStatus),
          ),
        );
        expect(find.bySemanticsLabel(expected), findsOneWidget);
        if (status == 'DRAFT' && roomStatus == 'REVIEWED') {
          expect(find.text('Send for signature'), findsOneWidget);
          expect(
            find.bySemanticsLabel('Step 3 of 3: Sign, current'),
            findsNothing,
          );
        }
        expect(tester.takeException(), isNull);
      } finally {
        semantics.dispose();
      }
    });
  }

  testWidgets('continuing a room carries check-out and property context', (
    tester,
  ) async {
    await _pump(
      tester,
      InspectionScreen(id: 'inspection-1', api: _OrientationApi()),
    );
    expect(find.text('Next room: Kitchen'), findsOneWidget);
    await tester.ensureVisible(find.text('Open room'));
    await tester.tap(find.text('Open room'));
    await tester.pumpAndSettle();

    expect(find.byType(RoomScreen), findsOneWidget);
    var title = tester.widget<PageContextTitle>(find.byType(PageContextTitle));
    expect(title.title, 'Kitchen');
    expect(title.contextLabel, 'Check-out · $_address');
    await tester.drag(find.byType(ListView).last, const Offset(0, -450));
    await tester.pumpAndSettle();
    title = tester.widget<PageContextTitle>(find.byType(PageContextTitle));
    expect(title.contextLabel, 'Check-out · $_address');
    expect(tester.takeException(), isNull);
  });

  testWidgets('property latest sent report opens the agent report', (
    tester,
  ) async {
    await _pump(
      tester,
      TenancyScreen(
        tenancy: const TenancySummary(
          id: 'tenancy-1',
          role: 'AGENT',
          propertyId: 'property-1',
          property: _address,
          postalCode: '278991',
          landlord: 'Landlord',
          tenant: 'Tenant',
          maintenanceCases: 0,
          inspections: 1,
          latestReportId: 'inspection-1',
          latestReportKind: 'CHECK_OUT',
          latestReportStatus: 'AWAITING_SIGNATURE',
        ),
        api: _OrientationApi(
          status: 'AWAITING_SIGNATURE',
          roomStatus: 'REVIEWED',
        ),
      ),
    );
    expect(find.text('Property record'), findsOneWidget);
    expect(find.text('Property timeline'), findsOneWidget);
    await tester.tap(find.text('Latest check-out report'));
    await tester.pumpAndSettle();
    expect(find.byType(InspectionScreen), findsOneWidget);
    final title = tester.widget<PageContextTitle>(
      find.byType(PageContextTitle),
    );
    expect(title.title, 'Check-out');
    expect(title.contextLabel, _address);
  });

  for (final hasSignedCheckIn in [false, true]) {
    testWidgets(
      'property opens its draft check-out ${hasSignedCheckIn ? 'beside the signed check-in' : 'without a sent report'}',
      (tester) async {
        await _pump(
          tester,
          TenancyScreen(
            tenancy: TenancySummary(
              id: 'tenancy-1',
              role: 'AGENT',
              propertyId: 'property-1',
              property: _address,
              postalCode: '278991',
              landlord: 'Landlord',
              tenant: 'Tenant',
              maintenanceCases: 0,
              inspections: hasSignedCheckIn ? 2 : 1,
              latestReportId: hasSignedCheckIn ? 'check-in' : null,
              latestReportKind: hasSignedCheckIn ? 'CHECK_IN' : null,
              latestReportStatus: hasSignedCheckIn ? 'COMPLETED' : null,
            ),
            currentInspection: const InspectionSummary(
              id: 'draft-check-out',
              tenancyId: 'tenancy-1',
              kind: 'CHECK_OUT',
              status: 'DRAFT',
              property: _address,
              tenant: 'Tenant',
              rooms: 1,
            ),
            api: _OrientationApi(),
          ),
        );
        expect(find.text('Open check-out'), findsOneWidget);
        expect(
          find.text('Latest check-in report'),
          hasSignedCheckIn ? findsOneWidget : findsNothing,
        );
        await tester.tap(find.text('Open check-out'));
        await tester.pumpAndSettle();
        expect(
          tester.widget<InspectionScreen>(find.byType(InspectionScreen)).id,
          'draft-check-out',
        );
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final status in ['AWAITING_SIGNATURE', 'COMPLETED']) {
    testWidgets('property avoids duplicate links for a $status report', (
      tester,
    ) async {
      await _pump(
        tester,
        TenancyScreen(
          tenancy: TenancySummary(
            id: 'tenancy-1',
            role: 'AGENT',
            propertyId: 'property-1',
            property: _address,
            postalCode: '278991',
            landlord: 'Landlord',
            tenant: 'Tenant',
            maintenanceCases: 0,
            inspections: 1,
            latestReportId: 'check-out',
            latestReportKind: 'CHECK_OUT',
            latestReportStatus: status,
          ),
          currentInspection: InspectionSummary(
            id: 'check-out',
            tenancyId: 'tenancy-1',
            kind: 'CHECK_OUT',
            status: status,
            property: _address,
            tenant: 'Tenant',
            rooms: 1,
          ),
          api: _OrientationApi(),
        ),
      );
      expect(find.text('Latest check-out report'), findsOneWidget);
      expect(find.text('Open check-out'), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'page context and stage guide fit a small phone with larger text',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 844);
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: const TextScaler.linear(1.6)),
            child: child!,
          ),
          home: InspectionScreen(id: 'inspection-1', api: _OrientationApi()),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.byType(PageContextTitle), findsOneWidget);
    },
  );
}
