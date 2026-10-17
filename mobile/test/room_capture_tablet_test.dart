import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/capture_screen.dart';
import 'package:kivilo/screens/room_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:kivilo/ui/marked_network_photo.dart';

class _RoomApi extends Api {
  _RoomApi({
    this.captures = const [
      EvidenceCapture(id: 'c1', kind: 'VIDEO', url: 'https://x.test/1'),
      EvidenceCapture(id: 'c2', kind: 'VIDEO', url: 'https://x.test/2'),
      EvidenceCapture(id: 'c3', kind: 'VIDEO', url: 'https://x.test/3'),
    ],
  }) : super(attachAuth: false, cache: ReadCache()) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) => handler.reject(
          DioException(
            requestOptions: options,
            type: DioExceptionType.connectionError,
          ),
        ),
      ),
    );
  }

  int reads = 0;
  final List<EvidenceCapture> captures;

  @override
  Future<RoomDetail> room(String inspectionId, String roomId) async {
    reads++;
    return RoomDetail(
      id: 'kitchen',
      name: 'Kitchen',
      status: 'REVIEW',
      items: const [
        InventoryItem(
          id: 'walls',
          name: 'Walls',
          category: 'SURFACE',
          condition: 'GOOD',
          quantity: 1,
          evidenceCaptureIds: [],
        ),
      ],
      captures: captures,
    );
  }
}

Widget _app(Widget screen, {double textScale = 1}) => MaterialApp(
  theme: buildKiviloTheme(),
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(
      context,
    ).copyWith(textScaler: TextScaler.linear(textScale)),
    child: child!,
  ),
  home: screen,
);

void main() {
  testWidgets(
    'room evidence moves beside inventory without resetting its order',
    (tester) async {
      final api = _RoomApi();
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(393, 1200);
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        _app(
          RoomScreen(
            inspectionId: 'inspection-1',
            roomId: 'kitchen',
            editable: false,
            api: api,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Newest first'));
      await tester.pumpAndSettle();

      for (final width in [393.0, 520.0, 768.0, 1024.0, 520.0]) {
        tester.view.physicalSize = Size(width, width == 1024 ? 768 : 1200);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: 'width $width');
        final inventory = tester.getRect(find.text('Inventory'));
        final media = tester.getRect(find.text('Media'));
        expect(find.text('Oldest first'), findsOneWidget);
        expect(api.reads, 1, reason: 'resizing keeps the loaded room');
        if (width >= 840) {
          expect(media.left, greaterThan(inventory.right + 200));
          expect(media.top, closeTo(inventory.top, 1));
          expect(find.byType(GridView), findsOneWidget);
          final card = find.ancestor(
            of: find.text('Video 1'),
            matching: find.byType(Card),
          );
          expect(tester.getSize(card).width, greaterThan(150));
        } else {
          expect(media.top, greaterThan(inventory.bottom));
          expect(find.byType(GridView), findsNothing);
        }
        expect(
          tester.getTopLeft(find.text('Video 1')).dx,
          lessThan(tester.getTopLeft(find.text('Video 2')).dx),
        );
      }
    },
  );

  testWidgets('room controls fit tablet and split view with larger text', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1024, 1366);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      _app(
        RoomScreen(
          inspectionId: 'inspection-1',
          roomId: 'kitchen',
          editable: true,
          api: _RoomApi(),
        ),
        textScale: 1.5,
      ),
    );
    for (final width in [1024.0, 768.0, 520.0, 393.0]) {
      tester.view.physicalSize = Size(width, 1366);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: 'width $width');
      await tester.scrollUntilVisible(
        find.text('I reviewed this room'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      final review = tester.getRect(
        find.widgetWithText(FilledButton, 'I reviewed this room'),
      );
      expect(review.left, greaterThanOrEqualTo(16));
      expect(review.right, lessThanOrEqualTo(width - 16));
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets('capture resize preserves mode, saved media and review guard', (
    tester,
  ) async {
    final queue = CaptureQueue(NativeDatabase.memory());
    final directory = Directory.systemTemp.createTempSync('kivilo-tablet-');
    addTearDown(() async {
      await queue.close();
      directory.deleteSync(recursive: true);
    });
    final queuedId = await queue.enqueue(
      PendingCapturesCompanion.insert(
        ownerId: const Value('owner-a'),
        clientId: const Value('offline-video'),
        roomId: 'kitchen',
        inspectionId: 'inspection-1',
        kind: 'VIDEO',
        relativePath: 'missing.mp4',
        filename: 'walkthrough.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 4,
        createdAt: DateTime.now(),
      ),
    );
    final api = _RoomApi();
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(393, 1200);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      _app(
        CaptureScreen(
          inspectionId: 'inspection-1',
          roomId: 'kitchen',
          api: api,
          queue: queue,
          ownerId: 'owner-a',
          supportDirectory: () async => directory,
        ),
        textScale: 1.5,
      ),
    );
    await tester.pump();
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 50)),
    );
    // Paused uploads have an indeterminate progress bar, which keeps animating.
    await tester.pump(const Duration(milliseconds: 600));
    await tester.tap(find.text('Video').first);
    await tester.pump(const Duration(milliseconds: 600));

    for (final width in [393.0, 520.0, 768.0, 1024.0, 520.0]) {
      tester.view.physicalSize = Size(width, width == 1024 ? 768 : 1200);
      await tester.pump(const Duration(milliseconds: 600));
      expect(tester.takeException(), isNull, reason: 'width $width');
      expect(find.text('Record video'), findsOneWidget);
      expect(await queue.byId(queuedId), isNotNull);
      final review = find.widgetWithText(OutlinedButton, 'Review room');
      expect(tester.widget<OutlinedButton>(review).onPressed, isNull);
      expect(tester.getSize(review).width, lessThanOrEqualTo(688));
      final controls = tester.getRect(find.text('Capture this room'));
      final media = tester.getRect(find.text('Media'));
      if (width >= 840) {
        expect(media.left, greaterThan(controls.left + 320));
        expect(media.top, closeTo(controls.top, 1));
      } else {
        expect(media.top, greaterThan(controls.bottom));
      }
    }

    await queue.take(queuedId);
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<OutlinedButton>(
            find.widgetWithText(OutlinedButton, 'Review room'),
          )
          .onPressed,
      isNotNull,
    );
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  });

  testWidgets('tablet room mounts only a window of its photo evidence', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1024, 1024);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      _app(
        RoomScreen(
          inspectionId: 'inspection-1',
          roomId: 'kitchen',
          editable: false,
          api: _RoomApi(captures: _manyPhotos()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Photo 100'), findsOneWidget);
    expect(find.text('Photo 1'), findsNothing);
    expect(find.byType(MarkedNetworkPhoto).evaluate().length, lessThan(20));
    final grid = find.byType(GridView);
    await tester.scrollUntilVisible(
      find.text('Photo 1'),
      500,
      scrollable: find.descendant(of: grid, matching: find.byType(Scrollable)),
      maxScrolls: 40,
    );
    await tester.pumpAndSettle();
    expect(find.text('Photo 1'), findsOneWidget);
    expect(find.byType(MarkedNetworkPhoto).evaluate().length, lessThan(20));
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'tablet capture mounts and decodes only visible media thumbnails',
    (tester) async {
      final queue = CaptureQueue(NativeDatabase.memory());
      final directory = Directory.systemTemp.createTempSync(
        'kivilo-tablet-photos-',
      );
      addTearDown(() async {
        await queue.close();
        directory.deleteSync(recursive: true);
      });
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(1024, 1024);
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        _app(
          CaptureScreen(
            inspectionId: 'inspection-1',
            roomId: 'kitchen',
            api: _RoomApi(captures: _manyPhotos()),
            queue: queue,
            ownerId: 'owner-a',
            supportDirectory: () async => directory,
          ),
        ),
      );
      await tester.pump();
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 50)),
      );
      await tester.pumpAndSettle();

      expect(find.text('Evidence photo 100'), findsOneWidget);
      expect(find.text('Evidence photo 1'), findsNothing);
      expect(find.byType(Image).evaluate().length, lessThan(20));
      for (final image in tester.widgetList<Image>(find.byType(Image))) {
        expect(image.image, isA<ResizeImage>());
        expect((image.image as ResizeImage).width, 112);
      }
      final media = find.byKey(const PageStorageKey('capture-media-kitchen'));
      await tester.scrollUntilVisible(
        find.text('Evidence photo 1'),
        500,
        scrollable: find.descendant(
          of: media,
          matching: find.byType(Scrollable),
        ),
        maxScrolls: 40,
      );
      await tester.pumpAndSettle();
      expect(find.text('Evidence photo 1'), findsOneWidget);
      expect(find.byType(Image).evaluate().length, lessThan(20));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
    },
  );
}

List<EvidenceCapture> _manyPhotos() => [
  for (var index = 1; index <= 100; index++)
    EvidenceCapture(
      id: 'photo-$index',
      kind: 'PHOTO',
      url: 'https://example.invalid/photo-$index.jpg',
      note: 'Evidence photo $index',
    ),
];
