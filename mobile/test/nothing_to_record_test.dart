import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/room_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _FakeApi extends Api {
  _FakeApi(this.items) : super(attachAuth: false, cache: ReadCache());
  final List<InventoryItem> items;
  final reviewed = <bool>[];

  @override
  Future<RoomDetail> room(String inspectionId, String roomId) async =>
      RoomDetail(
        id: 'room-1',
        name: 'Store room',
        status: 'REVIEW',
        items: items,
        captures: const [],
      );

  @override
  Future<void> markRoomReviewed(
    String inspectionId,
    String roomId, {
    bool nothingToRecord = false,
  }) async => reviewed.add(nothingToRecord);
}

Future<void> _open(WidgetTester tester, _FakeApi api) async {
  tester.view.physicalSize = const Size(1179, 4000);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: RoomScreen(
        inspectionId: 'inspection-1',
        roomId: 'room-1',
        editable: true,
        api: api,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

const _explanation =
    'Add an item, or confirm there is nothing to record in this room.';

void main() {
  testWidgets('an empty room says why it cannot be reviewed yet', (
    tester,
  ) async {
    await _open(tester, _FakeApi([]));

    expect(find.text(_explanation), findsOneWidget);
    final review = tester.widget<ButtonStyleButton>(
      find.ancestor(
        of: find.text('I reviewed this room'),
        matching: find.bySubtype<ButtonStyleButton>(),
      ),
    );
    expect(review.onPressed, isNull);
    expect(find.text('Nothing to record'), findsOneWidget);
  });

  testWidgets('nothing to record is confirmed before the room is reviewed', (
    tester,
  ) async {
    final api = _FakeApi([]);
    await _open(tester, api);

    await tester.tap(find.text('Nothing to record'));
    await tester.pumpAndSettle();
    expect(find.byType(BottomSheet), findsOneWidget);
    expect(find.text('Nothing to record in Store room?'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(api.reviewed, isEmpty);

    await tester.tap(find.text('Nothing to record'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();
    expect(api.reviewed, [true]);
  });

  testWidgets('a room with items is reviewed as before', (tester) async {
    final api = _FakeApi(const [
      InventoryItem(
        id: 'item-1',
        name: 'Walls',
        category: 'SURFACE',
        condition: 'GOOD',
        quantity: 1,
      ),
    ]);
    await _open(tester, api);

    expect(find.text(_explanation), findsNothing);
    expect(find.text('Nothing to record'), findsNothing);
    await tester.tap(find.text('I reviewed this room'));
    await tester.pumpAndSettle();
    expect(api.reviewed, [false]);
  });
}
