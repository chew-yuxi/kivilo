import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/capture_backend.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/capture_store.dart';
import 'package:kivilo/services/uploader.dart';

void main() {
  const annotations = {
    'w': 100,
    'h': 100,
    'marks': [
      {
        'shape': 'ring',
        'cx': 0.5,
        'cy': 0.5,
        'rx': 0.1,
        'ry': 0.1,
        'note': 'Chip',
      },
    ],
  };
  const targets = [
    (
      owner: 'maintenance:case',
      target: 'AFTER|visit',
      path: '/api/v1/maintenance/case',
      kind: 'AFTER',
      end: 'evidence',
    ),
    (
      owner: 'addendum:update',
      target: 'entry',
      path: '/api/v1/addenda/update/entries/entry',
      kind: 'PHOTO',
      end: 'photos',
    ),
    (
      owner: 'finding:inspection',
      target: 'finding',
      path: '/api/v1/inspections/inspection/findings/finding',
      kind: 'PHOTO',
      end: 'photos',
    ),
  ];

  for (final target in targets) {
    test(
      '${target.owner} transmits photo MIME, caption and marks with real acknowledgement',
      () async {
        final requests = <RequestOptions>[];
        var acknowledge = false;
        final dio = Dio(BaseOptions(baseUrl: 'https://example.test'));
        dio.interceptors.add(
          InterceptorsWrapper(
            onRequest: (request, handler) {
              requests.add(request);
              handler.resolve(
                Response(
                  requestOptions: request,
                  statusCode: 200,
                  data: request.path.endsWith('/upload-url')
                      ? {
                          'storagePath': 'saved/photo.png',
                          'signedUrl': null,
                          'alreadyUploaded': true,
                        }
                      : {
                          'id': 'photo',
                          if (acknowledge) 'annotationsApplied': true,
                        },
                ),
              );
            },
          ),
        );
        final backend = RoutingEvidenceBackend(dio);
        await backend.uploadUrl(
          target.owner,
          target.target,
          'photo.png',
          'client',
        );
        Future<({String id, bool annotationsApplied, bool itemApplied})>
        register() => backend.registerCapture(
          inspectionId: target.owner,
          roomId: target.target,
          kind: target.kind,
          storagePath: 'saved/photo.png',
          clientId: 'client',
          mimeType: 'image/png',
          sizeBytes: 20,
          note: 'Cabinet corner',
          annotations: annotations,
        );
        expect((await register()).annotationsApplied, isFalse);
        acknowledge = true;
        expect((await register()).annotationsApplied, isTrue);
        expect(requests.first.path, '${target.path}/upload-url');
        expect(requests.first.data['mimeType'], 'image/png');
        expect(requests.last.path, '${target.path}/${target.end}');
        expect(requests.last.data['note'], 'Cabinet corner');
        expect(requests.last.data['annotations'], annotations);
      },
    );
  }

  test(
    'missing annotation acknowledgement retains local original and marks',
    () async {
      final root = Directory.systemTemp.createTempSync('evidence-ack-');
      final queue = CaptureQueue(NativeDatabase.memory());
      addTearDown(() async {
        await queue.close();
        root.deleteSync(recursive: true);
      });
      final file = File('${root.path}/camera.jpg')..writeAsBytesSync([1, 2, 3]);
      final id = await CaptureStore(queue: queue, root: root).save(
        source: file,
        ownerId: 'owner',
        inspectionId: 'finding:inspection',
        roomId: 'finding',
        kind: 'PHOTO',
        extension: 'jpg',
        mimeType: 'image/jpeg',
        awaitingMarkup: true,
      );
      await queue.setAnnotations(id, jsonEncode(annotations));
      await queue.finishMarkup(id);
      final dio = Dio(BaseOptions(baseUrl: 'https://example.test'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (request, handler) {
            handler.resolve(
              Response(
                requestOptions: request,
                statusCode: 200,
                data: request.path.endsWith('/upload-url')
                    ? {'storagePath': 'saved/photo.jpg', 'signedUrl': null}
                    : {'id': 'photo'},
              ),
            );
          },
        ),
      );
      expect(
        await Uploader(
          queue: queue,
          backend: RoutingEvidenceBackend(dio),
          root: root,
          ownerId: 'owner',
        ).drain(),
        isFalse,
      );
      final retained = (await queue.byId(id))!;
      expect(retained.annotations, jsonEncode(annotations));
      expect(retained.attempts, 1);
      expect(File('${root.path}/${retained.relativePath}').readAsBytesSync(), [
        1,
        2,
        3,
      ]);
    },
  );
}
