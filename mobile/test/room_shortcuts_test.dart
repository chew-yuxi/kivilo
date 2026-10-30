import 'dart:io';

import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/room_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _Api extends Api {
  _Api(this.items) : super(attachAuth: false, cache: ReadCache());
  final List<InventoryItem> items;
  final duplicated = <String>[];
  final conditions = <(List<String>, String)>[];

  @override
  Future<RoomDetail> room(String inspectionId, String roomId) async =>
      RoomDetail(
        id: 'room-1',
        name: 'Kitchen',
        status: 'REVIEW',
        items: items,
        captures: const [],
      );

  @override
  Future<String> duplicateItem(String inspectionId, String itemId) async {
    duplicated.add(itemId);
    return 'copy';
  }

  @override
  Future<void> setItemsCondition(
    String inspectionId,
    String roomId,
    List<String> itemIds,
    String condition,
  ) async => conditions.add((itemIds, condition));
}

const _items = [
  InventoryItem(
    id: 'fridge',
    name: 'Fridge',
    category: 'APPLIANCE',
    condition: 'GOOD',
    quantity: 1,
  ),
  InventoryItem(
    id: 'cabinets',
    name: 'Cabinets',
    category: 'FIXTURE',
    condition: 'DAMAGED',
    quantity: 1,
  ),
  InventoryItem(
    id: 'sink',
    name: 'Sink and tap',
    category: 'FIXTURE',
    condition: 'GOOD',
    quantity: 1,
  ),
];

Future<_Api> _open(WidgetTester tester) async {
  tester.view.physicalSize = const Size(1179, 5000);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final queue = CaptureQueue(NativeDatabase.memory());
  final root = Directory.systemTemp.createTempSync('kivilo-room-shortcuts-');
  addTearDown(() async {
    await queue.close();
    root.deleteSync(recursive: true);
  });
  final api = _Api(_items);
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: RoomScreen(
        inspectionId: 'inspection-1',
        roomId: 'room-1',
        editable: true,
        api: api,
        queue: queue,
        ownerId: 'owner-a',
        supportDirectory: () async => root,
      ),
    ),
  );
  await tester.pumpAndSettle();
  return api;
}

void main() {
  testWidgets('duplicates one line', (tester) async {
    final api = await _open(tester);
    await tester.tap(find.text('Duplicate').first);
    await tester.pumpAndSettle();
    expect(api.duplicated, ['fridge']);
  });

  testWidgets('sets one condition on the selected lines after confirming', (
    tester,
  ) async {
    final api = await _open(tester);
    await tester.tap(find.text('Select'));
    await tester.pumpAndSettle();
    expect(find.text('Duplicate'), findsNothing);
    await tester.tap(find.text('Fridge'));
    await tester.tap(find.text('Sink and tap'));
    await tester.pumpAndSettle();
    expect(find.text('2 selected'), findsOneWidget);

    await tester.tap(find.text('Set condition'));
    await tester.pumpAndSettle();
    expect(find.text('Only the selected lines in Kitchen change.'), findsOneWidget);
    await tester.tap(find.text('Fair'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Set to Fair'));
    await tester.pumpAndSettle();
    expect(api.conditions, hasLength(1));
    expect(api.conditions.single.$1.toSet(), {'fridge', 'sink'});
    expect(api.conditions.single.$2, 'FAIR');
    expect(find.text('Select'), findsOneWidget);
  });

  testWidgets('names the specific details worth checking, without blocking', (
    tester,
  ) async {
    await _open(tester);
    expect(find.text('Worth checking before you review'), findsOneWidget);
    expect(find.text('· Fridge: no serial or model number'), findsOneWidget);
    expect(
      find.text('· Cabinets: marked Damaged with no description'),
      findsOneWidget,
    );
    expect(
      find.text('· Cabinets: marked Damaged with no photo linked'),
      findsOneWidget,
    );
    expect(find.text('· Sink and tap: no serial or model number'), findsNothing);
    final review = tester.widget<FilledButton>(
      find.ancestor(
        of: find.text('I reviewed this room'),
        matching: find.byWidgetPredicate((widget) => widget is FilledButton),
      ),
    );
    expect(review.onPressed, isNotNull);
  });
}
