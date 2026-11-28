import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/ui/kivilo_components.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

void main() {
  testWidgets(
    'the thumb follows the selected option and clears for an empty choice',
    (tester) async {
      int? value = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: Scaffold(
            body: Directionality(
              textDirection: TextDirection.rtl,
              child: MediaQuery(
                data: const MediaQueryData(disableAnimations: true),
                child: StatefulBuilder(
                  builder: (_, update) => KiviloSegmentedControl<int>(
                    value: value,
                    options: const [
                      KiviloSegmentOption(value: 0, label: 'First'),
                      KiviloSegmentOption(value: 1, label: 'Second'),
                    ],
                    allowEmptySelection: true,
                    onChanged: (next) => update(() => value = next),
                  ),
                ),
              ),
            ),
          ),
        ),
      );

      final control = find.byType(KiviloSegmentedControl<int>);
      final thumb = find.descendant(
        of: control,
        matching: find.byType(FractionallySizedBox),
      );
      final surface = find.descendant(
        of: thumb,
        matching: find.byType(DecoratedBox),
      );
      final slide = find.descendant(
        of: control,
        matching: find.byType(AnimatedAlign),
      );
      expect(tester.widget<AnimatedAlign>(slide).duration, Duration.zero);
      expect(
        tester.getCenter(surface).dx,
        closeTo(tester.getCenter(find.text('First')).dx, 1),
      );
      await tester.tap(find.text('Second'));
      await tester.pumpAndSettle();
      expect(value, 1);
      expect(
        tester.getCenter(surface).dx,
        closeTo(tester.getCenter(find.text('Second')).dx, 1),
      );
      await tester.tap(find.text('Second'));
      await tester.pumpAndSettle();
      expect(value, isNull);
      expect(thumb, findsNothing);
    },
  );
}
