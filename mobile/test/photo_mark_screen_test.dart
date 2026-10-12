import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/photo_mark_screen.dart';

class _DelayedImage extends ImageProvider<_DelayedImage> {
  final _frame = Completer<ImageInfo>();

  @override
  Future<_DelayedImage> obtainKey(ImageConfiguration configuration) async =>
      this;

  @override
  ImageStreamCompleter loadImage(
    _DelayedImage key,
    ImageDecoderCallback decode,
  ) => OneFrameImageStreamCompleter(_frame.future);

  void complete(ui.Image image) => _frame.complete(ImageInfo(image: image));
}

void main() {
  testWidgets(
    'Save waits for image dimensions and a no-op keeps original marks',
    (tester) async {
      final image = _DelayedImage();
      final original = <String, dynamic>{
        'w': 400,
        'h': 600,
        'marks': [
          {'shape': 'ring', 'cx': 0.5, 'cy': 0.5, 'rx': 0.1, 'ry': 0.1},
        ],
      };
      PhotoMarksResult? saved;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () async {
                  saved = await Navigator.push<PhotoMarksResult>(
                    context,
                    MaterialPageRoute(
                      builder: (_) =>
                          PhotoMarkScreen(image: image, annotations: original),
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('Save'), findsOneWidget);
      expect(
        tester
            .widget<TextButton>(find.widgetWithText(TextButton, 'Save'))
            .onPressed,
        isNull,
      );

      final recorder = ui.PictureRecorder();
      ui.Canvas(recorder);
      final photo = await recorder.endRecording().toImage(2, 3);
      image.complete(photo);
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextButton>(find.widgetWithText(TextButton, 'Save'))
            .onPressed,
        isNotNull,
      );

      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();
      expect(saved?.annotations, same(original));
    },
  );

  testWidgets(
    'freehand circle snaps to a mark, prompts for a note, and can be tapped to edit',
    (tester) async {
      final image = _DelayedImage();
      PhotoMarksResult? saved;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () async {
                  saved = await Navigator.push<PhotoMarksResult>(
                    context,
                    MaterialPageRoute(
                      builder: (_) => PhotoMarkScreen(image: image),
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pump();

      final recorder = ui.PictureRecorder();
      ui.Canvas(recorder);
      final photo = await recorder.endRecording().toImage(400, 400);
      image.complete(photo);
      await tester.pumpAndSettle();

      final canvas = find.byWidgetPredicate(
        (widget) => widget is GestureDetector && widget.onPanStart != null,
      );
      final rect = tester.getRect(canvas);
      final center = rect.center;
      final gesture = await tester.startGesture(center + const Offset(-70, 0));
      await gesture.moveTo(center + const Offset(-45, -55));
      await gesture.moveTo(center + const Offset(35, -60));
      await gesture.moveTo(center + const Offset(70, 0));
      await gesture.moveTo(center + const Offset(35, 60));
      await gesture.moveTo(center + const Offset(-45, 55));
      await gesture.moveTo(center + const Offset(-70, 0));
      await gesture.up();
      await tester.pumpAndSettle();

      expect(find.text('Add a note to mark 1'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'Crack above socket');
      await tester.tap(find.text('Save mark'));
      await tester.pumpAndSettle();
      expect(find.text('1. Crack above socket'), findsOneWidget);

      await tester.tapAt(center);
      await tester.pumpAndSettle();
      expect(find.text('Edit mark 1'), findsOneWidget);
      await tester.enterText(
        find.byType(TextField),
        'Hairline crack above socket',
      );
      await tester.tap(find.text('Save mark'));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(TextButton, 'Save'));
      await tester.pumpAndSettle();
      final mark = (saved!.annotations!['marks'] as List).single as Map;
      expect(mark['shape'], 'ring');
      expect(mark['note'], 'Hairline crack above socket');
    },
  );

  testWidgets('freehand stroke keeps its path and note', (tester) async {
    final image = _DelayedImage();
    PhotoMarksResult? saved;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () async {
                saved = await Navigator.push<PhotoMarksResult>(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PhotoMarkScreen(image: image),
                  ),
                );
              },
              child: const Text('Open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pump();

    final recorder = ui.PictureRecorder();
    ui.Canvas(recorder);
    image.complete(await recorder.endRecording().toImage(400, 400));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Freehand'));
    await tester.pumpAndSettle();
    final canvas = find.byWidgetPredicate(
      (widget) => widget is GestureDetector && widget.onPanStart != null,
    );
    final center = tester.getRect(canvas).center;
    final gesture = await tester.startGesture(center + const Offset(-60, -30));
    await gesture.moveTo(center + const Offset(-20, 20));
    await gesture.moveTo(center + const Offset(25, -15));
    await gesture.moveTo(center + const Offset(65, 30));
    await gesture.up();
    await tester.pumpAndSettle();

    expect(find.text('Add a note to mark 1'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Irregular scuff');
    await tester.tap(find.text('Save mark'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Save'));
    await tester.pumpAndSettle();

    final mark = (saved!.annotations!['marks'] as List).single as Map;
    expect(mark['shape'], 'freehand');
    expect(mark['note'], 'Irregular scuff');
    expect((mark['points'] as List).length, greaterThanOrEqualTo(3));
  });
}
