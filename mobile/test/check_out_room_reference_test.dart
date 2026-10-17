import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/room_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

InventoryItem _item(
  String id,
  String name, {
  String condition = 'GOOD',
  String? identifier,
  String? baselineKey,
}) => InventoryItem(
  id: id,
  name: name,
  category: 'APPLIANCE',
  condition: condition,
  quantity: 1,
  identifier: identifier,
  baselineKey: baselineKey,
);

class _FakeApi extends Api {
  _FakeApi() : super(attachAuth: false, cache: ReadCache());

  @override
  Future<RoomDetail> room(String inspectionId, String roomId) async =>
      RoomDetail(
        id: 'room-1',
        name: 'Kitchen',
        status: 'REVIEW',
        items: [
          // A different fridge now: the serial is what changed.
          _item(
            'fridge',
            'Fridge',
            condition: 'FAIR',
            identifier: 'NEW-SERIAL',
            baselineKey: 'item:fridge-in',
          ),
          _item('hob', 'Hob', baselineKey: 'item:hob-in'),
          _item('toaster', 'Toaster'),
        ],
        captures: const [],
        checkIn: const CheckInReference(
          baselineId: 'check-in-1',
          conductedAt: '2024-01-02T03:00:00.000Z',
          lines: [
            CheckInLine(
              key: 'item:fridge-in',
              name: 'Fridge',
              condition: 'GOOD',
              quantity: 1,
              identifier: 'OLD-SERIAL',
            ),
            CheckInLine(
              key: 'item:hob-in',
              name: 'Hob',
              condition: 'GOOD',
              quantity: 2,
              notes: 'Light scratches',
            ),
          ],
          photos: [],
        ),
      );
}

void main() {
  testWidgets('a check-out room shows the check-in beside each copied row', (
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
          editable: true,
          api: _FakeApi(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('At check-in'), findsOneWidget);
    expect(find.text('At check-in: OLD-SERIAL · GOOD'), findsOneWidget);
    expect(
      find.text('At check-in: GOOD · ×2 · Light scratches'),
      findsOneWidget,
    );
    expect(find.textContaining('At check-in: '), findsNWidgets(2));

    // The reference itself is closed until asked for.
    expect(find.text('Hob ×2'), findsNothing);
    await tester.tap(find.text('Show'));
    await tester.pumpAndSettle();
    expect(find.text('Hob ×2'), findsOneWidget);
  });
}
