import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:isolate';

import 'package:drift/drift.dart';
import 'package:image/image.dart' as image;

import 'capture_queue.dart';

/// Longest edge an evidence photo is sent at, the same as the web's
/// (`src/lib/downscale.ts`). A camera frame is 3 to 6 MB; at this size it is a fifth of
/// that, uploads and opens that much faster, and a rating plate is still legible.
const evidencePhotoEdge = 2048.0;

/// The JPEG quality of that re-encode, also the web's. Below 100 makes both platforms
/// re-encode, which is also what turns an iPhone's HEIC into JPEG.
const evidencePhotoQuality = 85;

/// Saves the camera's temporary file into app support storage before a capture is
/// acknowledged in the UI. A small journal covers a crash between the file rename and
/// SQLite insert; reconcile() imports that file on the next launch.
class CaptureStore {
  CaptureStore({required this.queue, required this.root});

  final CaptureQueue queue;
  final Directory root;
  static final _intakes = <String, Future<void>>{};

  Future<int> save({
    required File source,
    required String ownerId,
    required String inspectionId,
    required String roomId,
    required String kind,
    required String extension,
    required String mimeType,
    int? durationSec,
    String? clientId,
    String? itemId,
    bool awaitingMarkup = false,
    bool resizePhoto = false,
  }) async {
    if (resizePhoto && (kind != 'PHOTO' || mimeType != 'image/jpeg')) {
      throw ArgumentError('Only camera JPEG photos can be resized.');
    }
    final captureId = clientId ?? newCaptureId();
    final relativePath = 'captures/$ownerId/$captureId.$extension';
    final journal = _journal(captureId);
    final metadata = <String, dynamic>{
      'clientId': captureId,
      'ownerId': ownerId,
      'inspectionId': inspectionId,
      'roomId': roomId,
      'itemId': itemId,
      'kind': kind,
      'awaitingMarkup': awaitingMarkup,
      'resizePhoto': resizePhoto,
      'relativePath': relativePath,
      'sourcePath': source.path,
      'filename': '$captureId.$extension',
      'mimeType': mimeType,
      'durationSec': durationSec,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
    };
    return _serializeIntake(journal, () async {
      await journal.writeAsString(jsonEncode(metadata), flush: true);
      // Preserve the camera bytes before doing any image work. The journal can rebuild
      // the upload copy after a crash, and the original survives until upload hand-over.
      final destination = File(
        '${root.path}/$relativePath${resizePhoto ? '.original' : ''}',
      );
      if (!await destination.exists()) {
        await _waitForReadableSource(source);
        await _persistIntoSupport(source, destination);
      } else {
        // A previous attempt moved the camera file, then failed before its queue row.
        final recovered = await destination.open(mode: FileMode.append);
        try {
          await recovered.flush();
        } finally {
          await recovered.close();
        }
      }
      return _importJournal(journal, metadata);
    });
  }

  /// Returns journals whose camera bytes cannot currently be found. The journal stays
  /// on disk so the missing evidence is visible rather than silently discarded.
  Future<List<String>> reconcile(String ownerId, {String? roomId}) async {
    final directory = Directory('${root.path}/capture-intake');
    if (!await directory.exists()) return [];
    final unresolved = <String>[];
    await for (final entity in directory.list()) {
      if (entity is! File || !entity.path.endsWith('.json')) continue;
      try {
        await _serializeIntake(entity, () async {
          // The active save or another recovery may have finished while we waited.
          if (!await entity.exists()) return;
          final metadata =
              jsonDecode(await entity.readAsString()) as Map<String, dynamic>;
          if (metadata['ownerId'] != ownerId) return;
          if (roomId != null && metadata['roomId'] != roomId) return;
          final handedOver = await queue.serverIdForClient(
            ownerId,
            metadata['inspectionId'] as String,
            metadata['clientId'] as String,
          );
          if (handedOver != null) {
            // A crash can leave the intake journal behind even though the queue has
            // since registered and discarded this capture. Do not resurrect it.
            await entity.delete();
            return;
          }
          final file = File(
            '${root.path}/${metadata['relativePath']}'
            '${metadata['resizePhoto'] == true ? '.original' : ''}',
          );
          if (!await file.exists()) {
            final source = File(metadata['sourcePath'] as String);
            if (await source.exists()) await _persistIntoSupport(source, file);
          }
          if (await file.exists()) {
            await _importJournal(entity, metadata);
          } else {
            unresolved.add(metadata['clientId'] as String);
          }
        });
      } catch (_) {
        unresolved.add(entity.path);
      }
    }
    return unresolved;
  }

  /// Foreground recovery can run while the camera is persisting or shrinking a shot.
  /// All store instances in this isolate share its intake guard; JPEG work runs in a
  /// worker isolate without opening a store. A failed operation releases the guard so
  /// a later recovery can retry from the unchanged journal and original.
  static Future<T> _serializeIntake<T>(
    File journal,
    Future<T> Function() operation,
  ) async {
    await journal.parent.create(recursive: true);
    final key = '${await journal.parent.resolveSymbolicLinks()}/'
        '${journal.uri.pathSegments.last}';
    final previous = _intakes[key];
    final done = Completer<void>();
    _intakes[key] = done.future;
    try {
      await previous;
      return await operation();
    } finally {
      done.complete();
      if (identical(_intakes[key], done.future)) _intakes.remove(key);
    }
  }

  Future<int> _importJournal(
    File journal,
    Map<String, dynamic> metadata,
  ) async {
    final clientId = metadata['clientId'] as String;
    final existing = await queue.byClientId(clientId);
    if (existing != null) {
      if (existing.ownerId != metadata['ownerId'] ||
          existing.inspectionId != metadata['inspectionId'] ||
          existing.roomId != metadata['roomId'] ||
          existing.itemId != metadata['itemId']) {
        throw StateError(
          'Intake journal conflicts with another capture identity',
        );
      }
      await journal.delete();
      return existing.id;
    }
    final file = File('${root.path}/${metadata['relativePath']}');
    if (metadata['resizePhoto'] == true && !await file.exists()) {
      // Isolate work keeps the camera preview responsive while JPEGs are decoded.
      final path = file.path;
      await Isolate.run(() => _prepareCameraPhoto(path));
    }
    final size = await file.length();
    if (size == 0) {
      throw StateError('Empty media file; capture retained for recovery.');
    }
    final id = await queue.enqueue(
      PendingCapturesCompanion.insert(
        ownerId: Value(metadata['ownerId'] as String),
        clientId: Value(clientId),
        roomId: metadata['roomId'] as String,
        inspectionId: metadata['inspectionId'] as String,
        itemId: Value(metadata['itemId'] as String?),
        kind: metadata['kind'] as String,
        awaitingMarkup: Value(metadata['awaitingMarkup'] == true),
        relativePath: metadata['relativePath'] as String,
        filename: metadata['filename'] as String,
        mimeType: metadata['mimeType'] as String,
        sizeBytes: size,
        durationSec: Value(metadata['durationSec'] as int?),
        createdAt: DateTime.parse(metadata['createdAt'] as String),
      ),
    );
    await journal.delete();
    return id;
  }

  File _journal(String clientId) =>
      File('${root.path}/capture-intake/$clientId.json');

  Future<void> _persistIntoSupport(File source, File destination) async {
    await destination.parent.create(recursive: true);
    var moved = false;
    try {
      // Camera files and app support normally share a volume. Moving avoids a
      // second ten-minute video on disk and is atomic if the app is interrupted.
      await source.rename(destination.path);
      moved = true;
    } on FileSystemException {
      // A camera plugin may use a different volume. Stream it through a partial
      // file, flush, then rename; the intake journal still owns the source.
    }
    if (moved) {
      final file = await destination.open(mode: FileMode.append);
      try {
        await file.flush();
      } finally {
        await file.close();
      }
      return;
    }
    // Some Android camera providers return before their cache hand-off is visible to
    // Dart. A rename can therefore lose a race even after the initial existence check.
    // Wait for the provider path again before opening it for the streaming fallback.
    await _waitForReadableSource(source);
    final partial = File('${destination.path}.partial');
    final input = await source.open();
    final output = await partial.open(mode: FileMode.write);
    try {
      final length = await input.length();
      var offset = 0;
      while (offset < length) {
        final bytes = await input.read((length - offset).clamp(0, 1024 * 1024));
        if (bytes.isEmpty) {
          throw const FileSystemException('Media copy ended early');
        }
        await output.writeFrom(bytes);
        offset += bytes.length;
      }
      await output.flush();
    } finally {
      await input.close();
      await output.close();
    }
    await partial.rename(destination.path);
  }

  Future<void> _waitForReadableSource(File source) async {
    for (var attempt = 0; attempt < 25; attempt++) {
      try {
        if (await source.exists() && await source.length() > 0) return;
      } on FileSystemException {
        // The camera provider is still completing its cache hand-off.
      }
      await Future<void>.delayed(const Duration(milliseconds: 200));
    }
    throw StateError(
      'The camera has not finished saving this video. Keep Kivilo open and retry.',
    );
  }
}

/// Creates a complete upload file beside the retained original. Reconciliation uses
/// the same operation, and a partial output is never mistaken for a finished JPEG.
Future<void> _prepareCameraPhoto(String path) async {
  final original = File('$path.original');
  final bytes = await original.readAsBytes();
  final decoder = image.JpegDecoder();
  final info = decoder.startDecode(bytes);
  if (info == null) throw StateError('The camera photo could not be read.');
  final edge = evidencePhotoEdge.toInt();
  var uploadBytes = bytes;
  if (info.width > edge || info.height > edge) {
    // The JPEG decoder applies EXIF orientation; use its upright dimensions so a
    // portrait shot and any marks drawn on it keep the same aspect and rotation.
    final decoded = decoder.decodeFrame(0);
    if (decoded == null) throw StateError('The camera photo could not be read.');
    final resized = image.copyResize(
      decoded,
      width: decoded.width >= decoded.height ? edge : null,
      height: decoded.height > decoded.width ? edge : null,
      interpolation: image.Interpolation.average,
    );
    uploadBytes = image.encodeJpg(resized, quality: evidencePhotoQuality);
  }
  // Photos already within the cap keep their exact bytes, avoiding another lossy
  // encode on Android. Both variants remain on the phone until upload succeeds.
  final partial = File('$path.partial');
  await partial.writeAsBytes(uploadBytes, flush: true);
  await partial.rename(path);
}
