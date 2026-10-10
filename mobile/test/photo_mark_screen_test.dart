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
}
