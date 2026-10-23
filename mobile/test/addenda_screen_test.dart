import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:kivilo/models/addenda.dart';
import 'package:kivilo/models/report.dart';
import 'package:kivilo/screens/addenda_screen.dart';
import 'package:kivilo/screens/report_screen.dart';
import 'package:kivilo/services/addendum_photos.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_backend.dart';
import 'package:kivilo/services/notification_route.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

/// Holds a draft the way the server does, so each call shows on the next read.
class _FakeApi extends Api {
  _FakeApi() : super(attachAuth: false, cache: ReadCache());

  Map<String, dynamic>? draft;
  final published = <Map<String, dynamic>>[];
  final calls = <String>[];
  Map<String, dynamic>? lastEntry;
  var _ids = 0;

  List<Map<String, dynamic>> get entries =>
      draft!['entries'] as List<Map<String, dynamic>>;

  @override
  Future<AddendaWorkspace> addenda(String inspectionId) async =>
      AddendaWorkspace.fromJson({
        'published': published,
        'draft': draft,
        'rooms': ['Kitchen', 'Utility'],
        'targets': [
          {'key': 'item:hob', 'label': 'Kitchen · Hob'},
          {'key': 'item:dryer', 'label': 'Utility · Dryer'},
        ],
        'resolvedCases': <Map<String, dynamic>>[],
      });

  @override
  Future<String> startAddendum(String inspectionId) async {
    calls.add('start:$inspectionId');
    draft = {
      'id': 'draft-1',
      'title': '',
      'reason': null,
      'effectiveDate': '2026-10-12',
      'entries': <Map<String, dynamic>>[],
    };
    return 'draft-1';
  }

  @override
  Future<void> updateAddendum(
    String addendumId, {
    required String title,
    required String? reason,
    required String effectiveDate,
  }) async {
    calls.add('details:$title:$effectiveDate');
    draft!['title'] = title;
  }

  @override
  Future<void> addAddendumEntry(
    String addendumId,
    Map<String, dynamic> body,
  ) async {
    lastEntry = body;
    entries.add({
      ...body,
      'id': 'entry-${++_ids}',
      'maintenanceCaseTitle': null,
      'photos': <Map<String, dynamic>>[],
    });
  }

  @override
  Future<void> deleteAddendumPhoto(String addendumId, String photoId) async {
    calls.add('delete-photo:$photoId');
    for (final entry in entries) {
      (entry['photos'] as List).removeWhere((photo) => photo['id'] == photoId);
    }
  }

  @override
  Future<void> publishAddendum(String addendumId) async {
    calls.add('publish:$addendumId');
    published.add({
      'id': addendumId,
      'number': 1,
      'title': draft!['title'],
      'effectiveDate': '2026-10-12T00:00:00.000Z',
      'acknowledgements': [
        {'role': 'Landlord', 'name': 'Tan Wei Ming', 'acknowledgedAt': null},
        {'role': 'Tenant', 'name': 'Priya Raman', 'acknowledgedAt': null},
      ],
    });
    draft = null;
  }

  @override
  Future<void> discardAddendum(String addendumId) async {
    calls.add('discard:$addendumId');
    draft = null;
  }
}

/// Stands in for the camera and the durable queue: a photo taken reaches the draft.
class _FakePhotos extends AddendumPhotos {
  _FakePhotos(this.fake) : super(api: fake);
  final _FakeApi fake;
  final taken = <String>[];
  Map<String, int> waiting = const {};

  @override
  Future<bool?> add({
    required String addendumId,
    required String entryId,
    required ImageSource source,
  }) async {
    taken.add('$addendumId:$entryId:${source.name}');
    final entry = fake.entries.firstWhere((e) => e['id'] == entryId);
    (entry['photos'] as List).add({
      'id': 'photo-1',
      'url': 'https://storage.test/p.jpg',
      'note': null,
      'label': null,
    });
    return true;
  }

  @override
  Future<Map<String, int>> pending(
    String addendumId,
    Iterable<String> entryIds,
  ) async => waiting;
}

Future<void> _open(
  WidgetTester tester,
  _FakeApi api,
  _FakePhotos photos,
) async {
  // Tall enough that the lazily built lists build every row these tests look for.
  tester.view.physicalSize = const Size(1080, 4000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: AddendaScreen(
        inspectionId: 'inspection-1',
        api: api,
        photos: photos,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'the agent writes an update on the phone: a replaced line, a photo, then publishes',
    (tester) async {
      final api = _FakeApi();
      final photos = _FakePhotos(api);
      await _open(tester, api, photos);

      await _tap(tester, find.text('Start an update'));
      expect(api.calls, ['start:inspection-1']);
      expect(find.text('Draft update'), findsOneWidget);
      await tester.enterText(
        find.widgetWithText(TextField, 'Title'),
        'New induction hob',
      );

      // A replacement names the line it changes; the room follows that line.
      await _tap(tester, find.text('Add a change'));
      await _tap(tester, find.text('Added'));
      await _tap(tester, find.text('Replaced').last);
      await _tap(tester, find.text('Which item?'));
      await _tap(tester, find.text('Kitchen · Hob').last);
      await tester.enterText(
        find.widgetWithText(TextField, 'New item'),
        'Induction hob',
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Make, model and serial'),
        'Bosch PUE611',
      );
      await _tap(tester, find.widgetWithText(FilledButton, 'Add change'));

      expect(api.lastEntry, {
        'change': 'REPLACED',
        'roomName': '',
        'targetKey': 'item:hob',
        'name': 'Induction hob',
        'category': 'APPLIANCE',
        'condition': 'NEW',
        'quantity': 1,
        'identifier': 'Bosch PUE611',
        'notes': null,
      });
      expect(
        find.text('Replaced: Kitchen · Hob with Induction hob'),
        findsOneWidget,
      );

      // A photo goes through the queue to the draft, and can be taken off again.
      await _tap(tester, find.text('Take photo'));
      expect(photos.taken, ['draft-1:entry-1:camera']);
      expect(find.byTooltip('Delete photo'), findsOneWidget);
      await _tap(tester, find.byTooltip('Delete photo'));
      expect(api.calls, contains('delete-photo:photo-1'));
      expect(find.byTooltip('Delete photo'), findsNothing);

      // Publishing saves the details first, after a confirmation.
      await _tap(tester, find.text('Publish update'));
      expect(find.text('Publish this update?'), findsOneWidget);
      await _tap(tester, find.widgetWithText(FilledButton, 'Publish'));
      expect(api.calls.sublist(api.calls.length - 2), [
        'details:New induction hob:2026-10-12',
        'publish:draft-1',
      ]);
      expect(find.text('Update 1: New induction hob'), findsOneWidget);
      expect(
        find.textContaining('Landlord Tan Wei Ming: pending acknowledgement'),
        findsOneWidget,
      );
      expect(find.text('Start an update'), findsOneWidget);
    },
  );

  testWidgets(
    'a photo still on the phone holds publishing back, and a draft can be discarded',
    (tester) async {
      final api = _FakeApi();
      await api.startAddendum('inspection-1');
      api.draft!['title'] = 'Dryer taken away';
      await api.addAddendumEntry('draft-1', {
        'change': 'REMOVED',
        'roomName': 'Utility',
        'targetKey': 'item:dryer',
        'quantity': 1,
      });
      api.calls.clear();
      final photos = _FakePhotos(api)..waiting = {'entry-1': 1};
      await _open(tester, api, photos);

      expect(find.text('Removed: Utility · Dryer'), findsOneWidget);
      expect(
        find.text('1 photo saved on this phone, waiting to upload'),
        findsOneWidget,
      );
      await _tap(tester, find.text('Publish update'));
      expect(
        find.textContaining('Some photos are still on this phone'),
        findsOneWidget,
      );
      expect(api.calls, isEmpty);

      await _tap(tester, find.text('Discard draft'));
      await _tap(tester, find.widgetWithText(FilledButton, 'Discard'));
      expect(api.calls, ['discard:draft-1']);
      expect(find.text('Start an update'), findsOneWidget);
    },
  );

  testWidgets('a change says what it is missing before it is sent', (
    tester,
  ) async {
    final api = _FakeApi();
    await api.startAddendum('inspection-1');
    await _open(tester, api, _FakePhotos(api));

    await _tap(tester, find.text('Add a change'));
    await _tap(tester, find.widgetWithText(FilledButton, 'Add change'));
    expect(find.text('Choose the room.'), findsOneWidget);
    await _tap(tester, find.widgetWithText(ActionChip, 'Kitchen'));
    await _tap(tester, find.widgetWithText(FilledButton, 'Add change'));
    expect(find.text('Name the new item.'), findsOneWidget);
    expect(api.lastEntry, isNull);
  });

  test(
    'a photo is stored only as JPEG, PNG or WebP, whatever its name',
    () async {
      final dir = await Directory.systemTemp.createTemp('photo-type');
      addTearDown(() => dir.delete(recursive: true));
      Future<String?> typeOf(List<int> bytes) async {
        final file = File('${dir.path}/scaled_IMG_0001.heic');
        await file.writeAsBytes([...bytes, ...List.filled(16, 0)]);
        return photoMimeType(file);
      }

      // Android keeps a HEIC's name on the JPEG it re-encodes it to.
      expect(await typeOf([0xFF, 0xD8, 0xFF, 0xE0]), 'image/jpeg');
      expect(await typeOf([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]), 'image/png');
      expect(
        await typeOf([
          0x52,
          0x49,
          0x46,
          0x46,
          1,
          2,
          3,
          4,
          0x57,
          0x45,
          0x42,
          0x50,
        ]),
        'image/webp',
      );
      // A HEIC that was not re-encoded is refused rather than sent.
      expect(
        await typeOf([
          0,
          0,
          0,
          0x18,
          0x66,
          0x74,
          0x79,
          0x70,
          0x68,
          0x65,
          0x69,
          0x63,
        ]),
        isNull,
      );
    },
  );

  test(
    'update photos use the shared queue backend with the update routes',
    () async {
      final calls = <RequestOptions>[];
      final dio = Dio(BaseOptions(baseUrl: 'https://example.invalid'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            calls.add(options);
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: options.path.endsWith('/upload-url')
                    ? {
                        'storagePath': 'addenda/draft-1/client.png',
                        'signedUrl': null,
                        'token': null,
                      }
                    : {'id': 'photo-1'},
              ),
            );
          },
        ),
      );
      final backend = RoutingEvidenceBackend(dio);
      const clientId = '2fd725c5-4699-4b21-802d-b3f423274cb6';
      final credential = await backend.uploadUrl(
        'addendum:draft-1',
        'entry-1',
        '$clientId.png',
        clientId,
      );
      // Already in storage: nothing to PUT, only to register.
      expect(credential.alreadyUploaded, isTrue);
      final registered = await backend.registerCapture(
        inspectionId: 'addendum:draft-1',
        roomId: 'entry-1',
        kind: 'PHOTO',
        storagePath: credential.storagePath,
        clientId: clientId,
        mimeType: 'image/png',
        sizeBytes: 321,
      );

      expect(registered.id, 'photo-1');
      expect(calls.map((call) => call.path), [
        '/api/v1/addenda/draft-1/entries/entry-1/upload-url',
        '/api/v1/addenda/draft-1/entries/entry-1/photos',
      ]);
      expect(calls.first.data, {'clientId': clientId, 'mimeType': 'image/png'});
      expect(calls.last.data, {
        'clientId': clientId,
        'mimeType': 'image/png',
        'storagePath': 'addenda/draft-1/client.png',
        'sizeBytes': 321,
        'note': null,
      });
      expect(
        () => backend.deleteCapture('addendum:draft-1', 'photo-1'),
        throwsStateError,
      );
    },
  );

  test(
    'a push about an update opens its report, not the notifications list',
    () async {
      final api = _ReportLookupApi();
      final screen = await notificationScreen('/updates/addendum-9', api);
      expect(screen, isA<ReportScreen>());
      expect((screen! as ReportScreen).id, 'inspection-4');
      expect(api.looked, ['addendum-9']);
      expect(await notificationScreen('/somewhere-else', api), isNull);
      expect(await notificationScreen(null, api), isNull);
    },
  );
}

class _ReportLookupApi extends Api {
  _ReportLookupApi() : super(attachAuth: false, cache: ReadCache());
  final looked = <String>[];

  @override
  Future<String> addendumReport(String addendumId) async {
    looked.add(addendumId);
    return 'inspection-4';
  }

  @override
  Future<SignedReport> report(String inspectionId) =>
      throw UnimplementedError();
}
