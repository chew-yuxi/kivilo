import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/room_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _FakeApi extends Api {
  _FakeApi(this.items, {this.status = 'REVIEW'})
    : super(attachAuth: false, cache: ReadCache());
  final List<InventoryItem> items;
  String status;
  final reviewed = <bool>[];
  int finished = 0;

  @override
  Future<RoomDetail> room(String inspectionId, String roomId) async =>
      RoomDetail(
        id: 'room-1',
        name: 'Store room',
        status: status,
        items: items,
        captures: const [],
      );

  @override
  Future<void> finishRoom(String inspectionId, String roomId) async {
    finished++;
    status = 'REVIEW';
  }

  @override
  Future<void> markRoomReviewed(
    String inspectionId,
    String roomId, {
    bool nothingToRecord = false,
  }) async => reviewed.add(nothingToRecord);
}

Future<void> _open(
  WidgetTester tester,
  _FakeApi api, {
  CaptureQueue? queue,
  Map<String, dynamic>? pickerIntent,
}) async {
  tester.view.physicalSize = const Size(1179, 4000);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final captures = queue ?? CaptureQueue(NativeDatabase.memory());
  final root = Directory.systemTemp.createTempSync('kivilo-room-review-');
  if (pickerIntent != null) {
    File(
      '${root.path}/capture-picker.json',
    ).writeAsStringSync(jsonEncode(pickerIntent));
  }
  addTearDown(() async {
    await captures.close();
    root.deleteSync(recursive: true);
  });
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: RoomScreen(
        inspectionId: 'inspection-1',
        roomId: 'room-1',
        editable: true,
        api: api,
        queue: captures,
        ownerId: 'owner-a',
        supportDirectory: () async => root,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

const _explanation =
    'Add an item, or confirm there is nothing to record in this room.';

Future<void> _waitForLocalWork(
  WidgetTester tester,
  bool Function() ready,
) async {
  for (var attempt = 0; attempt < 100 && !ready(); attempt++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 20)),
    );
    await tester.pump();
  }
  expect(ready(), isTrue, reason: 'The local capture guard should finish.');
}

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
    await _waitForLocalWork(tester, () => api.reviewed.isNotEmpty);
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
    await _waitForLocalWork(tester, () => api.reviewed.isNotEmpty);
    await tester.pumpAndSettle();
    expect(api.reviewed, [false]);
  });

  for (final status in ['PENDING', 'CAPTURING']) {
    testWidgets('inventory can finish a $status room directly', (tester) async {
      final api = _FakeApi(const [
        InventoryItem(
          id: 'item-1',
          name: 'Walls',
          category: 'SURFACE',
          condition: 'GOOD',
          quantity: 1,
        ),
      ], status: status);
      await _open(tester, api);
      await tester.tap(find.text('I reviewed this room'));
      await _waitForLocalWork(tester, () => api.reviewed.isNotEmpty);
      await tester.pumpAndSettle();
      expect(api.finished, 1);
      expect(api.reviewed, [false]);
    });
  }

  testWidgets('room review waits for its own queued photo marks', (
    tester,
  ) async {
    final queue = CaptureQueue(NativeDatabase.memory());
    final pending = await queue.enqueue(
      PendingCapturesCompanion.insert(
        ownerId: const Value('owner-a'),
        clientId: const Value('pending-photo'),
        itemId: const Value('item-1'),
        awaitingMarkup: const Value(true),
        inspectionId: 'inspection-1',
        roomId: 'room-1',
        kind: 'PHOTO',
        relativePath: 'photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 10,
        createdAt: DateTime.now(),
      ),
    );
    final otherRoom = await queue.enqueue(
      PendingCapturesCompanion.insert(
        ownerId: const Value('owner-a'),
        clientId: const Value('other-photo'),
        inspectionId: 'inspection-1',
        roomId: 'room-2',
        kind: 'PHOTO',
        relativePath: 'other.jpg',
        filename: 'other.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 10,
        createdAt: DateTime.now(),
      ),
    );
    final api = _FakeApi(const [
      InventoryItem(
        id: 'item-1',
        name: 'Walls',
        category: 'SURFACE',
        condition: 'GOOD',
        quantity: 1,
      ),
    ], status: 'CAPTURING');
    await _open(tester, api, queue: queue);
    await tester.tap(find.text('I reviewed this room'));
    await _waitForLocalWork(
      tester,
      () => find.text('Still uploading').evaluate().isNotEmpty,
    );
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.text('Still uploading'), findsOneWidget);
    expect(api.finished, 0);
    expect(api.reviewed, isEmpty);
    expect(await queue.byId(pending), isNotNull);

    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
    await queue.take(pending);
    await tester.tap(find.text('I reviewed this room'));
    await _waitForLocalWork(tester, () => api.reviewed.isNotEmpty);
    await tester.pumpAndSettle();
    expect(api.finished, 1);
    expect(api.reviewed, [false]);
    expect(await queue.byId(otherRoom), isNotNull);
  });

  testWidgets('room review waits for an interrupted camera before queueing', (
    tester,
  ) async {
    final api = _FakeApi(const [
      InventoryItem(
        id: 'item-1',
        name: 'Walls',
        category: 'SURFACE',
        condition: 'GOOD',
        quantity: 1,
      ),
    ], status: 'CAPTURING');
    await _open(
      tester,
      api,
      pickerIntent: {
        'ownerId': 'owner-a',
        'inspectionId': 'inspection-1',
        'roomId': 'room-1',
        'itemId': 'item-1',
      },
    );
    await tester.tap(find.text('I reviewed this room'));
    await _waitForLocalWork(
      tester,
      () => find.text('Still uploading').evaluate().isNotEmpty,
    );
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.text('Still uploading'), findsOneWidget);
    expect(api.finished, 0);
    expect(api.reviewed, isEmpty);
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
  });
}
