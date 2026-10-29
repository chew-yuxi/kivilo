import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/capture_store.dart';

void main() {
  late CaptureQueue queue;
  late Directory root;
  late Uint8List landscape;

  setUpAll(() {
    landscape = image.encodeJpg(image.Image(width: 3840, height: 2160));
  });
  setUp(() {
    queue = CaptureQueue(NativeDatabase.memory());
    root = Directory.systemTemp.createTempSync('kivilo-camera-resize-');
  });
  tearDown(() async {
    await queue.close();
    if (root.existsSync()) root.deleteSync(recursive: true);
  });

  Future<PendingCapture> save(Uint8List bytes) async {
    final source = File('${root.path}/camera.jpg')..writeAsBytesSync(bytes);
    final id = await CaptureStore(queue: queue, root: root).save(
      source: source,
      ownerId: 'owner-a',
      inspectionId: 'inspection-a',
      roomId: 'room-a',
      itemId: 'item-a',
      kind: 'PHOTO',
      extension: 'jpg',
      mimeType: 'image/jpeg',
      clientId: 'camera-photo',
      awaitingMarkup: true,
      resizePhoto: true,
    );
    return (await queue.byId(id))!;
  }

  test(
    'an iPhone shot is capped while its exact original stays durable',
    () async {
      final row = await save(landscape);
      final upload = File('${root.path}/${row.relativePath}');
      final resized = image.decodeJpg(await upload.readAsBytes())!;
      expect((resized.width, resized.height), (2048, 1152));
      expect(row.sizeBytes, await upload.length());
      expect(row.sizeBytes, lessThan(landscape.length));
      expect(await File('${upload.path}.original').readAsBytes(), landscape);
      expect(row.itemId, 'item-a');
      expect(row.awaitingMarkup, isTrue);
      expect(await queue.claimNext(DateTime.now(), ownerId: 'owner-a'), isNull);
      expect(Directory('${root.path}/capture-intake').listSync(), isEmpty);
    },
  );

  test('an EXIF portrait stays upright after shrinking', () async {
    final portrait = image.Image(width: 3000, height: 1500);
    image.fillRect(
      portrait,
      x1: 0,
      y1: 0,
      x2: 1499,
      y2: 1499,
      color: image.ColorRgb8(255, 0, 0),
    );
    image.fillRect(
      portrait,
      x1: 1500,
      y1: 0,
      x2: 2999,
      y2: 1499,
      color: image.ColorRgb8(0, 0, 255),
    );
    portrait.exif.imageIfd.orientation = 6;
    final row = await save(image.encodeJpg(portrait));
    final resized = image.decodeJpg(
      await File('${root.path}/${row.relativePath}').readAsBytes(),
    )!;
    expect((resized.width, resized.height), (1024, 2048));
    expect(resized.exif.imageIfd.orientation, isNull);
    expect(resized.getPixel(512, 100).r, greaterThan(240));
    expect(resized.getPixel(512, 1948).b, greaterThan(240));
  });

  test(
    'an Android-sized shot keeps its bytes without a second encode',
    () async {
      final bytes = image.encodeJpg(image.Image(width: 1920, height: 1080));
      final row = await save(bytes);
      expect(
        await File('${root.path}/${row.relativePath}').readAsBytes(),
        bytes,
      );
      expect(
        await File('${root.path}/${row.relativePath}.original').readAsBytes(),
        bytes,
      );
    },
  );

  test(
    'a failed output write retains the original and recovers on restart',
    () async {
      final partial = Directory(
        '${root.path}/captures/owner-a/camera-photo.jpg.partial',
      )..createSync(recursive: true);
      await expectLater(save(landscape), throwsA(isA<FileSystemException>()));
      final original = File(
        '${root.path}/captures/owner-a/camera-photo.jpg.original',
      );
      expect(await original.readAsBytes(), landscape);
      expect(await queue.byClientId('camera-photo'), isNull);
      expect(Directory('${root.path}/capture-intake').listSync(), hasLength(1));

      await partial.delete();
      // Another store instance follows the same intake journal after an app restart.
      final store = CaptureStore(queue: queue, root: root);
      expect(await store.reconcile('owner-a'), isEmpty);
      final recovered = (await queue.byClientId('camera-photo'))!;
      final resized = image.decodeJpg(
        await File('${root.path}/${recovered.relativePath}').readAsBytes(),
      )!;
      expect((resized.width, resized.height), (2048, 1152));
      expect(await original.readAsBytes(), landscape);
      expect(recovered.awaitingMarkup, isTrue);
      expect(recovered.itemId, 'item-a');
    },
  );

  test('active resize intake and overlapping recoveries import once', () async {
    await queue.close();
    final blocked = _BlockedCaptureQueue();
    queue = blocked;
    final saving = save(landscape);
    // Stop the save after its JPEG is prepared but before the durable queue row.
    // Recovery must wait for the whole intake, including this last hand-over.
    await blocked.inserting.future;
    final other = CaptureStore(queue: queue, root: Directory('${root.path}/.'));
    final recovering = other.reconcile('owner-a');
    final alsoRecovering = CaptureStore(
      queue: queue,
      root: root,
    ).reconcile('owner-a');
    await Future<void>.delayed(const Duration(milliseconds: 50));
    expect(blocked.insertions, 1);
    blocked.release.complete();

    final row = await saving;
    expect(await recovering, isEmpty);
    expect(await alsoRecovering, isEmpty);
    expect(await queue.forRoom('room-a', 'owner-a'), hasLength(1));
    final upload = File('${root.path}/${row.relativePath}');
    final resized = image.decodeJpg(await upload.readAsBytes())!;
    expect((resized.width, resized.height), (2048, 1152));
    expect(await File('${upload.path}.original').readAsBytes(), landscape);
    expect(Directory('${root.path}/capture-intake').listSync(), isEmpty);
  });

  test(
    'a crash during encoding overwrites the partial copy from the original',
    () async {
      const relativePath = 'captures/owner-a/interrupted.jpg';
      final original = File('${root.path}/$relativePath.original')
        ..parent.createSync(recursive: true)
        ..writeAsBytesSync(landscape);
      File('${root.path}/$relativePath.partial').writeAsBytesSync([1, 2, 3]);
      final journal = File('${root.path}/capture-intake/interrupted.json')
        ..parent.createSync(recursive: true);
      journal.writeAsStringSync(
        jsonEncode({
          'clientId': 'interrupted',
          'ownerId': 'owner-a',
          'inspectionId': 'inspection-a',
          'roomId': 'room-a',
          'kind': 'PHOTO',
          'resizePhoto': true,
          'awaitingMarkup': true,
          'relativePath': relativePath,
          'sourcePath': '${root.path}/gone-camera.jpg',
          'filename': 'interrupted.jpg',
          'mimeType': 'image/jpeg',
          'createdAt': '2026-10-29T00:00:00Z',
        }),
      );

      expect(
        await CaptureStore(queue: queue, root: root).reconcile('owner-a'),
        isEmpty,
      );
      final row = (await queue.byClientId('interrupted'))!;
      expect(row.sizeBytes, await File('${root.path}/$relativePath').length());
      expect(await original.readAsBytes(), landscape);
      expect(File('${root.path}/$relativePath.partial').existsSync(), isFalse);
      expect(journal.existsSync(), isFalse);
    },
  );

  test(
    'an unreadable shot remains on the phone and in intake recovery',
    () async {
      final bytes = Uint8List.fromList([1, 2, 3]);
      await expectLater(save(bytes), throwsStateError);
      final original = File(
        '${root.path}/captures/owner-a/camera-photo.jpg.original',
      );
      final store = CaptureStore(queue: queue, root: root);
      expect(await store.reconcile('owner-a'), hasLength(1));
      expect(await store.reconcile('owner-a'), hasLength(1));
      expect(await original.readAsBytes(), bytes);
      expect(Directory('${root.path}/capture-intake').listSync(), hasLength(1));
      expect(await queue.byClientId('camera-photo'), isNull);
    },
  );
}

class _BlockedCaptureQueue extends CaptureQueue {
  _BlockedCaptureQueue() : super(NativeDatabase.memory());

  final inserting = Completer<void>();
  final release = Completer<void>();
  var insertions = 0;

  @override
  Future<int> enqueue(PendingCapturesCompanion capture) async {
    insertions++;
    if (!inserting.isCompleted) inserting.complete();
    await release.future;
    return super.enqueue(capture);
  }
}
