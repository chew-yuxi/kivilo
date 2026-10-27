import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/report.dart';
import 'addendum_photos.dart' show photoMimeType;
import 'api.dart';
import 'capture_backend.dart';
import 'capture_queue.dart';
import 'capture_store.dart';
import 'uploader.dart';

class FindingEvidence {
  const FindingEvidence({
    required this.id,
    this.url,
    this.posterUrl,
    this.localPath,
    this.note,
    this.annotations,
    this.awaitingMarkup = false,
    this.pending = false,
    this.removing = false,
    this.error,
    this.progress,
    this.saved = false,
  });
  final String id;
  final String? url;
  /// The photo resized to 640px, for tiles. Null until the server has made it.
  final String? posterUrl;
  final String? localPath;
  final String? note;
  final Map<String, dynamic>? annotations;
  final bool awaitingMarkup;
  final bool pending;
  final bool removing;
  final String? error;
  final double? progress;
  final bool saved;
}

/// A recoverable finding draft. The selected line and form live beside the stable
/// photo draft id; original bytes live in CaptureStore, never in the form cache.
class FindingPhotos extends ChangeNotifier {
  FindingPhotos({
    required this.api,
    required this.inspectionId,
    this.findingId,
    Directory? root,
    String? ownerId,
    CaptureQueue? queue,
    ImagePicker? picker,
    CaptureBackend? backend,
    this.savedPhotos = const [],
    String? Function()? currentOwner,
    // Public injection names keep tests and callers independent of private fields.
    // ignore: prefer_initializing_formals
  }) : _root = root,
       _owner = ownerId,
       _queue = queue,
       _ownsQueue = queue == null,
       _usesInjectedPicker = picker != null,
       _picker = picker ?? ImagePicker(),
       // ignore: prefer_initializing_formals
       _backend = backend,
       _currentOwner =
           currentOwner ??
           (ownerId == null
               ? () => Supabase.instance.client.auth.currentUser?.id
               : () => ownerId);

  final Api api;
  final String inspectionId;
  final String? findingId;
  final List<ReportPhoto> savedPhotos;
  Directory? _root;
  String? _owner;
  CaptureQueue? _queue;
  final bool _ownsQueue;
  final bool _usesInjectedPicker;
  final ImagePicker _picker;
  final CaptureBackend? _backend;
  final String? Function() _currentOwner;
  Map<String, dynamic>? submittedForm;
  String? claimedFindingId;
  List<String> _unresolved = [];
  late String draftId;
  Map<String, dynamic> form = {};
  String? error;
  bool ready = false;
  bool claimed = false;
  bool busy = false;
  bool _disposed = false;
  List<PendingCapture> _pending = [];
  final Map<String, PendingCapture> _handingOver = {};
  List<Map<String, dynamic>> _registered = [];
  List<PendingRemoteEdit> _edits = [];
  final Map<String, double?> _progress = {};
  StreamSubscription<List<PendingCapture>>? _subscription;
  StreamSubscription<EvidenceSyncUpdate>? _syncSubscription;
  Timer? _retryTimer;
  Future<void> _writes = Future.value();
  Future<void> _initializationFinished = Future.value();
  Uploader? _uploader;
  bool _refreshing = false;
  Future<void>? _retrying;
  final Map<String, FindingEvidence> _savedOverrides = {};
  final Set<String> _removed = {};

  String get namespace =>
      'finding-draft:$inspectionId:$draftId${findingId == null ? '' : ':$findingId'}';
  bool get usesInjectedPicker => _usesInjectedPicker;
  String get savedNamespace => 'finding:$inspectionId:$findingId';
  Directory get root => _root!;
  String get ownerId => _owner!;
  CaptureQueue get queue => _queue!;
  String get _key =>
      base64Url.encode(utf8.encode('$inspectionId:${findingId ?? 'new'}'));
  File get _file => File('${root.path}/finding-drafts/$ownerId/$_key.json');
  File get _pickerFile => File('${root.path}/finding-picker.json');

  void _changed() {
    if (!_disposed) notifyListeners();
  }

  void assertOwner() {
    if (_currentOwner() != _owner) {
      throw const ApiFailure('Account changed. Open this page again.', 401);
    }
  }

  Future<void> initialize() async {
    final finished = Completer<void>();
    _initializationFinished = finished.future;
    try {
      await _initialize();
    } finally {
      finished.complete();
    }
  }

  Future<void> _initialize() async {
    _root ??= await getApplicationSupportDirectory();
    _owner ??= Supabase.instance.client.auth.currentUser?.id;
    if (_owner == null) {
      throw const ApiFailure(
        'Sign in again before adding finding photos.',
        null,
      );
    }
    assertOwner();
    _queue ??= CaptureQueue();
    if (await _file.exists()) {
      final data =
          jsonDecode(await _file.readAsString()) as Map<String, dynamic>;
      draftId = data['draftId'] as String;
      form = data['form'] as Map<String, dynamic>;
      submittedForm = data['submittedForm'] as Map<String, dynamic>?;
    } else {
      draftId = newCaptureId();
      await persistForm({});
    }
    _uploader = Uploader(
      queue: queue,
      root: root,
      ownerId: ownerId,
      backend: _backend ?? RoutingEvidenceBackend(api.dio),
    );
    _unresolved = await CaptureStore(
      queue: queue,
      root: root,
    ).reconcile(ownerId, roomId: draftId);
    if (_unresolved.isNotEmpty) {
      error =
          'A photo is still being saved on this phone. Keep this draft and retry.';
    }
    try {
      await _recoverPicker();
    } catch (failure) {
      // Keep the picker journal and open the draft so Retry and Discard remain
      // available even if a camera provider has not made its file readable yet.
      error = plainError(failure);
    }
    _pending = await queue.forRoom(draftId, ownerId);
    if (_disposed) return;
    _subscription = queue.watch(draftId, ownerId: ownerId).listen((rows) {
      for (final row in _pending) {
        if (!rows.any((current) => current.clientId == row.clientId) &&
            !row.deleteRequested) {
          _handingOver[row.clientId!] = row;
        }
      }
      _pending = rows;
      _changed();
      if (ready) unawaited(_refreshVisible());
    });
    _syncSubscription = evidenceSyncUpdates.listen((event) {
      if (_pending.any((row) => row.clientId == event.clientId)) {
        _progress[event.clientId] = event.progress;
        _changed();
      }
    });
    ready = true;
    _changed();
    await _refreshVisible();
    if (_disposed) return;
    _retryTimer = Timer.periodic(
      const Duration(seconds: 15),
      (_) => unawaited(retry()),
    );
    unawaited(retry());
  }

  Future<void> persistForm(Map<String, dynamic> value) {
    form = Map.of(value);
    final snapshot = {
      'draftId': draftId,
      'form': Map.of(value),
      'submittedForm': submittedForm,
    };
    Future<void> write() async {
      await _file.parent.create(recursive: true);
      final temp = File('${_file.path}.tmp');
      await temp.writeAsString(jsonEncode(snapshot), flush: true);
      await temp.rename(_file.path);
    }

    final result = _writes.then(
      (_) => write(),
      onError: (Object _, StackTrace _) => write(),
    );
    _writes = result;
    return result;
  }

  Future<void> _refreshVisible() async {
    if (_disposed || _refreshing) return;
    _refreshing = true;
    try {
      assertOwner();
      final data = await api.findingPhotoDraft(
        inspectionId,
        draftId,
        ownerId: ownerId,
      );
      assertOwner();
      claimed = data['state'] == 'CLAIMED';
      claimedFindingId = data['findingId'] as String?;
      if (data['state'] == 'DISCARDED') {
        throw const ApiFailure(
          'This photo draft was discarded. Discard the local draft to start again.',
          null,
        );
      }
      _registered = (data['photos'] as List<dynamic>)
          .cast<Map<String, dynamic>>();
      for (final photo in _registered) {
        _handingOver.remove(photo['id']);
      }
      if (!_disposed) await _loadEdits();
    } catch (failure) {
      error = plainError(failure);
    } finally {
      _refreshing = false;
      _changed();
    }
  }

  Future<void> _loadEdits() async {
    _edits = [
      ...await queue.remoteEditsFor(ownerId, namespace),
      if (findingId != null)
        ...await queue.remoteEditsFor(ownerId, savedNamespace),
    ];
  }

  List<FindingEvidence> get evidence {
    final result = <String, FindingEvidence>{};
    for (final photo in savedPhotos) {
      result[photo.id] = FindingEvidence(
        id: photo.id,
        url: photo.url,
        posterUrl: photo.posterUrl,
        note: photo.note,
        annotations: photo.annotations,
        saved: true,
      );
    }
    for (final photo in _registered) {
      result[photo['id'] as String] = FindingEvidence(
        id: photo['id'] as String,
        url: photo['url'] as String?,
        posterUrl: photo['posterUrl'] as String?,
        note: photo['note'] as String?,
        annotations: photo['annotations'] as Map<String, dynamic>?,
        pending: photo['registeredAt'] == null,
      );
    }
    result.addAll(_savedOverrides);
    for (final id in _removed) {
      result.remove(id);
    }
    for (final row in [..._handingOver.values, ..._pending]) {
      result[row.clientId!] = FindingEvidence(
        id: row.clientId!,
        localPath: '${root.path}/${row.relativePath}',
        note: row.note,
        url: result[row.clientId!]?.url,
        posterUrl: result[row.clientId!]?.posterUrl,
        annotations: row.annotations == null
            ? null
            : jsonDecode(row.annotations!) as Map<String, dynamic>,
        awaitingMarkup: row.awaitingMarkup,
        pending: true,
        removing: row.deleteRequested,
        error: row.lastError,
        progress: _progress[row.clientId],
      );
    }
    for (final edit in _edits) {
      final photo = result[edit.captureId];
      if (photo == null) continue;
      result[photo.id] = FindingEvidence(
        id: photo.id,
        url: photo.url,
        posterUrl: photo.posterUrl,
        note: edit.hasNote ? edit.note : photo.note,
        annotations: edit.hasAnnotations
            ? edit.annotations == null
                  ? null
                  : jsonDecode(edit.annotations!) as Map<String, dynamic>
            : photo.annotations,
        saved: photo.saved,
        pending: true,
        removing: edit.deleteRequested,
        error: edit.lastError,
      );
    }
    return result.values.toList();
  }

  Future<void> _writePicker(Map<String, dynamic> data) async {
    final temp = File('${_pickerFile.path}.tmp');
    await temp.writeAsString(jsonEncode(data), flush: true);
    await temp.rename(_pickerFile.path);
  }

  Future<List<String>> pick(ImageSource source) async {
    assertOwner();
    if (claimed) {
      throw const ApiFailure(
        'This finding was saved. Reopen it to add more photos.',
        null,
      );
    }
    if (busy) return [];
    busy = true;
    _changed();
    try {
      await _writes;
      if (await _pickerFile.exists() ||
          await File('${root.path}/capture-picker.json').exists() ||
          await File(
            '${root.path}/$supportingDocumentPickerFilename',
          ).exists()) {
        throw const ApiFailure(
          'Finish recovering the previous camera selection before taking another photo.',
          null,
        );
      }
      final intent = {
        'ownerId': ownerId,
        'inspectionId': inspectionId,
        'draftId': draftId,
      };
      await _writePicker(intent);
      final files = source == ImageSource.camera
          ? [
              await _picker.pickImage(
                source: source,
                maxWidth: evidencePhotoEdge,
                maxHeight: evidencePhotoEdge,
                imageQuality: evidencePhotoQuality,
                requestFullMetadata: false,
              ),
            ].whereType<XFile>().toList()
          : await _picker.pickMultiImage(
              maxWidth: evidencePhotoEdge,
              maxHeight: evidencePhotoEdge,
              imageQuality: evidencePhotoQuality,
              requestFullMetadata: false,
            );
      final ids = await _persistPicked(intent, files);
      assertOwner();
      return ids;
    } finally {
      busy = false;
      _changed();
    }
  }

  Future<List<String>> _persistPicked(
    Map<String, dynamic> intent,
    List<XFile> files,
  ) async {
    // Journal every returned temporary path before reading or validating any file.
    // A failure on the second selection must not lose the first original on iOS.
    final selected = files
        .map(
          (file) => <String, dynamic>{
            'path': file.path,
            'clientId': newCaptureId(),
          },
        )
        .toList();
    await _writePicker({...intent, 'files': selected});
    return _storePickerFiles(intent, selected);
  }

  Future<List<String>> _storePickerFiles(
    Map<String, dynamic> intent,
    List<Map<String, dynamic>> files,
  ) async {
    final ids = <String>[];
    for (final file in files) {
      final mime =
          file['mimeType'] as String? ??
          await photoMimeType(File(file['path'] as String));
      if (mime == null) {
        throw const ApiFailure(
          'Choose a JPEG, PNG or WebP photo. Your selection is kept; retry or discard this draft.',
          null,
        );
      }
      file['mimeType'] = mime;
      await _writePicker({...intent, 'files': files});
      final id = file['clientId'] as String;
      await CaptureStore(queue: queue, root: root).save(
        source: File(file['path'] as String),
        ownerId: ownerId,
        inspectionId: namespace,
        roomId: draftId,
        kind: 'PHOTO',
        extension: mime == 'image/png'
            ? 'png'
            : mime == 'image/webp'
            ? 'webp'
            : 'jpg',
        mimeType: mime,
        clientId: id,
        awaitingMarkup: true,
      );
      ids.add(id);
    }
    await _pickerFile.delete();
    _pending = await queue.forRoom(draftId, ownerId);
    _changed();
    return ids;
  }

  Future<void> _recoverPicker() async {
    if (!await _pickerFile.exists()) return;
    final intent =
        jsonDecode(await _pickerFile.readAsString()) as Map<String, dynamic>;
    if (intent['ownerId'] != ownerId ||
        intent['draftId'] != draftId ||
        intent['inspectionId'] != inspectionId) {
      return;
    }
    if (intent['files'] != null) {
      await _storePickerFiles(
        intent,
        (intent['files'] as List<dynamic>).cast<Map<String, dynamic>>(),
      );
    } else if (Platform.isAndroid) {
      final lost = await _picker.retrieveLostData();
      if (lost.exception != null) throw lost.exception!;
      await _persistPicked(intent, lost.files ?? const []);
    } else {
      // iOS does not support retrieveLostData. The picker never returned bytes.
      await _pickerFile.delete();
    }
  }

  Future<void> setAnnotations(
    String id,
    Map<String, dynamic>? annotations,
  ) async {
    assertOwner();
    final encoded = annotations == null ? null : jsonEncode(annotations);
    final row = await queue.byClientId(id);
    if (row != null) {
      if (row.ownerId != ownerId || row.inspectionId != namespace) {
        throw StateError('Photo belongs to another draft.');
      }
      await queue.setAnnotations(row.id, encoded);
    } else {
      final saved = savedPhotos.any((photo) => photo.id == id);
      await queue.queueRemoteAnnotations(
        ownerId,
        saved ? savedNamespace : namespace,
        id,
        encoded,
      );
      if (saved) {
        final photo = evidence.firstWhere((photo) => photo.id == id);
        _savedOverrides[id] = FindingEvidence(
          id: id,
          url: photo.url,
          note: photo.note,
          annotations: annotations,
          saved: true,
        );
      }
    }
    await _loadEdits();
    _pending = await queue.forRoom(draftId, ownerId);
    _changed();
  }

  Future<void> finishMarkup(String id) async {
    assertOwner();
    final row = await queue.byClientId(id);
    if (row != null) {
      _validate(row);
      await queue.finishMarkup(row.id);
    }
    await retry();
  }

  Future<void> setNote(String id, String? note) async {
    assertOwner();
    final row = await queue.byClientId(id);
    if (row != null) {
      _validate(row);
      await queue.setNote(row.id, note);
    } else {
      final saved = savedPhotos.any((photo) => photo.id == id);
      await queue.queueRemoteNote(
        ownerId,
        saved ? savedNamespace : namespace,
        id,
        note,
      );
      if (saved) {
        final photo = evidence.firstWhere((photo) => photo.id == id);
        _savedOverrides[id] = FindingEvidence(
          id: id,
          url: photo.url,
          note: note,
          annotations: photo.annotations,
          saved: true,
        );
      }
    }
    await _loadEdits();
    _changed();
    unawaited(retry());
  }

  Future<void> remove(String id) async {
    assertOwner();
    final row = await queue.byClientId(id);
    if (row != null) {
      _validate(row);
      await queue.requestDelete(row.id);
    } else {
      await queue.queueRemoteDelete(
        ownerId,
        savedPhotos.any((photo) => photo.id == id) ? savedNamespace : namespace,
        id,
      );
    }
    _removed.add(id);
    await _loadEdits();
    _changed();
    await retry();
  }

  void _validate(PendingCapture row) {
    if (row.ownerId != ownerId || row.inspectionId != namespace) {
      throw StateError('Photo belongs to another draft.');
    }
  }

  Future<void> retry() async {
    if (!ready || _disposed) return;
    if (_retrying != null) return _retrying;
    final operation = _retry();
    _retrying = operation;
    try {
      await operation;
    } finally {
      _retrying = null;
    }
  }

  Future<void> _retry() async {
    try {
      assertOwner();
      error = null;
      if (!busy) await _recoverPicker();
      _unresolved = await CaptureStore(
        queue: queue,
        root: root,
      ).reconcile(ownerId, roomId: draftId);
      if (_disposed) return;
      if (_unresolved.isNotEmpty) {
        throw const ApiFailure(
          'A photo is still being saved on this phone. Keep this draft and retry.',
          null,
        );
      }
      await _uploader!.drain();
      _pending = await queue.forRoom(draftId, ownerId);
      if (_disposed) return;
      await _loadEdits();
      await _refreshVisible();
    } catch (failure) {
      error = plainError(failure);
      _changed();
    }
  }

  Future<void> ensureReady() async {
    assertOwner();
    await _writes;
    _unresolved = await CaptureStore(
      queue: queue,
      root: root,
    ).reconcile(ownerId, roomId: draftId);
    final picker = await _pickerFile.exists()
        ? jsonDecode(await _pickerFile.readAsString()) as Map<String, dynamic>
        : null;
    if (_unresolved.isNotEmpty ||
        (picker?['ownerId'] == ownerId && picker?['draftId'] == draftId)) {
      throw const ApiFailure(
        'A photo selection still needs recovery. Retry or discard this draft before saving.',
        null,
      );
    }
    if (!ready || busy) {
      throw const ApiFailure(
        'Wait until your photos are saved on this phone.',
        null,
      );
    }
    await retry();
    assertOwner();
    final pending = await queue.pendingForInspection(namespace, ownerId);
    final saved = findingId == null
        ? null
        : await queue.pendingForInspection(savedNamespace, ownerId);
    if (pending.captures +
                pending.edits +
                (saved?.captures ?? 0) +
                (saved?.edits ?? 0) >
            0 ||
        _registered.any((photo) => photo['registeredAt'] == null)) {
      throw const ApiFailure(
        'Finish marking and uploading the finding photos before saving. Your draft is kept on this phone.',
        null,
      );
    }
  }

  static Future<bool> hasUnfinishedPhotos(
    String inspectionId,
    String ownerId,
  ) async {
    final directory = await getApplicationSupportDirectory();
    final queue = CaptureQueue();
    try {
      if (await queue.pendingForFindings(inspectionId, ownerId) > 0) {
        return true;
      }
      final picker = File('${directory.path}/finding-picker.json');
      if (await picker.exists()) {
        final intent =
            jsonDecode(await picker.readAsString()) as Map<String, dynamic>;
        if (intent['ownerId'] == ownerId &&
            intent['inspectionId'] == inspectionId) {
          return true;
        }
      }
      final intake = Directory('${directory.path}/capture-intake');
      if (await intake.exists()) {
        await for (final file in intake.list()) {
          if (file is! File || !file.path.endsWith('.json')) continue;
          final intent =
              jsonDecode(await file.readAsString()) as Map<String, dynamic>;
          if (intent['ownerId'] == ownerId &&
              (intent['inspectionId'] as String).startsWith(
                'finding-draft:$inspectionId:',
              )) {
            return true;
          }
        }
      }
      return false;
    } finally {
      await queue.close();
    }
  }

  Future<void> prepareSubmission() async {
    assertOwner();
    submittedForm = Map.of(form);
    await persistForm(form);
  }

  Future<void> complete() async {
    await _writes;
    if (await _file.exists()) await _file.delete();
  }

  Future<void> discard() async {
    assertOwner();
    await _writes;
    for (final row in await queue.forRoom(draftId, ownerId)) {
      _validate(row);
      await queue.requestDelete(row.id);
    }
    // Discard must remain possible even when an intake file cannot be recovered.
    // Only already queued captures need their upload/delete hand-over first.
    if (_retrying != null) await _retrying;
    await _uploader!.drain();
    final pending = await queue.pendingForInspection(namespace, ownerId);
    if (pending.captures + pending.edits > 0) {
      throw const ApiFailure(
        'Connect and retry discarding. Your photos and draft are still saved on this phone.',
        null,
      );
    }
    await api.discardFindingPhotoDraft(inspectionId, draftId, ownerId: ownerId);
    assertOwner();
    final intake = Directory('${root.path}/capture-intake');
    if (await intake.exists()) {
      await for (final file in intake.list()) {
        if (file is! File || !file.path.endsWith('.json')) continue;
        final intent =
            jsonDecode(await file.readAsString()) as Map<String, dynamic>;
        if (intent['ownerId'] != ownerId ||
            intent['inspectionId'] != namespace ||
            intent['roomId'] != draftId) {
          continue;
        }
        final original = File('${root.path}/${intent['relativePath']}');
        if (await original.exists()) await original.delete();
        await file.delete();
      }
    }
    if (await _pickerFile.exists()) {
      final intent =
          jsonDecode(await _pickerFile.readAsString()) as Map<String, dynamic>;
      if (intent['ownerId'] == ownerId && intent['draftId'] == draftId) {
        await _pickerFile.delete();
      }
    }
    await complete();
  }

  @override
  void dispose() {
    _disposed = true;
    _retryTimer?.cancel();
    unawaited(_subscription?.cancel());
    unawaited(_syncSubscription?.cancel());
    // A foreground transfer may still be using this connection. Close only after it
    // relinquishes its lease; the app-wide uploader will carry later retries.
    if (_ownsQueue) {
      unawaited(
        Future.wait([
          _initializationFinished,
          _retrying ?? Future<void>.value(),
        ]).then((_) => _queue?.close()),
      );
    }
    super.dispose();
  }
}
