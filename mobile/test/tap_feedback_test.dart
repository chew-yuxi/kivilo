import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/ui/kivilo_components.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:kivilo/ui/kivilo_view_tabs.dart';

void main() {
  for (final control in ['view tabs', 'segmented choices']) {
    testWidgets('$control show a ripple at the touch point', (tester) async {
      final key = GlobalKey();
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: Scaffold(
            body: RepaintBoundary(
              key: key,
              child: Material(
                color: Colors.white,
                child: SizedBox(
                  width: 360,
                  child: control == 'view tabs'
                      ? KiviloViewTabs(
                          labels: const ['Properties', 'In progress'],
                          selected: 0,
                          onChanged: (_) {},
                        )
                      : KiviloSegmentedControl<int>(
                          value: 0,
                          options: const [
                            KiviloSegmentOption(value: 0, label: 'Properties'),
                            KiviloSegmentOption(value: 1, label: 'In progress'),
                          ],
                          onChanged: (_) {},
                        ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final well = find
          .ancestor(of: find.text('Properties'), matching: find.byType(InkWell))
          .first;
      final rect = tester.getRect(well);
      final touch = rect.topLeft + const Offset(12, 8);
      final edge = Offset(rect.right - 12, touch.dy);
      final boundary =
          key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      Future<List<Color>> samples() async {
        return (await tester.runAsync(() async {
          final image = await boundary.toImage();
          final bytes = (await image.toByteData(
            format: ui.ImageByteFormat.rawRgba,
          ))!;
          final colours = <Color>[];
          for (final point in [touch, touch + const Offset(18, 0), edge]) {
            final local = boundary.globalToLocal(point);
            final index =
                4 * (image.width * local.dy.floor() + local.dx.floor());
            colours.add(
              Color.fromARGB(
                255,
                bytes.getUint8(index),
                bytes.getUint8(index + 1),
                bytes.getUint8(index + 2),
              ),
            );
          }
          image.dispose();
          return colours;
        }))!;
      }

      final idle = await samples();
      final finger = await tester.startGesture(touch);
      await tester.pump(const Duration(milliseconds: 110));
      await tester.pump(const Duration(milliseconds: 25));
      final pressed = await samples();
      expect(
        pressed.first.computeLuminance(),
        lessThan(idle.first.computeLuminance()),
      );
      expect((pressed.first.r - pressed.first.g).abs(), lessThan(0.025));
      expect(pressed.skip(1), idle.skip(1));
      await finger.up();
      await tester.pump();
      await tester.pump(
        Duration(milliseconds: control == 'view tabs' ? 95 : 35),
      );
      final spreading = await samples();
      expect(spreading[1], isNot(idle[1]));
      expect(spreading.last, idle.last);
      await tester.pumpAndSettle();
      expect(await samples(), idle);
    });
  }

  testWidgets('reduced motion gives a stationary pressed state', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: KiviloTapFeedback(
            child: Builder(
              builder: (context) {
                final theme = Theme.of(context);
                expect(theme.splashFactory, NoSplash.splashFactory);
                expect(
                  theme.highlightColor,
                  KiviloColors.ink.withValues(alpha: 0.14),
                );
                return const SizedBox();
              },
            ),
          ),
        ),
      ),
    );
  });
}
