import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/ui/kivilo_components.dart';

void main() {
  Widget bar(double value, {bool reduceMotion = false}) => MaterialApp(
    home: MediaQuery(
      data: MediaQueryData(disableAnimations: reduceMotion),
      child: Scaffold(
        body: KiviloProgressBar(value: value, color: Colors.pink),
      ),
    ),
  );

  double shown(WidgetTester tester) => tester
      .widget<LinearProgressIndicator>(find.byType(LinearProgressIndicator))
      .value!;

  testWidgets('glides to a new value instead of jumping', (tester) async {
    await tester.pumpWidget(bar(0.2));
    await tester.pumpWidget(bar(0.8));
    await tester.pump(const Duration(milliseconds: 100));
    expect(shown(tester), greaterThan(0.2));
    expect(shown(tester), lessThan(0.8));

    await tester.pumpAndSettle();
    expect(shown(tester), 0.8);
  });

  testWidgets('holds still when the phone asks for reduced motion', (
    tester,
  ) async {
    await tester.pumpWidget(bar(0.2, reduceMotion: true));
    await tester.pumpWidget(bar(0.8, reduceMotion: true));
    await tester.pump();
    expect(shown(tester), 0.8);
  });
}
