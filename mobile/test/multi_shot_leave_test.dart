import 'dart:io';

import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/multi_shot_camera_screen.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

void main() {
  testWidgets('closing the camera sends every unmarked photo to the report', (
    tester,
  ) async {
    final queue = CaptureQueue(NativeDatabase.memory());
    final root = Directory.systemTemp.createTempSync('kivilo-leave-');
    addTearDown(() async {
      await queue.close();
      root.deleteSync(recursive: true);
    });
    final ids = await tester.runAsync(
      () => Future.wait([
        for (final name in ['first', 'second'])
          queue.enqueue(
            PendingCapturesCompanion.insert(
              ownerId: const Value('owner'),
              clientId: Value(name),
              itemId: const Value('walls'),
              awaitingMarkup: const Value(true),
              roomId: 'living',
              inspectionId: 'inspection',
              kind: 'PHOTO',
              relativePath: '$name.jpg',
              filename: '$name.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 1,
              createdAt: DateTime.now(),
            ),
          ),
      ]),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => MultiShotCameraScreen(
                    inspectionId: 'inspection',
                    roomId: 'living',
                    itemId: 'walls',
                    ownerId: 'owner',
                    root: root,
                    queue: queue,
                    title: 'Walls',
                  ),
                ),
              ),
              child: const Text('Open camera'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open camera'));
    for (var i = 0; i < 6; i++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 20)),
      );
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(find.bySemanticsLabel('Mark photo 1'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.close));
    for (var i = 0; i < 6; i++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 20)),
      );
      await tester.pump(const Duration(milliseconds: 100));
    }

    expect(find.byType(MultiShotCameraScreen), findsNothing);
    expect(find.text('Finish these photos?'), findsNothing);
    for (final id in ids!) {
      final row = await tester.runAsync(() => queue.byId(id));
      expect(row!.awaitingMarkup, isFalse);
    }
  });
}
