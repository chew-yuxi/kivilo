import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/new_inspection_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _Api extends Api {
  _Api() : super(attachAuth: false);
  final saved = <Map<String, dynamic>>[];
  @override
  Future<String> createInspection(Map<String, dynamic> body) async {
    saved.add(body);
    return 'inspection-1';
  }
}

class _MemoryCache extends ReadCache {
  final values = <String, Object?>{};
  @override
  Future<Object?> read(String key) async => values[key];
  @override
  Future<bool> write(String key, Object? value) async {
    values[key] = value;
    return true;
  }

  @override
  Future<void> remove(String key) async => values.remove(key);
}

Future<void> _open(WidgetTester tester, _Api api, _MemoryCache cache) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(400, 900);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: NewInspectionScreen(api: api, cache: cache),
    ),
  );
  await tester.pumpAndSettle();
}

/// Down by default; up for something the form has already scrolled past.
Future<void> _reveal(
  WidgetTester tester,
  Finder target, {
  bool up = false,
}) async {
  await tester.scrollUntilVisible(
    target,
    up ? -300 : 300,
    scrollable: find.byType(Scrollable).first,
  );
  // Fully on screen, not just its first pixel, so a tap lands on it.
  await tester.ensureVisible(target.first);
  await tester.pumpAndSettle();
}

Future<void> _fillRequired(WidgetTester tester) async {
  await tester.enterText(find.byType(TextFormField).at(0), '42 Sample Road');
  await tester.enterText(find.byType(TextFormField).at(2), '238888');
  await _reveal(tester, find.text('Unfurnished'));
  await tester.tap(find.text('Unfurnished'));
  await tester.pumpAndSettle();
  for (final label in ['Landlord name (required)', 'Tenant name (required)']) {
    final field = find.widgetWithText(TextFormField, label);
    await _reveal(tester, field);
    await tester.enterText(field, label.split(' ').first);
  }
}

void main() {
  testWidgets('sends the rooms chosen, in walking order', (tester) async {
    final api = _Api();
    await _open(tester, api, _MemoryCache());
    await _fillRequired(tester);

    await _reveal(tester, find.text('Bedrooms'), up: true);
    await tester.tap(find.text('3').first);
    await tester.tap(find.text('1').last);
    for (final name in ['Living room', 'Balcony']) {
      final box = find.widgetWithText(CheckboxListTile, name);
      await _reveal(tester, box);
      await tester.tap(box);
      await tester.pumpAndSettle();
    }
    await tester.enterText(
      find.widgetWithText(TextField, 'Another room (optional)'),
      'Study',
    );
    await tester.tap(find.text('Add'));
    await tester.pumpAndSettle();
    expect(find.text('7 rooms to set up'), findsOneWidget);

    await tester.tap(find.text('Create check-in'));
    await tester.pumpAndSettle();
    expect(api.saved.single['rooms'], [
      'Kitchen',
      'Bedroom 1',
      'Bedroom 2',
      'Bedroom 3',
      'Bathroom',
      'Balcony',
      'Study',
    ]);
    expect(api.saved.single['furnishingLevel'], 'UNFURNISHED');
    expect(api.saved.single['clientId'], isA<String>());
  });

  testWidgets('an interrupted setup comes back, with the same retry id', (
    tester,
  ) async {
    final cache = _MemoryCache();
    final first = _Api();
    await _open(tester, first, cache);
    await tester.enterText(find.byType(TextFormField).at(0), '42 Sample Road');
    await _reveal(tester, find.text('Bedrooms'));
    await tester.tap(find.text('4').first);
    await tester.pumpAndSettle();
    final clientId =
        (cache.values['new-check-in-draft'] as Map)['clientId'] as String;

    await tester.pumpWidget(const SizedBox());
    final second = _Api();
    await _open(tester, second, cache);
    expect(find.text('42 Sample Road'), findsOneWidget);
    await _fillRequired(tester);
    await tester.tap(find.text('Create check-in'));
    await tester.pumpAndSettle();
    expect(second.saved.single['clientId'], clientId);
    expect(
      (second.saved.single['rooms'] as List).where(
        (room) => (room as String).startsWith('Bedroom'),
      ),
      hasLength(4),
    );
    expect(cache.values, isEmpty);
  });
}
