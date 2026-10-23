import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/property_history.dart';
import 'package:kivilo/screens/property_history_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _HistoryApi extends Api {
  _HistoryApi() : super(attachAuth: false);
  final queries = <bool>[];
  final restored = <String>[];
  ApiFailure? restoreFailure;
  bool kitchenBack = false;

  @override
  Future<PropertyHistory> propertyHistory(
    String propertyId, {
    bool deletions = false,
  }) async {
    queries.add(deletions);
    final events = [
      if (kitchenBack)
        HistoryEvent(
          id: 'restored',
          at: DateTime.utc(2026, 10, 23, 6, 30),
          actorName: 'Jac',
          kind: 'ROOM_RESTORED',
          summary: 'restored kitchen (4 items, 12 photos and videos)',
        ),
      HistoryEvent(
        id: 'deleted',
        at: DateTime.utc(2026, 10, 23, 6, 14),
        actorName: 'Jac',
        kind: 'ROOM_DELETED',
        summary: 'deleted Kitchen (4 items, 12 photos and videos)',
        bin: BinEntry(
          id: 'bin-kitchen',
          expiresAt: DateTime.utc(2026, 11, 22),
          restorable: !kitchenBack,
          restoredAt: kitchenBack ? DateTime.utc(2026, 10, 23, 6, 30) : null,
        ),
      ),
      if (!deletions)
        HistoryEvent(
          id: 'edited',
          at: DateTime.utc(2026, 10, 22, 2),
          actorName: 'Nimin',
          kind: 'ITEM_EDITED',
          summary: 'edited Fridge in Kitchen',
          changes: const [
            HistoryChange(field: 'Condition', from: 'GOOD', to: 'POOR'),
          ],
        ),
    ];
    return PropertyHistory(address: '12 Green Road', events: events);
  }

  @override
  Future<void> restoreFromBin(String binItemId) async {
    if (restoreFailure != null) throw restoreFailure!;
    restored.add(binItemId);
    kitchenBack = true;
  }
}

Future<void> _open(WidgetTester tester, Api api) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 1200);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: PropertyHistoryScreen(propertyId: 'property', api: api),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('shows who changed and deleted what, with before and after', (
    tester,
  ) async {
    final api = _HistoryApi();
    await _open(tester, api);
    expect(find.text('12 Green Road'), findsOneWidget);
    expect(
      find.textContaining('deleted Kitchen (4 items, 12 photos and videos)'),
      findsOneWidget,
    );
    expect(find.textContaining('edited Fridge in Kitchen'), findsOneWidget);
    expect(find.text('Condition: GOOD → POOR'), findsOneWidget);
    expect(find.text('In the bin until 22 Nov 2026'), findsOneWidget);
    expect(find.text('Restore'), findsOneWidget);

    await tester.tap(find.text('Deletions'));
    await tester.pumpAndSettle();
    expect(api.queries, [false, true]);
    expect(find.textContaining('edited Fridge'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('restores from the bin and shows it came back', (tester) async {
    final api = _HistoryApi();
    await _open(tester, api);
    await tester.tap(find.text('Restore'));
    await tester.pumpAndSettle();
    expect(api.restored, ['bin-kitchen']);
    expect(find.text('Restore'), findsNothing);
    expect(find.text('Restored'), findsOneWidget);
    expect(find.textContaining('restored kitchen'), findsOneWidget);
  });

  testWidgets('a refused restore explains why and keeps the button', (
    tester,
  ) async {
    final api = _HistoryApi()
      ..restoreFailure = const ApiFailure(
        'Its room was deleted too. Restore the room first, then this.',
        409,
      );
    await _open(tester, api);
    await tester.tap(find.text('Restore'));
    await tester.pumpAndSettle();
    expect(
      find.text('Its room was deleted too. Restore the room first, then this.'),
      findsOneWidget,
    );
    expect(find.text('Restore'), findsOneWidget);
  });
}
