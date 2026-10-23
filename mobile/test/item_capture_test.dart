import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/capture_screen.dart';
import 'package:kivilo/screens/photo_mark_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_backend.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _ItemApi extends Api {
  _ItemApi() : super(attachAuth: false, cache: ReadCache()) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (request, handler) {
          requests.add(request);
          handler.reject(
            DioException(
              requestOptions: request,
              type: DioExceptionType.connectionError,
            ),
          );
        },
      ),
    );
  }
  final requests = <RequestOptions>[];
  var reads = 0;
  var finished = false;

  @override
  Future<RoomDetail> room(String inspectionId, String roomId) async {
    reads++;
    return const RoomDetail(
      id: 'living',
      name: 'Living room',
      status: 'PENDING',
      items: [
        InventoryItem(
          id: 'sofa',
          name: 'Sofa',
          category: 'FURNITURE',
          condition: 'GOOD',
          quantity: 1,
          evidenceCaptureIds: ['sofa-video'],
        ),
        InventoryItem(
          id: 'table',
          name: 'Table',
          category: 'FURNITURE',
          condition: 'GOOD',
          quantity: 1,
          evidenceCaptureIds: ['table-video'],
        ),
      ],
      captures: [
        EvidenceCapture(
          id: 'sofa-video',
          kind: 'VIDEO',
          url: 'https://example.test/sofa',
          note: 'Sofa evidence',
        ),
        EvidenceCapture(
          id: 'table-video',
          kind: 'VIDEO',
          url: 'https://example.test/table',
          note: 'Table evidence',
        ),
      ],
    );
  }

  @override
  Future<void> finishRoom(String inspectionId, String roomId) async {
    finished = true;
  }
}

class _Picker extends ImagePicker {
  _Picker(this.files);
  final List<XFile> files;
  @override
  Future<XFile?> pickImage({
    required ImageSource source,
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
    bool requestFullMetadata = true,
  }) async => files.first;
  @override
  Future<List<XFile>> pickMultiImage({
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    int? limit,
    bool requestFullMetadata = true,
  }) async => files;
}

void main() {
  late CaptureQueue queue;
  late Directory root;
  late _ItemApi api;
  late List<XFile> photos;
  late List<int> png;

  setUp(() async {
    final recorder = ui.PictureRecorder();
    ui.Canvas(recorder).drawColor(Colors.white, ui.BlendMode.src);
    final picture = recorder.endRecording();
    final image = await picture.toImage(400, 400);
    png = (await image.toByteData(
      format: ui.ImageByteFormat.png,
    ))!.buffer.asUint8List();
    image.dispose();
    picture.dispose();
    queue = CaptureQueue(NativeDatabase.memory());
    root = Directory.systemTemp.createTempSync('kivilo-item-capture-');
    api = _ItemApi();
    photos = [
      for (var i = 0; i < 2; i++)
        XFile((File('${root.path}/camera-$i.png')..writeAsBytesSync(png)).path),
    ];
  });
  tearDown(() async {
    await queue.close();
    root.deleteSync(recursive: true);
  });

  Future<void> settle(WidgetTester tester) async {
    for (var i = 0; i < 4; i++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 50)),
      );
      await tester.pump(const Duration(milliseconds: 300));
    }
  }

  Future<void> open(WidgetTester tester, {String itemId = 'sofa'}) async {
    tester.view.physicalSize = const Size(393, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.runAsync(
      () => tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: CaptureScreen(
            inspectionId: 'inspection',
            roomId: 'living',
            itemId: itemId,
            api: api,
            queue: queue,
            ownerId: 'owner',
            supportDirectory: () async => root,
            picker: _Picker(photos),
          ),
        ),
      ),
    );
    await settle(tester);
  }

  testWidgets('room camera leaves an interrupted document selection untouched', (tester) async {
    final journal = File('${root.path}/$supportingDocumentPickerFilename');
    journal.writeAsStringSync(jsonEncode({
      'ownerId': 'owner', 'tenancyId': 'tenancy', 'requestId': 'request-original',
      'clientId': newCaptureId(),
    }));
    await open(tester);
    expect(journal.existsSync(), isTrue);
    await tester.runAsync(() => tester.tap(find.text('Take another photo')));
    await settle(tester);
    expect(find.textContaining('Reopen Supporting documents'), findsOneWidget);
    expect(await queue.forRoom('living', 'owner'), isEmpty);
    expect(journal.existsSync(), isTrue);
    await tester.pumpWidget(const SizedBox.shrink());
    await settle(tester);
  });

  testWidgets(
    'camera opens local markup before upload and retains the exact item',
    (tester) async {
      await open(tester);
      expect(find.text('Sofa evidence'), findsOneWidget);
      expect(find.text('Table evidence'), findsNothing);
      expect(find.text('Review room'), findsNothing);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Take another photo'),
            )
            .onPressed,
        isNotNull,
      );
      await tester.runAsync(() => tester.tap(find.text('Take another photo')));
      await settle(tester);
      expect(find.byType(PhotoMarkScreen), findsOneWidget);
      final capture = (await queue.forRoom('living', 'owner')).single;
      expect(capture.itemId, 'sofa');
      expect(capture.awaitingMarkup, isTrue);
      expect(
        File('${root.path}/${capture.relativePath}').readAsBytesSync(),
        png,
      );
      expect(api.requests, isEmpty);
      expect(await queue.claimNext(DateTime.now(), ownerId: 'owner'), isNull);
      final canvas = find.byWidgetPredicate(
        (widget) => widget is GestureDetector && widget.onPanStart != null,
      );
      final center = tester.getRect(canvas).center;
      final gesture = await tester.startGesture(
        center + const Offset(-40, -40),
      );
      await gesture.moveTo(center + const Offset(0, -20));
      await gesture.moveTo(center + const Offset(40, 40));
      await gesture.moveTo(center + const Offset(-40, 40));
      await gesture.up();
      await settle(tester);
      await tester.enterText(find.byType(TextField), 'Scuff on armrest');
      await tester.tap(find.text('Save mark'));
      await settle(tester);
      final draft = (await queue.byId(capture.id))!;
      expect(
        (jsonDecode(draft.annotations!)['marks'] as List).single['note'],
        'Scuff on armrest',
      );
      expect(draft.awaitingMarkup, isTrue);
      await tester.tap(find.text('Save photo'));
      await settle(tester);
      expect(find.byType(PhotoMarkScreen), findsNothing);
      expect((await queue.byId(capture.id))!.awaitingMarkup, isFalse);
      expect(api.requests.single.data['clientId'], capture.clientId);
      expect(api.finished, isFalse);
      await tester.pumpWidget(const SizedBox.shrink());
      await settle(tester);
    },
  );

  testWidgets('a library batch is durable before its first photo is marked', (
    tester,
  ) async {
    await open(tester);
    await tester.runAsync(() => tester.tap(find.text('Choose photos')));
    await settle(tester);
    expect(find.byType(PhotoMarkScreen), findsOneWidget);
    final captures = await queue.forRoom('living', 'owner');
    expect(captures, hasLength(2));
    expect(
      captures.every(
        (capture) => capture.itemId == 'sofa' && capture.awaitingMarkup,
      ),
      isTrue,
    );
    expect(api.requests, isEmpty);
    for (final capture in captures) {
      expect(
        File('${root.path}/${capture.relativePath}').readAsBytesSync(),
        png,
      );
    }
    await tester.pumpWidget(const SizedBox.shrink());
    await settle(tester);
  });

  testWidgets(
    'recovery uses the original room and item when another item is opened',
    (tester) async {
      File('${root.path}/capture-picker.json').writeAsStringSync(
        jsonEncode({
          'ownerId': 'owner',
          'inspectionId': 'inspection',
          'roomId': 'living',
          'itemId': 'sofa',
          'video': false,
          'files': [
            {
              'path': photos.first.path,
              'mimeType': 'image/png',
              'clientId': 'interrupted-sofa',
            },
          ],
        }),
      );
      await open(tester, itemId: 'table');
      expect(find.byType(PhotoMarkScreen), findsNothing);
      final capture = (await queue.byClientId('interrupted-sofa'))!;
      expect(capture.itemId, 'sofa');
      expect(capture.awaitingMarkup, isTrue);
      expect(find.text('Finish marking'), findsNothing);
      expect(api.requests, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
      await settle(tester);
    },
  );

  testWidgets(
    'one item upload refreshes even while another item has unfinished marks',
    (tester) async {
      Future<int> add(String id) => queue.enqueue(
        PendingCapturesCompanion.insert(
          ownerId: const Value('owner'),
          clientId: Value('pending-$id'),
          itemId: Value(id),
          awaitingMarkup: const Value(true),
          roomId: 'living',
          inspectionId: 'inspection',
          kind: 'PHOTO',
          relativePath: 'camera-0.png',
          filename: 'photo.png',
          mimeType: 'image/png',
          sizeBytes: png.length,
          createdAt: DateTime.now(),
        ),
      );
      final sofa = await add('sofa');
      await add('table');
      await open(tester);
      final reads = api.reads;
      expect(find.text('Finish marking'), findsOneWidget);
      await queue.take(sofa);
      await settle(tester);
      expect(api.reads, greaterThan(reads));
      expect(find.text('Finish marking'), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
      await settle(tester);
    },
  );
}
