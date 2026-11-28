import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:kivilo/ui/kivilo_view_tabs.dart';

void main() {
  testWidgets('the pink half-pill meets the divider on its flat edge', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: KiviloViewTabs(
            labels: const ['All', 'In progress'],
            selected: 1,
            onChanged: (_) {},
          ),
        ),
      ),
    );

    final tabs = tester.widget<TabBar>(find.byType(TabBar));
    final painter = tabs.indicator!.createBoxPainter();
    addTearDown(painter.dispose);
    const size = Size(100, 48);
    final base = size.height - tabs.dividerHeight!;
    final mark = RRect.fromRectAndCorners(
      Rect.fromLTRB(39, base - 5, 61, base),
      topLeft: const Radius.circular(5),
      topRight: const Radius.circular(5),
    );

    expect(
      (Canvas canvas) => painter.paint(
        canvas,
        Offset.zero,
        const ImageConfiguration(size: size),
      ),
      paints..rrect(rrect: mark, color: KiviloColors.actionPink),
    );
  });
}
