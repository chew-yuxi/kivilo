import 'dart:convert';
import 'dart:io';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/evidence_photo_intake.dart';

class _Picker extends ImagePicker {
  _Picker(this.files);
  final List<XFile> files;
  var recoveryCalls = 0;
  @override
  Future<List<XFile>> pickMultiImage({
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    int? limit,
    bool requestFullMetadata = true,
  }) async => files;
  @override
  Future<LostDataResponse> retrieveLostData() async {
    recoveryCalls++;
    return LostDataResponse(files: files, type: RetrieveType.image);
  }
}

void main() {
  late CaptureQueue queue;
  late Directory root;
  late _Picker picker;
  const bytes = [0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4];

  setUp(() {
    queue = CaptureQueue(NativeDatabase.memory());
    root = Directory.systemTemp.createTempSync('evidence-intake-');
    picker = _Picker([
      for (var index = 0; index < 3; index++)
        XFile(
          (File(
            '${root.path}/photo-$index.heic',
          )..writeAsBytesSync(bytes)).path,
        ),
    ]);
  });
  tearDown(() async {
    await queue.close();
    root.deleteSync(recursive: true);
  });

  EvidencePhotoIntake intake({
    String owner = 'agent',
    String target = 'entry',
    String domain = 'addendum:update',
  }) => EvidencePhotoIntake(
    queue: queue,
    root: root,
    picker: picker,
    ownerId: owner,
    queueOwner: domain,
    targetId: target,
    kind: 'PHOTO',
    recoverAndroid: true,
  );

  test(
    'entire selection is durable and held with detected MIME before editing',
    () async {
      final ids = await intake().pick(ImageSource.gallery);
      expect(ids, hasLength(3));
      for (final id in ids) {
        final row = (await queue.byId(id))!;
        expect(row.ownerId, 'agent');
        expect(row.inspectionId, 'addendum:update');
        expect(row.roomId, 'entry');
        expect(row.mimeType, 'image/jpeg');
        expect(row.filename, endsWith('.jpg'));
        expect(row.awaitingMarkup, isTrue);
        expect(
          File('${root.path}/${row.relativePath}').readAsBytesSync(),
          bytes,
        );
      }
      expect(await queue.claimNext(DateTime.now(), ownerId: 'agent'), isNull);
      expect(await intake().journal.exists(), isFalse);
    },
  );

  test(
    'other account, target and room flow cannot consume global picker recovery',
    () async {
      final journal = intake().journal;
      Map<String, dynamic> intent({String? flow = 'evidence'}) => {
        'flow': flow,
        'ownerId': 'agent',
        'inspectionId': 'addendum:update',
        'roomId': 'entry',
        'kind': 'PHOTO',
      };
      await journal.writeAsString(jsonEncode(intent()));
      expect(await intake(owner: 'other').recover(), isEmpty);
      expect(await intake(target: 'different').recover(), isEmpty);
      expect(await intake(domain: 'maintenance:case').recover(), isEmpty);
      await journal.writeAsString(jsonEncode(intent(flow: null)));
      expect(await intake().recover(), isEmpty);
      expect(picker.recoveryCalls, 0);
      expect(await journal.exists(), isTrue);
      await expectLater(
        intake().pick(ImageSource.gallery),
        throwsA(isA<Exception>()),
      );
      expect(picker.recoveryCalls, 0);
    },
  );

  test(
    'process restart imports the original batch once into its original target',
    () async {
      await intake().journal.writeAsString(
        jsonEncode({
          'flow': 'evidence',
          'ownerId': 'agent',
          'inspectionId': 'addendum:update',
          'roomId': 'entry',
          'kind': 'PHOTO',
          'files': [
            for (var i = 0; i < 3; i++)
              {'path': picker.files[i].path, 'clientId': 'photo-$i'},
          ],
        }),
      );
      expect(await intake(target: 'wrong').recover(), isEmpty);
      final recovered = await intake().recover();
      expect(recovered, hasLength(3));
      expect(await intake().recover(), isEmpty);
      expect(await queue.forRoom('entry', 'agent'), hasLength(3));
      expect(await queue.forRoom('wrong', 'agent'), isEmpty);
      expect(picker.recoveryCalls, 0);
    },
  );

  test(
    'recovery after source move does not need the original picker path',
    () async {
      const clientId = 'moved-photo';
      final saved = File('${root.path}/captures/agent/$clientId.original')
        ..parent.createSync(recursive: true);
      File(picker.files.first.path).renameSync(saved.path);
      await intake().journal.writeAsString(
        jsonEncode({
          'flow': 'evidence',
          'ownerId': 'agent',
          'inspectionId': 'addendum:update',
          'roomId': 'entry',
          'kind': 'PHOTO',
          'files': [
            {
              'path': picker.files.first.path,
              'clientId': clientId,
              'mimeType': 'image/jpeg',
            },
          ],
        }),
      );
      final ids = await intake().recover();
      expect(ids, hasLength(1));
      expect((await queue.byId(ids.single))!.awaitingMarkup, isTrue);
      expect(saved.readAsBytesSync(), bytes);
    },
  );

  test(
    'unsupported original stays durable without blocking later selections',
    () async {
      const unknown = [
        0,
        0,
        0,
        24,
        0x66,
        0x74,
        0x79,
        0x70,
        0x68,
        0x65,
        0x69,
        0x63,
      ];
      File(picker.files.first.path).writeAsBytesSync(unknown);
      final ids = await intake().pick(ImageSource.gallery);
      final held = (await queue.byId(ids.first))!;
      expect(held.awaitingMarkup, isTrue);
      expect(held.mimeType, 'application/octet-stream');
      expect(held.lastError, contains('saved on your phone'));
      expect(
        File('${root.path}/${held.relativePath}').readAsBytesSync(),
        unknown,
      );
      expect(await intake().journal.exists(), isFalse);
      expect(await queue.claimNext(DateTime.now(), ownerId: 'agent'), isNull);
      picker.files.clear();
      picker.files.add(
        XFile((File('${root.path}/another.jpg')..writeAsBytesSync(bytes)).path),
      );
      expect(await intake().pick(ImageSource.gallery), hasLength(1));
      expect(await queue.byId(ids.first), isNotNull);
    },
  );
}
