import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:kivilo/screens/evidence_photo_screen.dart';
import 'package:kivilo/screens/photo_mark_screen.dart';
import 'package:kivilo/services/api_failure.dart';
import 'package:kivilo/services/capture_backend.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/capture_store.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _Picker extends ImagePicker {
  _Picker(this.photo, {this.onPick});
  final XFile photo;
  final VoidCallback? onPick;
  @override
  Future<XFile?> pickImage({
    required ImageSource source,
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
    bool requestFullMetadata = true,
  }) async {
    onPick?.call();
    return photo;
  }
}

class _OfflineBackend implements CaptureBackend {
  var attempts = 0;
  @override
  Future<({String storagePath, String? signedUrl, bool alreadyUploaded})>
  uploadUrl(
    String inspectionId,
    String roomId,
    String filename,
    String clientId,
  ) async {
    attempts++;
    throw ApiFailure.noConnection;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _InterruptedClaimQueue extends CaptureQueue {
  _InterruptedClaimQueue() : super(NativeDatabase.memory());

  final firstClaim = Completer<void>();
  var claims = 0;

  @override
  Future<PendingCapture?> claimNext(
    DateTime now, {
    String? ownerId,
    Set<int> exclude = const {},
  }) async {
    claims++;
    if (claims == 1) {
      await firstClaim.future;
      throw StateError('database is locked');
    }
    return super.claimNext(now, ownerId: ownerId, exclude: exclude);
  }
}

void main() {
  late Directory root;
  late CaptureQueue queue;
  late XFile photo;
  late List<int> png;
  late _OfflineBackend backend;
  var currentOwner = 'agent';

  setUp(() async {
    root = Directory.systemTemp.createTempSync('evidence-screen-');
    queue = CaptureQueue(NativeDatabase.memory());
    backend = _OfflineBackend();
    currentOwner = 'agent';
    final recorder = ui.PictureRecorder();
    ui.Canvas(recorder).drawColor(Colors.white, ui.BlendMode.src);
    final picture = recorder.endRecording();
    final image = await picture.toImage(400, 400);
    png = (await image.toByteData(
      format: ui.ImageByteFormat.png,
    ))!.buffer.asUint8List();
    image.dispose();
    picture.dispose();
    photo = XFile(
      (File('${root.path}/camera.heic')..writeAsBytesSync(png)).path,
    );
  });
  tearDown(() async {
    await queue.close();
    root.deleteSync(recursive: true);
  });

  Future<void> settle(WidgetTester tester) async {
    for (var i = 0; i < 5; i++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 35)),
      );
      await tester.pump(const Duration(milliseconds: 150));
    }
  }

  Future<void> open(
    WidgetTester tester, {
    _Picker? picker,
    Future<List<EvidencePhoto>> Function()? loadPhotos,
  }) async {
    tester.view.physicalSize = const Size(393, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.runAsync(
      () => tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: EvidencePhotoScreen(
            title: 'Update photos',
            queueOwner: 'addendum:update',
            targetId: 'entry',
            loadPhotos: loadPhotos ?? () async => throw ApiFailure.noConnection,
            queue: queue,
            ownerId: 'agent',
            currentOwnerId: () => currentOwner,
            supportDirectory: () async => root,
            picker: picker ?? _Picker(photo),
            backend: backend,
          ),
        ),
      ),
    );
    await settle(tester);
  }

  testWidgets(
    'queue failure is shown once, keeps originals and allows another upload attempt',
    (tester) async {
      await queue.close();
      final interrupted = _InterruptedClaimQueue();
      queue = interrupted;
      final id = (await tester.runAsync(
        () => CaptureStore(queue: queue, root: root).save(
          source: File(photo.path),
          ownerId: 'agent',
          inspectionId: 'addendum:update',
          roomId: 'entry',
          kind: 'PHOTO',
          extension: 'png',
          mimeType: 'image/png',
        ),
      ))!;
      final original = (await queue.byId(id))!;
      await open(tester, loadPhotos: () async => []);
      expect(find.text('Retry upload'), findsOneWidget);
      await tester.tap(find.text('Retry upload'));
      await tester.tap(find.text('Retry upload'));
      expect(interrupted.claims, 1);

      interrupted.firstClaim.complete();
      await settle(tester);
      expect(
        find.text('Upload paused. Something went wrong. Please try again.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
      expect(backend.attempts, 0);
      expect(await queue.byId(id), isNotNull);
      expect(
        File('${root.path}/${original.relativePath}').readAsBytesSync(),
        png,
      );

      await tester.runAsync(() => tester.tap(find.text('Retry upload')));
      await settle(tester);
      expect(interrupted.claims, greaterThan(1));
      expect(backend.attempts, 1);
      expect((await queue.byId(id))!.attempts, 1);
      expect(find.textContaining('Upload paused.'), findsNothing);
      expect(tester.takeException(), isNull);
      expect(
        File('${root.path}/${original.relativePath}').readAsBytesSync(),
        png,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      await settle(tester);
    },
  );

  testWidgets(
    'offline original, marks and caption survive closing the editor before Save',
    (tester) async {
      await open(tester);
      await tester.runAsync(() => tester.tap(find.text('Take photo')));
      await settle(tester);
      expect(find.byType(PhotoMarkScreen), findsOneWidget);
      final row = (await queue.forRoom('entry', 'agent')).single;
      expect(row.awaitingMarkup, isTrue);
      expect(File('${root.path}/${row.relativePath}').readAsBytesSync(), png);
      expect(backend.attempts, 0);
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
      await tester.enterText(find.byType(TextField), 'Crack at corner');
      await tester.tap(find.text('Save mark'));
      await settle(tester);
      await tester.tap(find.text('Add photo note'));
      await settle(tester);
      await tester.enterText(find.byType(TextField), 'Kitchen cabinet');
      await settle(tester);
      expect((await queue.byId(row.id))!.note, 'Kitchen cabinet');
      expect(
        (await queue.byId(row.id))!.annotations,
        contains('Crack at corner'),
      );
      expect(await queue.claimNext(DateTime.now(), ownerId: 'agent'), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await settle(tester);

      await open(tester);
      expect(find.text('Finish marking'), findsOneWidget);
      expect(find.text('Kitchen cabinet'), findsOneWidget);
      await tester.runAsync(() => tester.tap(find.text('Finish marking')));
      await settle(tester);
      expect(find.byType(PhotoMarkScreen), findsOneWidget);
      await tester.tap(find.text('Save photo'));
      await settle(tester);
      final ready = (await queue.byId(row.id))!;
      expect(ready.awaitingMarkup, isFalse);
      expect(ready.note, 'Kitchen cabinet');
      expect(ready.annotations, contains('Crack at corner'));
      expect(ready.attempts, greaterThan(0));
      expect(File('${root.path}/${row.relativePath}').readAsBytesSync(), png);
      await tester.pumpWidget(const SizedBox.shrink());
      await settle(tester);
    },
  );

  testWidgets(
    'account change while picker is open retains original under its first owner',
    (tester) async {
      await open(
        tester,
        picker: _Picker(photo, onPick: () => currentOwner = 'other'),
      );
      await tester.runAsync(() => tester.tap(find.text('Take photo')));
      await settle(tester);
      expect(find.byType(PhotoMarkScreen), findsNothing);
      final rows = await queue.forRoom('entry', 'agent');
      expect(rows, hasLength(1));
      expect(rows.single.awaitingMarkup, isTrue);
      expect(await queue.forRoom('entry', 'other'), isEmpty);
      expect(backend.attempts, 0);
      expect(find.textContaining('Account changed.'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      await settle(tester);
    },
  );

  testWidgets(
    'pending rows require both target and domain, not a matching target alone',
    (tester) async {
      final id = (await tester.runAsync(
        () => CaptureStore(queue: queue, root: root).save(
          source: File(photo.path),
          ownerId: 'agent',
          inspectionId: 'maintenance:case',
          roomId: 'entry',
          kind: 'BEFORE',
          extension: 'png',
          mimeType: 'image/png',
          awaitingMarkup: true,
        ),
      ))!;
      await queue.setNote(id, 'Different case photo');
      await open(tester);
      expect(find.text('Different case photo'), findsNothing);
      expect(find.text('Finish marking'), findsNothing);
      expect(await queue.byId(id), isNotNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await settle(tester);
    },
  );
}
