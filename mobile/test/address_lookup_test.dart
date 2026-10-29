import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/property_work.dart';
import 'package:kivilo/screens/new_inspection_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _Api extends Api {
  _Api() : super(attachAuth: false);
  final answers = <String, Completer<List<AddressMatch>>>{};

  @override
  Future<List<AddressMatch>> searchAddresses(String query) =>
      (answers[query] ??= Completer()).future;
}

class _NoDraft extends ReadCache {
  @override
  Future<Object?> read(String key) async => null;
  @override
  Future<bool> write(String key, Object? value) async => true;
}

Future<_Api> _open(WidgetTester tester) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(400, 900);
  addTearDown(tester.view.reset);
  final api = _Api();
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: NewInspectionScreen(api: api, cache: _NoDraft()),
    ),
  );
  await tester.pumpAndSettle();
  return api;
}

final _search = find.widgetWithText(TextField, 'Find the address (optional)');

String _field(WidgetTester tester, String label) => tester
    .widget<TextFormField>(find.widgetWithText(TextFormField, label))
    .controller!
    .text;

void main() {
  testWidgets('a chosen address fills the street and postal code only', (
    tester,
  ) async {
    final api = await _open(tester);
    await tester.enterText(_search, '570231');
    await tester.pump(const Duration(milliseconds: 400));
    api.answers['570231']!.complete(const [
      AddressMatch(line1: '231 Bishan Street 23', postalCode: '570231'),
    ]);
    await tester.pumpAndSettle();
    await tester.tap(find.text('231 Bishan Street 23'));
    await tester.pumpAndSettle();
    expect(_field(tester, '231 Bishan Street 23'), '231 Bishan Street 23');
    expect(_field(tester, '570231'), '570231');
    expect(_field(tester, 'Unit (optional)'), '');
    expect(
      find.text('Address filled in. Add the unit below if there is one.'),
      findsOneWidget,
    );
  });

  testWidgets('a slow earlier answer never replaces a newer one', (
    tester,
  ) async {
    final api = await _open(tester);
    await tester.enterText(_search, 'marina');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.enterText(_search, 'marina one');
    await tester.pump(const Duration(milliseconds: 400));
    api.answers['marina one']!.complete(const [
      AddressMatch(
        line1: '23 Marina Way',
        postalCode: '018979',
        building: 'Marina One Residences',
      ),
    ]);
    await tester.pumpAndSettle();
    api.answers['marina']!.complete(const [
      AddressMatch(line1: '1 Old Answer Road', postalCode: '111111'),
    ]);
    await tester.pumpAndSettle();
    expect(find.text('23 Marina Way'), findsOneWidget);
    expect(find.text('1 Old Answer Road'), findsNothing);
  });

  testWidgets('a failed lookup leaves typing the address as it was', (
    tester,
  ) async {
    final api = await _open(tester);
    await tester.enterText(_search, '570231');
    await tester.pump(const Duration(milliseconds: 400));
    api.answers['570231']!.completeError(const ApiFailure('Offline', null));
    await tester.pumpAndSettle();
    expect(find.textContaining('Type it below.'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Address (required)'), findsOneWidget);
  });
}
