import 'dart:async';
import 'dart:io';

import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/capture_screen.dart';
import 'package:kivilo/screens/room_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_components.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

const _item = InventoryItem(
  id: 'sofa',
  name: 'Sofa',
  category: 'FURNITURE',
  condition: 'GOOD',
  quantity: 1,
  evidenceCaptureIds: ['existing-photo'],
);

class _RoomApi extends Api {
  _RoomApi({this.captures = const [], this.empty = false})
    : super(attachAuth: false, cache: ReadCache());

  final List<EvidenceCapture> captures;
  final bool empty;
  String status = 'REVIEW';
  final reviewed = <({String roomId, bool nothingToRecord})>[];
  String? addedId;
  final updates = <String, Map<String, dynamic>>{};
  final deleted = <String>[];

  @override
  Future<RoomDetail> room(String inspectionId, String roomId) async =>
      RoomDetail(
        id: roomId,
        name: 'Dining room',
        status: status,
        items: [
          if (addedId != null)
            InventoryItem(
              id: addedId!,
              name: updates[addedId]?['name'] as String? ?? 'New item',
              category: 'FIXTURE',
              condition: 'GOOD',
              quantity: 1,
            ),
          if (!empty) _item,
        ],
        captures: captures,
      );

  @override
  Future<String> addItem(String inspectionId, String roomId) async =>
      addedId = 'new-lamp';

  @override
  Future<void> updateItem(
    String inspectionId,
    String itemId,
    Map<String, dynamic> data,
  ) async => updates[itemId] = data;

  @override
  Future<void> deleteItem(String inspectionId, String itemId) async =>
      deleted.add(itemId);

  @override
  Future<void> markRoomReviewed(
    String inspectionId,
    String roomId, {
    bool nothingToRecord = false,
  }) async {
    reviewed.add((roomId: roomId, nothingToRecord: nothingToRecord));
    status = 'REVIEWED';
  }
}

/// The destination has separate capture/queue widget coverage. Record navigation
/// here without opening the device's camera queue or needing a signed-in session.
class _ItemNavigation extends NavigatorObserver {
  CaptureScreen? destination;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (previousRoute == null || route is! MaterialPageRoute) return;
    final screen = route.builder(navigator!.context);
    if (screen is! CaptureScreen) return;
    destination = screen;
    scheduleMicrotask(() => navigator!.removeRoute(route));
  }
}

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
  testWidgets('empty room review still requires explicit confirmation', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(393, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final api = _RoomApi(empty: true);
    final queue = CaptureQueue(NativeDatabase.memory());
    final root = Directory.systemTemp.createTempSync('kivilo-empty-room-');
    addTearDown(() async {
      await queue.close();
      root.deleteSync(recursive: true);
    });
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: RoomScreen(
          inspectionId: 'inspection',
          roomId: 'room',
          editable: true,
          api: api,
          queue: queue,
          ownerId: 'owner-a',
          supportDirectory: () async => root,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('I reviewed this room'), findsNothing);
    await tester.tap(find.text('Nothing to record'));
    await tester.pumpAndSettle();
    expect(api.reviewed, isEmpty);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(api.reviewed, isEmpty);

    await tester.tap(find.text('Nothing to record'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirm'));
    await _waitForLocalWork(tester, () => api.reviewed.isNotEmpty);
    await tester.pumpAndSettle();
    expect(api.reviewed, [(roomId: 'room', nothingToRecord: true)]);
    expect(find.text('Nothing to record'), findsNothing);
  });

  testWidgets('room starts with inventory and opens the selected item', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(393, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final navigation = _ItemNavigation();
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        navigatorObservers: [navigation],
        home: RoomScreen(
          inspectionId: 'inspection',
          roomId: 'room',
          editable: true,
          api: _RoomApi(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Open camera & media'), findsNothing);
    expect(
      tester.getTopLeft(find.text('Inventory')).dy,
      lessThan(tester.getTopLeft(find.text('Room media & walkthrough')).dy),
    );
    await tester.tap(find.text('Sofa'));
    await tester.pumpAndSettle();
    expect(navigation.destination?.itemId, 'sofa');
    expect(navigation.destination?.itemName, 'Sofa');
    expect(navigation.destination?.onEditItem, isNotNull);
  });

  testWidgets('adding an item saves its details then opens its exact id', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(393, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final navigation = _ItemNavigation();
    final api = _RoomApi();
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        navigatorObservers: [navigation],
        home: RoomScreen(
          inspectionId: 'inspection',
          roomId: 'room',
          editable: true,
          api: api,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Add'));
    await tester.pumpAndSettle();
    expect(find.byType(ItemEditor), findsOneWidget);
    expect(navigation.destination, isNull);
    await tester.enterText(find.widgetWithText(TextField, 'Name'), 'Lamp');
    await tester.ensureVisible(find.text('Save changes'));
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();

    expect(api.updates['new-lamp']?['name'], 'Lamp');
    expect(navigation.destination?.itemId, 'new-lamp');
  });

  testWidgets('item save keeps its draft on failure and preserves new media', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(393, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    var save = Completer<void>();
    final saved = <Map<String, dynamic>>[];
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => showKiviloDrawer<void>(
                context: context,
                builder: (_) => ItemEditor(
                  item: _item,
                  captures: const [],
                  onSave: (data) {
                    saved.add(data);
                    return save.future;
                  },
                ),
              ),
              child: const Text('Edit details'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Edit details'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, 'Name'), 'Blue sofa');
    await tester.ensureVisible(find.text('Save changes'));
    await tester.tap(find.text('Save changes'));
    await tester.pump();
    expect(find.byType(ItemEditor), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(find.widgetWithText(FilledButton, 'Saving…'))
          .onPressed,
      isNull,
    );
    expect(saved.single['name'], 'Blue sofa');
    expect(saved.single.containsKey('evidenceCaptureIds'), isFalse);

    save.completeError(const ApiFailure('Connection lost. Try again.', null));
    await tester.pumpAndSettle();
    expect(find.text('Connection lost. Try again.'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Blue sofa'), findsOneWidget);

    save = Completer<void>();
    await tester.tap(find.text('Save changes'));
    await tester.pump();
    save.complete();
    await tester.pumpAndSettle();
    expect(saved, hasLength(2));
    expect(find.byType(ItemEditor), findsNothing);
  });

  testWidgets('deleting an item waits for its queued photos', (tester) async {
    tester.view.physicalSize = const Size(393, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final api = _RoomApi();
    final queue = CaptureQueue(NativeDatabase.memory());
    final root = Directory.systemTemp.createTempSync('kivilo-item-delete-');
    addTearDown(() async {
      await queue.close();
      root.deleteSync(recursive: true);
    });
    final pending = await queue.enqueue(
      PendingCapturesCompanion.insert(
        ownerId: const Value('owner-a'),
        clientId: const Value('pending-photo'),
        itemId: const Value('sofa'),
        awaitingMarkup: const Value(true),
        inspectionId: 'inspection',
        roomId: 'room',
        kind: 'PHOTO',
        relativePath: 'photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 10,
        createdAt: DateTime.now(),
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: RoomScreen(
          inspectionId: 'inspection',
          roomId: 'room',
          editable: true,
          api: api,
          queue: queue,
          ownerId: 'owner-a',
          supportDirectory: () async => root,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Delete item'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete'));
    await _waitForLocalWork(
      tester,
      () => find.text('Still uploading').evaluate().isNotEmpty,
    );
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.text('Still uploading'), findsOneWidget);
    expect(api.deleted, isEmpty);
    expect(await queue.byId(pending), isNotNull);

    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
    await queue.take(pending);
    await tester.tap(find.byTooltip('Delete item'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete'));
    await _waitForLocalWork(tester, () => api.deleted.isNotEmpty);
    await tester.pumpAndSettle();
    expect(api.deleted, ['sofa']);
  });

  testWidgets(
    'pending uploads allow detail edits but hold legacy media links',
    (tester) async {
      tester.view.physicalSize = const Size(393, 1400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final navigation = _ItemNavigation();
      final api = _RoomApi(
        captures: const [
          EvidenceCapture(
            id: 'room-video',
            kind: 'VIDEO',
            url: 'https://example.invalid/video',
          ),
        ],
      );
      final queue = CaptureQueue(NativeDatabase.memory());
      final root = Directory.systemTemp.createTempSync('kivilo-item-link-');
      addTearDown(() async {
        await queue.close();
        root.deleteSync(recursive: true);
      });
      await queue.enqueue(
        PendingCapturesCompanion.insert(
          ownerId: const Value('owner-a'),
          clientId: const Value('pending-photo'),
          itemId: const Value('sofa'),
          inspectionId: 'inspection',
          roomId: 'room',
          kind: 'PHOTO',
          relativePath: 'photo.jpg',
          filename: 'photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 10,
          createdAt: DateTime.now(),
        ),
      );
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          navigatorObservers: [navigation],
          home: RoomScreen(
            inspectionId: 'inspection',
            roomId: 'room',
            editable: true,
            api: api,
            queue: queue,
            ownerId: 'owner-a',
            supportDirectory: () async => root,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sofa'));
      await tester.pumpAndSettle();
      final editing = navigation.destination!.onEditItem!(_item, api.captures);
      await _waitForLocalWork(
        tester,
        () => find.byType(ItemEditor).evaluate().isNotEmpty,
      );
      await tester.pumpAndSettle();
      expect(find.text('Link existing room media'), findsNothing);
      expect(
        find.text(
          'Finish uploading this room’s photos before linking existing media.',
        ),
        findsOneWidget,
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Name'),
        'Blue sofa',
      );
      await tester.ensureVisible(find.text('Save changes'));
      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();
      await editing;
      expect(api.updates['sofa']?['name'], 'Blue sofa');
      expect(api.updates['sofa']!.containsKey('evidenceCaptureIds'), isFalse);
      expect(await queue.forRoom('room', 'owner-a'), hasLength(1));
    },
  );
}
