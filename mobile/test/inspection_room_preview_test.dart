import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/inspection_screen.dart';
import 'package:kivilo/screens/photo_mark_screen.dart';
import 'package:kivilo/screens/room_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:kivilo/ui/marked_network_photo.dart';

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
            photos: 3,
            videos: 0,
            previews: [
              RoomPreview(
                url: 'https://example.invalid/kitchen-1.jpg',
                annotations: {
                  'w': 1200,
                  'h': 800,
                  'marks': [
                    {'shape': 'ring', 'cx': .5, 'cy': .5, 'rx': .1, 'ry': .15},
                  ],
                },
              ),
              RoomPreview(url: 'https://example.invalid/kitchen-2.jpg'),
              RoomPreview(url: 'https://example.invalid/kitchen-3.jpg'),
            ],
          ),
          RoomSummary(
            id: 'unreviewed-room',
            name: 'Bathroom',
            status: 'REVIEW',
            items: 1,
            photos: 1,
            videos: 0,
            previews: [
              RoomPreview(url: 'https://example.invalid/bathroom.jpg'),
            ],
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

class _RoomNavigation extends NavigatorObserver {
  RoomScreen? destination;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (previousRoute == null || route is! MaterialPageRoute) return;
    final screen = route.builder(navigator!.context);
    if (screen is! RoomScreen) return;
    destination = screen;
    scheduleMicrotask(() => navigator!.removeRoute(route));
  }
}

void main() {
  testWidgets('next-room action opens the first room that still needs review', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(393, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final navigation = _RoomNavigation();
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        navigatorObservers: [navigation],
        home: InspectionScreen(id: 'inspection-1', api: _PreviewApi()),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Open room'));
    await tester.pumpAndSettle();

    expect(navigation.destination?.roomId, 'unreviewed-room');
    expect(navigation.destination?.inspectionId, 'inspection-1');
    expect(navigation.destination?.editable, isTrue);
  });

  testWidgets('reviewed and unreviewed room cards show photo strips', (
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
            widget is MarkedNetworkPhoto &&
            widget.semanticLabel?.startsWith('Kitchen preview ') == true,
      ),
      findsNWidgets(3),
    );
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is MarkedNetworkPhoto &&
            widget.semanticLabel == 'Bathroom preview 1',
      ),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CustomPaint && widget.painter is MarkPainter,
      ),
      findsOneWidget,
    );
  });
}
