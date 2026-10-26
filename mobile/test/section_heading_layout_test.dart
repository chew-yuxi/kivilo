import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/ui/kivilo_components.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

void main() {
  for (final (width, scale) in [(320.0, 1.0), (390.0, 1.0), (390.0, 1.6)]) {
    testWidgets('heading and photo action remain separate at $width/$scale', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      var opened = false;
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(scale)),
            child: child!,
          ),
          home: Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(16),
              child: KiviloSectionHeading(
                title: 'Photos',
                subtitle: 'Before and after the repair',
                action: TextButton.icon(
                  onPressed: () => opened = true,
                  icon: const Icon(Icons.add_a_photo_outlined),
                  label: const Text('Add before photos'),
                ),
              ),
            ),
          ),
        ),
      );
      final title = tester.getRect(find.text('Photos'));
      final subtitle = tester.getRect(find.text('Before and after the repair'));
      final action = tester.getRect(find.byType(TextButton));
      expect(title.overlaps(action), isFalse);
      expect(subtitle.overlaps(action), isFalse);
      expect(action.left, greaterThanOrEqualTo(16));
      expect(action.right, lessThanOrEqualTo(width - 16));
      expect(tester.takeException(), isNull);
      await tester.tap(find.byType(TextButton));
      expect(opened, isTrue);
    });
  }
}
