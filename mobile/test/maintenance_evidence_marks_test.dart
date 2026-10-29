import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:kivilo/screens/maintenance_evidence_screen.dart';
import 'package:kivilo/screens/photo_mark_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/capture_store.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _Picker extends ImagePicker {
  _Picker(this.file);
  final XFile file;
  @override
  Future<XFile?> pickImage({
    required ImageSource source,
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
    bool requestFullMetadata = true,
  }) async => file;
}

/// The object is reported as already in storage, so no bytes leave the test.
class _Adapter implements HttpClientAdapter {
  final requests = <RequestOptions>[];
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<dynamic>? requestStream,
    Future<dynamic>? cancelFuture,
  ) async {
    requests.add(options);
    final body = options.path.endsWith('/upload-url')
        ? {'storagePath': 'maintenance/case-1/photo.png', 'alreadyUploaded': true}
        : {'id': 'evidence-1', 'annotationsApplied': true};
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  late CaptureQueue queue;
  late Directory root;
  late _Adapter adapter;
  late XFile photo;

  setUp(() async {
    final recorder = ui.PictureRecorder();
    ui.Canvas(recorder).drawColor(Colors.white, ui.BlendMode.src);
    final picture = recorder.endRecording();
    final image = await picture.toImage(400, 400);
    final png = (await image.toByteData(
      format: ui.ImageByteFormat.png,
    ))!.buffer.asUint8List();
    image.dispose();
    picture.dispose();
    queue = CaptureQueue(NativeDatabase.memory());
    root = Directory.systemTemp.createTempSync('kivilo-evidence-marks-');
    adapter = _Adapter();
    photo = XFile((File('${root.path}/camera.png')..writeAsBytesSync(png)).path);
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

  /// Real file and queue work finishes on the real clock; wait for the outcome itself
  /// rather than a fixed time, which a busy machine can outrun.
  Future<void> settleUntil(WidgetTester tester, Future<bool> Function() done) async {
    for (var i = 0; i < 40; i++) {
      await settle(tester);
      if (await tester.runAsync(done) ?? false) return;
    }
  }

  Future<void> open(WidgetTester tester) async {
    tester.view.physicalSize = const Size(393, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.runAsync(
      () => tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: MaintenanceEvidenceScreen(
            caseId: 'case-1',
            purpose: 'BEFORE',
            api: Api(dio: Dio()..httpClientAdapter = adapter, attachAuth: false),
            queue: queue,
            picker: _Picker(photo),
            supportDirectory: () async => root,
            canRecoverLostData: false,
            ownerId: 'owner',
          ),
        ),
      ),
    );
    await settle(tester);
  }

  RequestOptions? registration() => adapter.requests
      .where((request) => request.path.endsWith('/evidence'))
      .firstOrNull;

  testWidgets('a repair photo is marked before it uploads with its marks', (
    tester,
  ) async {
    await open(tester);
    await tester.runAsync(() => tester.tap(find.text('Take photo')));
    await settleUntil(tester, () async => find.byType(PhotoMarkScreen).evaluate().isNotEmpty);
    expect(find.byType(PhotoMarkScreen), findsOneWidget);
    final capture = (await queue.forRoom('BEFORE', 'owner')).single;
    expect(capture.awaitingMarkup, isTrue);
    expect(adapter.requests, isEmpty);

    final canvas = find.byWidgetPredicate(
      (widget) => widget is GestureDetector && widget.onPanStart != null,
    );
    final center = tester.getRect(canvas).center;
    final gesture = await tester.startGesture(center + const Offset(-40, -40));
    await gesture.moveTo(center + const Offset(0, -20));
    await gesture.moveTo(center + const Offset(40, 40));
    await gesture.moveTo(center + const Offset(-40, 40));
    await gesture.up();
    await settle(tester);
    await tester.enterText(find.byType(TextField), 'Crack at the base');
    await tester.tap(find.text('Save mark'));
    await settle(tester);
    await tester.tap(find.text('Save photo'));
    await settleUntil(tester, () async =>
        registration() != null && (await queue.forRoom('BEFORE', 'owner')).isEmpty);

    expect(find.byType(PhotoMarkScreen), findsNothing);
    final sent = registration()!.data as Map<String, dynamic>;
    expect(sent['clientId'], capture.clientId);
    final marks = (sent['annotations'] as Map<String, dynamic>)['marks'] as List;
    expect((marks.single as Map)['note'], 'Crack at the base');
    expect(await queue.forRoom('BEFORE', 'owner'), isEmpty);
    expect(find.text('Photo saved and uploaded.'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
    await settle(tester);
  });

  testWidgets('a photo left mid-marking by a closed app uploads on reopening', (
    tester,
  ) async {
    // Real file I/O never completes inside the test's fake clock.
    final id = (await tester.runAsync(
      () => CaptureStore(queue: queue, root: root).save(
        source: File(photo.path),
        ownerId: 'owner',
        inspectionId: 'maintenance:case-1',
        roomId: 'BEFORE',
        kind: 'BEFORE',
        extension: 'png',
        mimeType: 'image/png',
        awaitingMarkup: true,
      ),
    ))!;
    final drawn = {
      'w': 400,
      'h': 400,
      'marks': [
        {'shape': 'ring', 'cx': 0.5, 'cy': 0.5, 'rx': 0.2, 'ry': 0.2},
      ],
    };
    await tester.runAsync(() => queue.setAnnotations(id, jsonEncode(drawn)));

    await open(tester);
    await settleUntil(tester, () async =>
        registration() != null && (await queue.forRoom('BEFORE', 'owner')).isEmpty);

    expect((registration()!.data as Map<String, dynamic>)['annotations'], drawn);
    expect(await queue.forRoom('BEFORE', 'owner'), isEmpty);
    await tester.pumpWidget(const SizedBox.shrink());
    await settle(tester);
  });
}
