import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/ui/kivilo_components.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

void main() {
  testWidgets('select field presents readable choices in a bottom sheet', (
    tester,
  ) async {
    var value = 'PRIVATE_NON_LANDED';

    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => KiviloSelectField<String>(
              label: 'Property type',
              sheetTitle: 'Choose a property type',
              value: value,
              options: const [
                KiviloSelectOption(
                  value: 'PRIVATE_NON_LANDED',
                  label: 'Private, non-landed',
                  description: 'Condominium or private apartment',
                ),
                KiviloSelectOption(
                  value: 'HDB',
                  label: 'HDB',
                  description: 'Public housing flat',
                ),
              ],
              onChanged: (selected) => setState(() => value = selected),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Private, non-landed'), findsOneWidget);
    await tester.tap(find.text('Private, non-landed'));
    await tester.pumpAndSettle();

    expect(find.text('Choose a property type'), findsOneWidget);
    expect(find.text('Condominium or private apartment'), findsOneWidget);
    expect(find.text('Public housing flat'), findsOneWidget);

    await tester.tap(find.text('HDB'));
    await tester.pumpAndSettle();

    expect(find.text('Choose a property type'), findsNothing);
    expect(find.text('HDB'), findsOneWidget);
  });

  testWidgets('nullable select option is distinct from dismissing the sheet', (
    tester,
  ) async {
    String? value = 'case-1';

    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => KiviloSelectField<String?>(
              label: 'Maintenance evidence',
              value: value,
              options: const [
                KiviloSelectOption<String?>(
                  value: null,
                  label: 'No linked maintenance record',
                ),
                KiviloSelectOption<String?>(
                  value: 'case-1',
                  label: 'Leaking tap',
                ),
              ],
              onChanged: (selected) => setState(() => value = selected),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Leaking tap'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('No linked maintenance record'));
    await tester.pumpAndSettle();

    expect(find.text('No linked maintenance record'), findsOneWidget);
    expect(value, isNull);
  });
}
