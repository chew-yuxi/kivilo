import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:kivilo/ui/kivilo_view_tabs.dart';

void main() {
  for (final edgeTap in [false, true]) {
    for (final reduceMotion in [false, true]) {
      testWidgets(
        'tab stays round throughout the press (edge=$edgeTap, reduced motion=$reduceMotion)',
        (tester) async {
          final key = GlobalKey();
          await tester.pumpWidget(
            MaterialApp(
              theme: buildKiviloTheme(),
              home: Scaffold(
                body: MediaQuery(
                  data: MediaQueryData(disableAnimations: reduceMotion),
                  child: RepaintBoundary(
                    key: key,
                    child: Material(
                      color: Colors.white,
                      child: SizedBox(
                        width: 390,
                        child: KiviloViewTabs(
                          labels: const [
                            'All',
                            'In progress · 1',
                            'Awaiting signatures',
                          ],
                          selected: 1,
                          onChanged: (_) {},
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();
          final boundary =
              key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
          final tab = tester.getRect(
            find
                .ancestor(
                  of: find.text('In progress · 1'),
                  matching: find.byType(InkWell),
                )
                .first,
          );
          final point = edgeTap ? tab.topLeft + const Offset(2, 3) : tab.center;
          // Capture this tab and its neighbours. Any ink that escapes it counts too.
          Future<Uint32List> pixels() async => (await tester.runAsync(() async {
            final image = await boundary.toImage();
            final bytes = (await image.toByteData(
              format: ui.ImageByteFormat.rawRgba,
            ))!;
            image.dispose();
            return bytes.buffer.asUint32List(
              bytes.offsetInBytes,
              bytes.lengthInBytes ~/ 4,
            );
          }))!;

          final idle = await pixels();
          final width = boundary.size.width.toInt();
          final origin = boundary.localToGlobal(Offset.zero);
          final localTab = tab.shift(-origin);
          final finger = await tester.startGesture(point);
          await tester.pump();
          bool sawCircle = false;
          // A quick tap exercises the release animation. Hold in reduced-motion mode
          // to check the stationary feedback as well as its disappearance.
          final liftAt = reduceMotion ? 250 : 50;
          for (int ms = 25; ms <= liftAt + 300; ms += 25) {
            await tester.pump(const Duration(milliseconds: 25));
            if (ms == liftAt) await finger.up();
            await tester.pump();
            final frame = await pixels();
            int left = width,
                top = frame.length ~/ width,
                right = -1,
                bottom = -1;
            for (var i = 0; i < frame.length; i++) {
              if (frame[i] == idle[i]) continue;
              final x = i % width, y = i ~/ width;
              if (x < left) left = x;
              if (x > right) right = x;
              if (y < top) top = y;
              if (y > bottom) bottom = y;
            }
            if (right < 0) continue;
            final box = Rect.fromLTRB(
              left.toDouble(),
              top.toDouble(),
              right + 1,
              bottom + 1,
            );
            expect(box.intersect(localTab.inflate(1)), box);
            expect(
              box.width,
              lessThanOrEqualTo(46),
              reason: 'width at ${ms}ms',
            );
            expect(box.height, lessThanOrEqualTo(46));
            if (box.width < 20) continue;
            expect(
              box.height,
              closeTo(box.width, 3),
              reason: 'aspect at ${ms}ms',
            );
            sawCircle = true;
            for (final y in [top + 1, bottom - 1]) {
              for (final x in [left + 1, right - 1]) {
                expect(
                  frame[y * width + x],
                  idle[y * width + x],
                  reason: 'corner at ${ms}ms',
                );
              }
            }
            if (reduceMotion && ms < liftAt) expect(box.width, closeTo(44, 2));
          }
          expect(sawCircle, isTrue);
          await tester.pumpAndSettle();
          expect(await pixels(), idle);
        },
      );
    }
  }
}
