import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_backend.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/finding_photos.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/finding_editor_screen.dart';
import 'package:kivilo/screens/photo_mark_screen.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _Api extends Api {
  _Api() : super(attachAuth: false, cache: ReadCache());
  final photos = <String, Map<String, dynamic>>{};
  final discarded = <String>[];
  bool claimed = false;

  @override
  Future<Map<String, dynamic>> findingPhotoDraft(
    String inspectionId,
    String draftId, {
    String? ownerId,
  }) async => {
    'state': claimed ? 'CLAIMED' : 'OPEN',
    'findingId': claimed ? 'finding-1' : null,
    'photos': photos.values
        .where((photo) => photo['draftId'] == draftId)
        .toList(),
  };

  @override
  Future<void> discardFindingPhotoDraft(
    String inspectionId,
    String draftId, {
    String? ownerId,
  }) async {
    discarded.add(draftId);
  }
}

class _Picker extends ImagePicker {
  _Picker(this.file);
  final File file;
  @override
  Future<XFile?> pickImage({
    required ImageSource source,
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
    bool requestFullMetadata = true,
  }) async => XFile(file.path);
}

class _Backend implements CaptureBackend {
  _Backend(this.api);
  final _Api api;
  bool offline = true;
  bool loseResponse = false;
  int registrations = 0;
  final originalBytes = <int>[];

  void _connected() {
    if (offline) throw const ApiFailure('No signal', null);
  }

  @override
  Future<({String storagePath, String? signedUrl, bool alreadyUploaded})>
  uploadUrl(
    String inspectionId,
    String roomId,
    String filename,
    String clientId, {
    String? mimeType,
    int? sizeBytes,
  }) async {
    _connected();
    return (
      storagePath: 'findings/$roomId/$clientId.png',
      signedUrl: 'https://storage.test/upload',
      alreadyUploaded: false,
    );
  }

  @override
  Future<void> putBytes(
    String signedUrl,
    File file,
    String mimeType,
    String clientId,
  ) async {
    _connected();
    originalBytes
      ..clear()
      ..addAll(await file.readAsBytes());
  }

  @override
  Future<({String id, bool annotationsApplied, bool itemApplied})>
  registerCapture({
    required String inspectionId,
    required String roomId,
    required String kind,
    required String storagePath,
    required String clientId,
    required String mimeType,
    required int sizeBytes,
    int? durationSec,
    String? itemId,
    String? note,
    Map<String, dynamic>? annotations,
  }) async {
    _connected();
    api.photos.putIfAbsent(clientId, () {
      registrations++;
      return {
        'id': clientId,
        'draftId': roomId,
        'registeredAt': '2026-10-21T08:00:00Z',
        'url': 'https://storage.test/$clientId',
        'note': note,
        'annotations': annotations,
      };
    });
    if (loseResponse) {
      loseResponse = false;
      throw const ApiFailure('Response lost', null);
    }
    return (id: clientId, annotationsApplied: true, itemApplied: true);
  }

  @override
  Future<void> annotate(
    String inspectionId,
    String captureId,
    Map<String, dynamic>? annotations,
  ) async {
    _connected();
    api.photos[captureId]!['annotations'] = annotations;
  }

  @override
  Future<void> updateNote(
    String inspectionId,
    String captureId,
    String? note,
  ) async {
    _connected();
    api.photos[captureId]!['note'] = note;
  }

  @override
  Future<void> deleteCapture(String inspectionId, String captureId) async {
    _connected();
    api.photos.remove(captureId);
  }
}

const _marks = {
  'w': 640,
  'h': 480,
  'marks': [
    {
      'shape': 'ring',
      'cx': 0.4,
      'cy': 0.5,
      'rx': 0.1,
      'ry': 0.15,
      'note': 'Fresh chip',
    },
  ],
};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory root;
  late CaptureQueue queue;
  late _Api api;
  late _Backend backend;
  late File camera;
  final sessions = <FindingPhotos>[];

  setUp(() async {
    root = Directory.systemTemp.createTempSync('kivilo-finding-photos-');
    queue = CaptureQueue(NativeDatabase.memory());
    api = _Api();
    backend = _Backend(api);
    final recorder = ui.PictureRecorder();
    ui.Canvas(recorder).drawColor(Colors.white, ui.BlendMode.src);
    final picture = recorder.endRecording();
    final image = await picture.toImage(640, 480);
    final png = (await image.toByteData(
      format: ui.ImageByteFormat.png,
    ))!.buffer.asUint8List();
    image.dispose();
    picture.dispose();
    camera = File('${root.path}/camera.png')..writeAsBytesSync(png);
  });
  tearDown(() async {
    for (final session in sessions) {
      await session.retry();
      session.dispose();
    }
    sessions.clear();
    await queue.close();
    root.deleteSync(recursive: true);
  });

  FindingPhotos open({String owner = 'owner-1'}) {
    final session = FindingPhotos(
      api: api,
      inspectionId: 'checkout-1',
      root: root,
      ownerId: owner,
      queue: queue,
      picker: _Picker(camera),
      backend: backend,
    );
    sessions.add(session);
    return session;
  }

  test('finding camera leaves an interrupted document selection untouched', () async {
    final journal = File('${root.path}/$supportingDocumentPickerFilename');
    await journal.writeAsString(jsonEncode({
      'ownerId': 'owner-1', 'tenancyId': 'tenancy-1', 'requestId': 'request-original',
      'clientId': newCaptureId(),
    }));
    final session = open();
    await session.initialize();
    await expectLater(session.pick(ImageSource.camera), throwsA(isA<ApiFailure>()));
    expect(await queue.forRoom(session.draftId, 'owner-1'), isEmpty);
    expect(await journal.exists(), isTrue);
  });

  test(
    'photo and marks recover across restart and a lost registration response',
    () async {
      final bytes = camera.readAsBytesSync();
      final first = open();
      await first.initialize();
      await first.persistForm({
        'itemId': 'worktop-1',
        'rationale': 'Fresh chip',
        'verdict': 'UNDECIDED',
      });
      final id = (await first.pick(ImageSource.camera)).single;
      await first.setAnnotations(id, _marks);
      final held = (await queue.forRoom(first.draftId, 'owner-1')).single;
      expect(held.awaitingMarkup, isTrue);
      expect(
        await File('${root.path}/${held.relativePath}').readAsBytes(),
        bytes,
      );
      await expectLater(first.ensureReady(), throwsA(isA<ApiFailure>()));
      final draftId = first.draftId;
      first.dispose();
      sessions.remove(first);

      final restored = open();
      await restored.initialize();
      expect(restored.draftId, draftId);
      expect(restored.form, {
        'itemId': 'worktop-1',
        'rationale': 'Fresh chip',
        'verdict': 'UNDECIDED',
      });
      expect(restored.evidence.single.annotations, _marks);
      expect(restored.evidence.single.awaitingMarkup, isTrue);
      await restored.finishMarkup(id);
      final waiting = (await queue.forRoom(draftId, 'owner-1')).single;
      expect(waiting.awaitingMarkup, isFalse);
      expect(
        await File('${root.path}/${waiting.relativePath}').readAsBytes(),
        bytes,
      );
      // Let initialize's background drain relinquish its lease before the explicit
      // network retry. The UI may safely retry while that drain is already running.
      await Future<void>.delayed(const Duration(milliseconds: 20));
      backend
        ..offline = false
        ..loseResponse = true;
      await restored.retry();
      expect(await queue.forRoom(draftId, 'owner-1'), hasLength(1));
      await restored.retry();
      await restored.ensureReady();
      expect(await queue.forRoom(draftId, 'owner-1'), isEmpty);
      expect(backend.registrations, 1);
      expect(backend.originalBytes, bytes);
      expect(restored.evidence.single.id, id);
      expect(restored.evidence.single.annotations, _marks);
    },
  );

  test(
    'another account cannot inherit the selected item, draft or local photos',
    () async {
      final first = open();
      await first.initialize();
      await first.persistForm({
        'itemId': 'worktop-1',
        'rationale': 'Private draft',
      });
      await first.pick(ImageSource.camera);
      final second = open(owner: 'owner-2');
      await second.initialize();
      expect(second.draftId, isNot(first.draftId));
      expect(second.form, isEmpty);
      expect(second.evidence, isEmpty);
      expect(first.evidence, hasLength(1));
    },
  );

  test(
    'an unresolved camera intake blocks Save without losing the draft',
    () async {
      final first = open();
      await first.initialize();
      await first.persistForm({
        'selectedId': 'worktop-1',
        'rationale': 'Fresh chip',
      });
      final draftId = first.draftId;
      final namespace = first.namespace;
      first.dispose();
      sessions.remove(first);
      final journal = File('${root.path}/capture-intake/missing-photo.json');
      await journal.parent.create(recursive: true);
      await journal.writeAsString(
        jsonEncode({
          'clientId': 'missing-photo',
          'ownerId': 'owner-1',
          'inspectionId': namespace,
          'roomId': draftId,
          'relativePath': 'captures/owner-1/missing-photo.png',
          'sourcePath': '${root.path}/camera-file-not-yet-readable.png',
        }),
      );
      final restored = open();
      await restored.initialize();
      await expectLater(restored.ensureReady(), throwsA(isA<ApiFailure>()));
      expect(restored.form['selectedId'], 'worktop-1');
      expect(await journal.exists(), isTrue);
      expect(await queue.forRoom(draftId, 'owner-1'), isEmpty);
      await restored.discard();
      expect(api.discarded, [draftId]);
      expect(await journal.exists(), isFalse);
      final fresh = open();
      await fresh.initialize();
      expect(fresh.draftId, isNot(draftId));
      expect(fresh.form, isEmpty);
    },
  );

  testWidgets(
    'choose item, take and mark photo, then save keeps failed drafts retryable',
    (tester) async {
      tester.view.physicalSize = const Size(393, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final session = open();
      sessions.remove(session); // The editor owns and disposes this session.
      final saves = <Map<String, dynamic>>[];
      Future<void> settle() async {
        for (var i = 0; i < 4; i++) {
          await tester.runAsync(
            () => Future<void>.delayed(const Duration(milliseconds: 30)),
          );
          await tester.pump(const Duration(milliseconds: 150));
        }
      }

      Future<void> tap(String text) async {
        final labelledButtons = find.ancestor(
          of: find.text(text),
          matching: find.byWidgetPredicate((w) => w is ButtonStyleButton),
        );
        final target = labelledButtons.evaluate().isEmpty
            ? find.text(text).last
            : labelledButtons.last;
        for (var i = 0; i < 30; i++) {
          final widget = tester.widget(target);
          if (widget is! ButtonStyleButton || widget.onPressed != null) break;
          await settle();
        }
        await tester.ensureVisible(target);
        await tester.pump();
        await tester.runAsync(() async {
          await tester.tap(target);
          await tester.pump();
        });
        await settle();
      }

      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: Builder(
            builder: (context) => Scaffold(
              body: FilledButton(
                onPressed: () => Navigator.of(context).push<void>(
                  MaterialPageRoute(
                    builder: (_) => FindingEditorScreen(
                      photoSession: session,
                      maintenanceHistory: const [],
                      checkOutItems: ComparableItem.listFromJson([
                        {'id': 'worktop-1', 'label': 'Kitchen · Worktop'},
                      ]),
                      onSave: (body) async {
                        saves.add(body);
                        if (saves.length == 1) {
                          throw const ApiFailure('Could not save. Retry.', 409);
                        }
                      },
                    ),
                  ),
                ),
                child: const Text('Assessment home'),
              ),
            ),
          ),
        ),
      );
      await tap('Assessment home');
      await tap('Kitchen · Worktop');
      final rationale = find.byWidgetPredicate(
        (widget) =>
            widget is TextField && widget.decoration?.labelText == 'Rationale',
      );
      await tester.ensureVisible(rationale);
      await tester.pump();
      await tester.enterText(rationale, 'A fresh chip on the worktop edge.');
      await tap('Take photo');
      for (
        var i = 0;
        i < 30 && find.byType(PhotoMarkScreen).evaluate().isEmpty;
        i++
      ) {
        await settle();
      }
      expect(find.byType(PhotoMarkScreen), findsOneWidget);
      final held = (await tester.runAsync(
        () => queue.forRoom(session.draftId, 'owner-1'),
      ))!.single;
      expect(held.awaitingMarkup, isTrue);
      expect(backend.registrations, 0);
      final canvas = find.byWidgetPredicate(
        (widget) => widget is GestureDetector && widget.onPanStart != null,
      );
      final center = tester.getRect(canvas).center;
      final gesture = await tester.startGesture(center - const Offset(40, 40));
      await gesture.moveTo(center + const Offset(0, -20));
      await gesture.moveTo(center + const Offset(40, 40));
      await gesture.moveTo(center + const Offset(-40, 40));
      await gesture.up();
      await settle();
      await tester.enterText(find.byType(TextField), 'Fresh chip');
      await tap('Save mark');
      await tap('Save photo');
      for (
        var i = 0;
        i < 30 && find.byType(PhotoMarkScreen).evaluate().isNotEmpty;
        i++
      ) {
        await settle();
      }
      expect(find.byType(PhotoMarkScreen), findsNothing);
      await tap('Add finding');
      for (
        var i = 0;
        i < 30 &&
            find
                .textContaining('Finish marking and uploading')
                .evaluate()
                .isEmpty;
        i++
      ) {
        await settle();
      }
      expect(saves, isEmpty);
      expect(
        find.textContaining('Finish marking and uploading'),
        findsOneWidget,
      );
      backend.offline = false;
      await tester.runAsync(() => session.retry());
      await settle();
      await tap('Add finding');
      for (
        var i = 0;
        i < 30 &&
            find.textContaining('Could not save. Retry.').evaluate().isEmpty;
        i++
      ) {
        await settle();
      }
      expect(saves, hasLength(1));
      expect(find.textContaining('Could not save. Retry.'), findsOneWidget);
      final draftId = saves.single['photoDraftId'];
      await tap('Add finding');
      for (
        var i = 0;
        i < 30 && find.byType(FindingEditorScreen).evaluate().isNotEmpty;
        i++
      ) {
        await settle();
      }
      expect(saves, hasLength(2));
      expect(saves.last['photoDraftId'], draftId);
      expect(saves.last['itemId'], 'worktop-1');
      expect(saves.last['rationale'], 'A fresh chip on the worktop edge.');
      expect(
        (api.photos.values.single['annotations']['marks'] as List)
            .single['note'],
        'Fresh chip',
      );
      expect(find.byType(FindingEditorScreen), findsNothing);
      expect(find.text('Assessment home'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  test(
    'retry recovers a picker hand-over without duplicating the original',
    () async {
      final session = open();
      await session.initialize();
      final id = (await session.pick(ImageSource.camera)).single;
      await session.setAnnotations(id, _marks);
      final journal = File('${root.path}/finding-picker.json');
      await journal.writeAsString(
        jsonEncode({
          'ownerId': 'owner-1',
          'inspectionId': 'checkout-1',
          'draftId': session.draftId,
          'files': [
            {'path': camera.path, 'clientId': id, 'mimeType': 'image/png'},
          ],
        }),
      );
      expect(await camera.exists(), isFalse);
      await session.retry();
      expect(await journal.exists(), isFalse);
      expect(session.evidence, hasLength(1));
      expect(session.evidence.single.annotations, _marks);
      expect(session.evidence.single.awaitingMarkup, isTrue);
      expect(backend.registrations, 0);
    },
  );

  test(
    'switching accounts cannot edit or submit the open photo draft',
    () async {
      var currentOwner = 'owner-1';
      final session = FindingPhotos(
        api: api,
        inspectionId: 'checkout-1',
        root: root,
        ownerId: 'owner-1',
        currentOwner: () => currentOwner,
        queue: queue,
        picker: _Picker(camera),
        backend: backend,
      );
      sessions.add(session);
      await session.initialize();
      final id = (await session.pick(ImageSource.camera)).single;
      currentOwner = 'owner-2';
      await expectLater(
        session.setAnnotations(id, _marks),
        throwsA(isA<ApiFailure>()),
      );
      await expectLater(session.ensureReady(), throwsA(isA<ApiFailure>()));
      final row = (await queue.forRoom(session.draftId, 'owner-1')).single;
      expect(row.annotations, isNull);
      expect(row.awaitingMarkup, isTrue);
      expect(backend.registrations, 0);
    },
  );

  test(
    'a response-lost saved draft cannot strand new photos in its closed draft',
    () async {
      api.claimed = true;
      final session = open();
      await session.initialize();
      expect(session.claimedFindingId, 'finding-1');
      await expectLater(
        session.pick(ImageSource.camera),
        throwsA(isA<ApiFailure>()),
      );
      expect(session.evidence, isEmpty);
      expect(await camera.exists(), isTrue);
    },
  );
}
