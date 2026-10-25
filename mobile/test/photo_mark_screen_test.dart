import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/photo_mark_screen.dart';
import 'package:kivilo/services/api_failure.dart';

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
  void fail(Object error) => _frame.completeError(error);
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
            .widget<FilledButton>(find.widgetWithText(FilledButton, 'Save'))
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
            .widget<FilledButton>(find.widgetWithText(FilledButton, 'Save'))
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
      final drafts = <Map<String, dynamic>?>[];
      final firstWrite = Completer<void>();
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
                      builder: (_) => PhotoMarkScreen(
                        image: image,
                        onChanged: (draft) async {
                          drafts.add(draft);
                          if (drafts.length == 1) await firstWrite.future;
                        },
                      ),
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
      expect(
        drafts,
        hasLength(1),
        reason: 'shape is durable before its note drawer closes',
      );
      final originalMark = (drafts.single!['marks'] as List).single as Map;
      expect(drafts.single!['w'], 400);
      expect(drafts.single!['h'], 400);
      expect(originalMark['shape'], 'ring');
      expect(originalMark.containsKey('note'), isFalse);
      await tester.enterText(find.byType(TextField), 'Crack above socket');
      await tester.tap(find.text('Save mark'));
      await tester.pumpAndSettle();
      expect(find.text('1. Crack above socket'), findsOneWidget);
      expect(drafts, hasLength(1), reason: 'note waits for the shape write');
      firstWrite.complete();
      await tester.pumpAndSettle();
      expect(
        (drafts.last!['marks'] as List).single['note'],
        'Crack above socket',
      );
      expect(
        originalMark.containsKey('note'),
        isFalse,
        reason: 'later note edits must not mutate an in-flight write',
      );

      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();
      expect(find.text('1. Crack above socket'), findsNothing);
      expect(drafts.last, isNull, reason: 'undo persists removal of the mark');
      await tester.tap(find.text('Redo'));
      await tester.pumpAndSettle();
      expect(find.text('1. Crack above socket'), findsOneWidget);
      expect(
        (drafts.last!['marks'] as List).single['note'],
        'Crack above socket',
      );

      await tester.tapAt(center);
      await tester.pumpAndSettle();

      expect(find.text('Edit mark 1'), findsOneWidget);
      await tester.enterText(
        find.byType(TextField),
        'Hairline crack above socket',
      );
      await tester.tap(find.text('Save mark'));
      await tester.pumpAndSettle();

      expect(
        (drafts.last!['marks'] as List).single['note'],
        'Hairline crack above socket',
      );

      await tester.tap(find.widgetWithText(FilledButton, 'Save'));
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
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();

    final mark = (saved!.annotations!['marks'] as List).single as Map;
    expect(mark['shape'], 'freehand');
    expect(mark['note'], 'Irregular scuff');
    expect((mark['points'] as List).length, greaterThanOrEqualTo(3));
  });

  testWidgets('Save waits for local persistence and retries a failed save', (
    tester,
  ) async {
    final image = _DelayedImage();
    final pendingWrite = Completer<void>();
    var writes = 0;
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
                    builder: (_) => PhotoMarkScreen(
                      image: image,
                      onChanged: (_) {
                        writes++;
                        return writes == 1
                            ? pendingWrite.future
                            : Future.value();
                      },
                    ),
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

    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();
    expect(find.text('Saving…'), findsOneWidget);
    expect(find.byType(PhotoMarkScreen), findsOneWidget);
    expect(saved, isNull);
    expect(writes, 1);

    pendingWrite.completeError(const ApiFailure('Storage is full', null));
    await tester.pumpAndSettle();
    expect(find.text('Could not save marks. Storage is full'), findsOneWidget);
    expect(find.byType(PhotoMarkScreen), findsOneWidget);
    expect(saved, isNull);

    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();
    expect(writes, 2);
    expect(find.byType(PhotoMarkScreen), findsNothing);
    expect(saved, isNotNull);
  });

  testWidgets('back saves the durable draft before closing', (tester) async {
    final image = _DelayedImage();
    final pendingWrite = Completer<void>();
    const original = <String, dynamic>{
      'w': 400,
      'h': 400,
      'marks': [
        {
          'shape': 'ring',
          'cx': 0.5,
          'cy': 0.5,
          'rx': 0.1,
          'ry': 0.1,
          'note': 'Chip',
        },
      ],
    };
    Map<String, dynamic>? persisted;
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
                    builder: (_) => PhotoMarkScreen(
                      image: image,
                      annotations: original,
                      onChanged: (draft) {
                        persisted = draft;
                        return pendingWrite.future;
                      },
                    ),
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

    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(persisted, original);
    expect(saved, isNull);
    expect(find.byType(PhotoMarkScreen), findsOneWidget);

    pendingWrite.complete();
    await tester.pumpAndSettle();
    expect(find.byType(PhotoMarkScreen), findsNothing);
    expect(saved?.annotations, original);
  });

  testWidgets('image failure permits back without completing the photo', (
    tester,
  ) async {
    final image = _DelayedImage();
    var writes = 0;
    var returned = false;
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
                    builder: (_) => PhotoMarkScreen(
                      image: image,
                      onChanged: (_) async {
                        writes++;
                      },
                    ),
                  ),
                );
                returned = true;
              },
              child: const Text('Open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pump();
    image.fail(const ApiFailure('Unreadable image', null));
    await tester.pumpAndSettle();
    expect(
      find.text('Could not open this photo. Unreadable image'),
      findsOneWidget,
    );
    expect(
      tester
          .widget<FilledButton>(find.widgetWithText(FilledButton, 'Save'))
          .onPressed,
      isNull,
    );

    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(returned, isTrue);
    expect(
      saved,
      isNull,
      reason: 'caller keeps awaitingMarkup until a real result is saved',
    );
    expect(writes, 0);
    expect(find.byType(PhotoMarkScreen), findsNothing);
  });

  testWidgets('a closing photo action waits for marks already being written', (
    tester,
  ) async {
    final image = _DelayedImage();
    final pendingWrite = Completer<void>();
    var actionRan = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.push<PhotoMarksResult>(
                context,
                MaterialPageRoute(
                  builder: (_) => PhotoMarkScreen(
                    image: image,
                    onChanged: (_) => pendingWrite.future,
                    actions: [
                      PhotoMarkAction(
                        icon: Icons.delete_outline,
                        label: 'Delete',
                        onPressed: () async {
                          actionRan = true;
                          return true;
                        },
                      ),
                    ],
                  ),
                ),
              ),
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

    final center = tester
        .getRect(
          find.byWidgetPredicate(
            (widget) => widget is GestureDetector && widget.onPanStart != null,
          ),
        )
        .center;
    final gesture = await tester.startGesture(center + const Offset(-60, 0));
    await gesture.moveTo(center + const Offset(0, -60));
    await gesture.moveTo(center + const Offset(60, 0));
    await gesture.moveTo(center + const Offset(0, 60));
    await gesture.up();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Save mark'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();
    expect(actionRan, isFalse);
    expect(find.byType(PhotoMarkScreen), findsOneWidget);

    pendingWrite.complete();
    await tester.pumpAndSettle();
    expect(actionRan, isTrue);
    expect(find.byType(PhotoMarkScreen), findsNothing);
  });
}
