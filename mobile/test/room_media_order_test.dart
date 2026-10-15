import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/room_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:kivilo/screens/photo_mark_screen.dart';

class _FakeApi extends Api {
  _FakeApi() : super(attachAuth: false, cache: ReadCache());

  /// Oldest first, as the API sends them. Videos with no poster, so nothing loads.
  @override
  Future<RoomDetail> room(String inspectionId, String roomId) async =>
      const RoomDetail(
        id: 'room-1',
        name: 'Kitchen',
        status: 'REVIEWED',
        items: [],
        captures: [
          EvidenceCapture(id: 'c1', kind: 'VIDEO', url: 'https://x.test/1'),
          EvidenceCapture(id: 'c2', kind: 'VIDEO', url: 'https://x.test/2'),
          EvidenceCapture(id: 'c3', kind: 'VIDEO', url: 'https://x.test/3'),
        ],
      );
}

class _AttachedMediaApi extends Api {
  _AttachedMediaApi(this.status) : super(attachAuth: false, cache: ReadCache());

  final String status;

  @override
  Future<RoomDetail> room(String inspectionId, String roomId) async =>
      RoomDetail(
        id: 'room-1',
        name: 'Kitchen',
        status: status,
        items: const [
          InventoryItem(
            id: 'item-1',
            name: 'Walls',
            category: 'SURFACE',
            condition: 'GOOD',
            quantity: 1,
            evidenceCaptureIds: ['photo-1'],
          ),
        ],
        captures: const [
          EvidenceCapture(
            id: 'photo-1',
            kind: 'PHOTO',
            url: 'https://example.invalid/photo.jpg',
            annotations: {
              'w': 1200,
              'h': 800,
              'marks': [
                {'shape': 'ring', 'cx': .5, 'cy': .5, 'rx': .1, 'ry': .15},
              ],
            },
          ),
        ],
      );
}

void main() {
  testWidgets('media follows the inventory, newest first, and can be flipped', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1179, 4000);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: RoomScreen(
          inspectionId: 'inspection-1',
          roomId: 'room-1',
          editable: false,
          api: _FakeApi(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    double top(String text) => tester.getTopLeft(find.text(text)).dy;
    double left(String text) => tester.getTopLeft(find.text(text)).dx;

    expect(top('Inventory'), lessThan(top('Media')));
    expect(left('Video 3'), lessThan(left('Video 2')));
    expect(left('Video 2'), lessThan(left('Video 1')));

    await tester.tap(find.text('Newest first'));
    await tester.pumpAndSettle();

    // Numbers stay with their capture, so "Video 1" is still the first one added.
    expect(find.text('Oldest first'), findsOneWidget);
    expect(left('Video 1'), lessThan(left('Video 2')));
    expect(left('Video 2'), lessThan(left('Video 3')));
  });

  for (final scenario in [
    (status: 'REVIEW', editable: true, name: 'unreviewed'),
    (status: 'REVIEWED', editable: false, name: 'reviewed'),
  ]) {
    testWidgets('attached image previews show in ${scenario.name} inventory', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1179, 4000);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: RoomScreen(
            inspectionId: 'inspection-1',
            roomId: 'room-1',
            editable: scenario.editable,
            api: _AttachedMediaApi(scenario.status),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Attached media'), findsOneWidget);
      expect(find.text('Marked photo 1'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is Semantics &&
              widget.properties.label ==
                  'Open Marked photo 1 attached to Walls',
        ),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is CustomPaint && widget.painter is MarkPainter,
        ),
        findsNWidgets(2),
      );
    });
  }
}
