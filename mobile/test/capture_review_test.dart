import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/capture_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _FakeApi extends Api {
  _FakeApi() : super(attachAuth: false, cache: ReadCache()) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.connectionError,
            ),
          );
        },
      ),
    );
  }

  final finished = <String>[];
  List<EvidenceCapture> captures = [];

  @override
  Future<RoomDetail> room(String inspectionId, String roomId) async =>
      RoomDetail(
        id: 'kitchen',
        name: 'Kitchen',
        status: 'CAPTURING',
        items: [],
        captures: captures,
      );

  @override
  Future<void> finishRoom(String inspectionId, String roomId) async {
    finished.add(roomId);
  }
}

void main() {
  late CaptureQueue queue;
  late Directory root;
  late _FakeApi api;

  setUp(() {
    queue = CaptureQueue(NativeDatabase.memory());
    root = Directory.systemTemp.createTempSync('kivilo-capture-review-');
    api = _FakeApi();
  });
  tearDown(() async {
    await queue.close();
    root.deleteSync(recursive: true);
  });

  Future<int> add(String room, {String owner = 'owner-a'}) => queue.enqueue(
    PendingCapturesCompanion.insert(
      ownerId: Value(owner),
      clientId: Value('$owner-$room'),
      roomId: room,
      inspectionId: 'inspection-1',
      kind: 'PHOTO',
      relativePath: 'missing.jpg',
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 4,
      createdAt: DateTime.now(),
    ),
  );

  Future<void> open(WidgetTester tester) async {
    tester.view.physicalSize = const Size(1179, 4000);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.push<void>(
                context,
                MaterialPageRoute(
                  builder: (_) => CaptureScreen(
                    inspectionId: 'inspection-1',
                    roomId: 'kitchen',
                    api: api,
                    queue: queue,
                    ownerId: 'owner-a',
                    supportDirectory: () async => root,
                  ),
                ),
              ),
              child: const Text('Open capture'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open capture'));
    await tester.pump();
    final choosePhotos = find.widgetWithText(OutlinedButton, 'Choose photos');
    for (var attempt = 0; attempt < 100; attempt++) {
      if (choosePhotos.evaluate().isNotEmpty &&
          tester.widget<OutlinedButton>(choosePhotos).onPressed != null) {
        break;
      }
      // Intake and picker recovery each await the real filesystem. Pump between
      // those completions so readiness, rather than machine speed, gates the test.
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 20)),
      );
      await tester.pump(const Duration(milliseconds: 20));
    }
    expect(tester.widget<OutlinedButton>(choosePhotos).onPressed, isNotNull);
    await tester.pump(const Duration(milliseconds: 600));
  }

  testWidgets(
    'Review room stays disabled until this room’s durable queue is empty',
    (tester) async {
      final own = await add('kitchen');
      await open(tester);
      expect(find.text('Take another photo'), findsOneWidget);
      final review = find.widgetWithText(OutlinedButton, 'Review room');
      expect(tester.widget<OutlinedButton>(review).onPressed, isNull);
      expect(
        find.textContaining('Review opens once this room'),
        findsOneWidget,
      );
      expect(
        await queue.byId(own),
        isNotNull,
        reason: 'failed uploads stay saved',
      );

      await queue.take(own);
      await tester.pumpAndSettle();
      expect(tester.widget<OutlinedButton>(review).onPressed, isNotNull);
      await tester.tap(review);
      await tester.pumpAndSettle();
      expect(api.finished, ['kitchen']);
    },
  );

  testWidgets(
    'this room’s pending changes disable review until the change is confirmed',
    (tester) async {
      api.captures = const [
        EvidenceCapture(
          id: 'kitchen-photo',
          kind: 'VIDEO',
          url: 'https://storage.test/video.mp4',
        ),
      ];
      await queue.queueRemoteNote(
        'owner-a',
        'inspection-1',
        'kitchen-photo',
        'Meter reading',
      );
      await open(tester);
      final review = find.widgetWithText(OutlinedButton, 'Review room');
      expect(tester.widget<OutlinedButton>(review).onPressed, isNull);
      final edit = (await queue.claimNextRemoteEdit(
        DateTime.now(),
        'owner-a',
      ))!;
      await queue.finishRemoteEdit(edit);
      await tester.pumpAndSettle();
      expect(tester.widget<OutlinedButton>(review).onPressed, isNotNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
    },
  );

  testWidgets(
    'another room’s media and changes never block this room’s review',
    (tester) async {
      await add('bedroom');
      await add('kitchen', owner: 'owner-b');
      await queue.queueRemoteNote(
        'owner-a',
        'inspection-1',
        'bedroom-photo',
        'Pending bedroom note',
      );
      await open(tester);
      final review = find.widgetWithText(OutlinedButton, 'Review room');
      expect(tester.widget<OutlinedButton>(review).onPressed, isNotNull);
      await tester.tap(review);
      await tester.pumpAndSettle();
      expect(api.finished, ['kitchen']);
      expect(await queue.forRoom('bedroom', 'owner-a'), hasLength(1));
      expect(
        await queue.remoteEditsFor('owner-a', 'inspection-1'),
        hasLength(1),
      );
    },
  );
}
