import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/new_inspection_screen.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

void main() {
  for (final size in const [
    Size(393, 852),
    Size(520, 768),
    Size(768, 1024),
    Size(1024, 768),
    Size(1366, 1024),
  ]) {
    testWidgets('check-in form and footer fit $size', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = size;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: const NewInspectionScreen(),
        ),
      );

      final field = tester.getRect(find.byType(TextFormField).first);
      final button = tester.getRect(find.byType(FilledButton));
      expect(field.width, lessThanOrEqualTo(680));
      expect(field.left, greaterThanOrEqualTo(0));
      expect(field.right, lessThanOrEqualTo(size.width));
      expect(button.width, lessThanOrEqualTo(680));
      expect(button.center.dx, closeTo(size.width / 2, 1));
      expect(button.bottom, lessThanOrEqualTo(size.height));
      expect(field.bottom, lessThan(button.top));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('Split View resize retains entered tenancy details', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1024, 768);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: const NewInspectionScreen(),
      ),
    );
    await tester.enterText(
      find.byType(TextFormField).first,
      '42 Cairnhill Rise',
    );

    tester.view.physicalSize = const Size(520, 768);
    tester.view.viewInsets = const FakeViewPadding(bottom: 300);
    await tester.pumpAndSettle();

    expect(find.text('42 Cairnhill Rise'), findsOneWidget);
    final button = tester.getRect(find.byType(FilledButton));
    expect(button.bottom, lessThanOrEqualTo(468));
    expect(button.width, lessThanOrEqualTo(520));
    expect(tester.takeException(), isNull);
  });

  testWidgets('tablet check-in remains scrollable with larger text', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(768, 1024);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: const TextScaler.linear(1.5),
          ),
          child: child!,
        ),
        home: const NewInspectionScreen(),
      ),
    );

    await tester.drag(find.byType(ListView), const Offset(0, -1600));
    await tester.pumpAndSettle();
    expect(find.text('Tenancy'), findsOneWidget);
    expect(find.text('Create check-in'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
