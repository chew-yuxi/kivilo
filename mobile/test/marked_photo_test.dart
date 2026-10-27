import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/photo_mark_screen.dart';
import 'package:kivilo/ui/marked_network_photo.dart';

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

  Future<void> complete(int width, int height) async {
    final recorder = ui.PictureRecorder();
    ui.Canvas(recorder).drawColor(Colors.blue, ui.BlendMode.src);
    final picture = recorder.endRecording();
    final image = await picture.toImage(width, height);
    picture.dispose();
    _frame.complete(ImageInfo(image: image));
  }
}

Map<String, dynamic> _marks(int width, int height) => {
  'w': width,
  'h': height,
  'marks': [
    {'shape': 'ring', 'cx': 0.5, 'cy': 0.5, 'rx': 0.1, 'ry': 0.1},
  ],
};

Widget _photo(
  ImageProvider image, {
  String id = 'photo-1',
  Map<String, dynamic>? annotations,
}) => MaterialApp(
  home: Center(
    child: SizedBox(
      width: 240,
      height: 160,
      child: MarkedPhoto(
        key: ValueKey(id),
        image: image,
        annotations: annotations,
        fit: BoxFit.contain,
      ),
    ),
  ),
);

void main() {
  testWidgets(
    'the decoded local photo stays visible until its remote frame arrives',
    (tester) async {
      final local = _DelayedImage();
      final remote = _DelayedImage();
      await tester.pumpWidget(_photo(local));
      await local.complete(400, 200);
      await tester.pumpAndSettle();
      final imageState = tester.state(find.byType(Image));
      expect(tester.widget<RawImage>(find.byType(RawImage)).image!.width, 400);

      await tester.pumpWidget(_photo(remote));
      await tester.pump(const Duration(seconds: 1));
      expect(tester.state(find.byType(Image)), same(imageState));
      expect(tester.widget<RawImage>(find.byType(RawImage)).image!.width, 400);

      // Server annotations may arrive in the same refresh as the signed URL.
      // Adding or removing their overlay must not discard the displayed frame.
      await tester.pumpWidget(_photo(remote, annotations: _marks(800, 400)));
      expect(tester.state(find.byType(Image)), same(imageState));
      expect(tester.widget<RawImage>(find.byType(RawImage)).image!.width, 400);
      await tester.pumpWidget(_photo(remote));
      expect(tester.state(find.byType(Image)), same(imageState));
      expect(tester.widget<RawImage>(find.byType(RawImage)).image!.width, 400);

      await remote.complete(800, 400);
      await tester.pumpAndSettle();
      expect(tester.state(find.byType(Image)), same(imageState));
      expect(tester.widget<RawImage>(find.byType(RawImage)).image!.width, 800);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('a different photo cannot inherit the previous decoded frame', (
    tester,
  ) async {
    final first = _DelayedImage();
    final second = _DelayedImage();
    await tester.pumpWidget(_photo(first));
    await first.complete(400, 200);
    await tester.pumpAndSettle();
    final firstState = tester.state(find.byType(Image));

    await tester.pumpWidget(_photo(second, id: 'photo-2'));
    expect(tester.state(find.byType(Image)), isNot(same(firstState)));
    expect(tester.widget<RawImage>(find.byType(RawImage)).image, isNull);
    await second.complete(200, 400);
    await tester.pumpAndSettle();
    expect(tester.widget<RawImage>(find.byType(RawImage)).image!.width, 200);
    expect(tester.takeException(), isNull);
  });

  for (final size in [const Size(800, 400), const Size(400, 800)]) {
    testWidgets('marks share the contained photo box for $size', (
      tester,
    ) async {
      final image = _DelayedImage();
      await tester.pumpWidget(
        _photo(
          image,
          annotations: _marks(size.width.toInt(), size.height.toInt()),
        ),
      );
      await image.complete(size.width.toInt(), size.height.toInt());
      await tester.pumpAndSettle();
      final overlay = find.byWidgetPredicate(
        (widget) => widget is CustomPaint && widget.painter is MarkPainter,
      );
      final photoRect = tester.getRect(find.byType(RawImage));
      expect(tester.getRect(overlay), photoRect);
      expect(photoRect.width / photoRect.height, size.width / size.height);
      expect(photoRect.width, lessThanOrEqualTo(240));
      expect(photoRect.height, lessThanOrEqualTo(160));
      expect(photoRect.center, tester.getRect(find.byType(MarkedPhoto)).center);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('a marked photo has finite size in a scrolling column', (
    tester,
  ) async {
    final image = _DelayedImage();
    await tester.pumpWidget(
      MaterialApp(
        home: SingleChildScrollView(
          child: Center(
            child: SizedBox(
              width: 240,
              child: MarkedPhoto(image: image, annotations: _marks(400, 800)),
            ),
          ),
        ),
      ),
    );
    await image.complete(400, 800);
    await tester.pumpAndSettle();
    expect(tester.getSize(find.byType(RawImage)), const Size(240, 480));
    expect(tester.takeException(), isNull);
  });

  testWidgets('draws the small copy until the full photo has a frame', (
    tester,
  ) async {
    final original = _DelayedImage();
    final small = _DelayedImage();
    bool showing(ImageProvider image) => tester
        .widgetList<Image>(find.byType(Image))
        .any((widget) => widget.image == image);
    await tester.pumpWidget(
      MaterialApp(
        home: Center(
          child: SizedBox(
            width: 240,
            height: 160,
            child: MarkedPhoto(
              image: original,
              placeholder: small,
              annotations: _marks(4, 3),
              fit: BoxFit.contain,
            ),
          ),
        ),
      ),
    );
    await tester.runAsync(() => small.complete(4, 3));
    await tester.pump();
    expect(showing(small), isTrue);
    // Marks are drawn over the small copy in the same box.
    expect(find.byType(CustomPaint), findsWidgets);

    await tester.runAsync(() => original.complete(40, 30));
    await tester.pump();
    await tester.pump();
    expect(showing(small), isFalse);
    expect(showing(original), isTrue);
  });
}
