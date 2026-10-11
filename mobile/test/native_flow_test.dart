import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';

class _MemoryCache extends ReadCache {
  String owner = 'account-a';
  final data = <String, Map<String, Object?>>{};

  @override
  String? get ownerId => owner;

  @override
  Future<Object?> readForOwner(String owner, String key) async =>
      data[owner]?[key];

  @override
  Future<bool> writeForOwner(String owner, String key, Object? value) async {
    data.putIfAbsent(owner, () => <String, Object?>{})[key] = value;
    return true;
  }
}

class _Backend {
  final calls = <String>[];
  final statuses = <String, String>{'in': 'DRAFT'};
  final roomStatuses = <String, String>{};
  final signatures = <String, Set<String>>{};
  final items = <String, List<Map<String, dynamic>>>{};
  bool consentIn = false;
  bool consentOut = false;
  bool hasOut = false;
  bool hasFinding = false;
  bool findingEdited = false;
  bool shared = false;
  bool deletionRequested = false;
  int assessmentVersion = 0;

  Map<String, dynamic> _roomSummary(String inspectionId) => {
    'id': 'room-$inspectionId',
    'name': 'Kitchen',
    'status': roomStatuses[inspectionId]!,
    'processingError': null,
    'items': items[inspectionId]?.length ?? 0,
    'photos': 1,
    'videos': 1,
    'newSinceDraft': 0,
  };

  Map<String, dynamic> _detail(String id) => {
    'id': id,
    'kind': id == 'in' ? 'CHECK_IN' : 'CHECK_OUT',
    'status': statuses[id],
    'property': '2 Marina Boulevard',
    'landlord': 'Lena Landlord',
    'landlordId': 'landlord',
    'tenant': 'Tariq Tenant',
    'tenantId': 'tenant',
    'summary': id == 'out' && hasFinding ? 'Counter damage' : null,
    'baselineId': id == 'out' ? 'in' : null,
    'checkOutId': id == 'in' && hasOut ? 'out' : null,
    'shareToken': id == 'in' && shared ? 'bearer-token' : null,
    'shareUrl': id == 'in' && shared
        ? 'https://kivilo.test/reports/bearer-token'
        : null,
    'aiConsentAt': (id == 'in' ? consentIn : consentOut)
        ? '2026-10-10T08:00:00Z'
        : null,
    'assessmentDraftChanged':
        id == 'out' && hasFinding && (assessmentVersion == 0 || findingEdited),
    'latestAssessment': assessmentVersion == 0 || id == 'in'
        ? null
        : {'version': assessmentVersion, 'publishedAt': '2026-10-10T11:00:00Z'},
    'signatures': [
      for (final stakeholder in signatures[id] ?? <String>{})
        {'stakeholderId': stakeholder, 'signedAt': '2026-10-10T10:00:00Z'},
    ],
    'findings': id == 'out' && hasFinding
        ? [
            {
              'id': 'finding',
              'changeType': 'DAMAGE',
              'verdict': findingEdited ? 'TENANT_LIABLE' : 'UNDECIDED',
              'rationale': findingEdited
                  ? 'Photographed chip'
                  : 'Possible chip',
              'estimatedCost': findingEdited ? '80.00' : null,
              'itemLabel': 'Kitchen · Counter',
              'baselineLabel': 'Kitchen · Counter',
              'editedByHuman': findingEdited,
            },
          ]
        : <Map<String, dynamic>>[],
    'rooms': roomStatuses.containsKey(id)
        ? [_roomSummary(id)]
        : <Map<String, dynamic>>[],
  };

  Map<String, dynamic> _room(String id) => {
    'room': {
      'id': 'room-$id',
      'name': 'Kitchen',
      'status': roomStatuses[id],
      'processingError': null,
    },
    'position': {'index': 1, 'total': 1},
    'next': null,
    'items': items[id] ?? <Map<String, dynamic>>[],
    'captures': [
      {
        'id': 'capture-$id',
        'clientId': 'client-$id',
        'kind': 'PHOTO',
        'url': 'https://kivilo.test/signed-photo',
        'note': 'Counter edge',
        'annotations': null,
      },
    ],
  };

  Object respond(RequestOptions request) {
    final method = request.method;
    final path = request.uri.path;
    calls.add('$method $path');
    if (path == '/api/v1/account/deletion-request') {
      if (method == 'POST') deletionRequested = true;
      return {
        'request': deletionRequested
            ? {
                'id': 'request-1',
                'status': 'REQUESTED',
                'requestedAt': '2026-10-10T12:00:00Z',
                'dueAt': '2026-11-09T12:00:00Z',
                'completedAt': null,
              }
            : null,
      };
    }
    if (path == '/api/v1/inspections') {
      if (method == 'POST') {
        final body = request.data as Map<String, dynamic>;
        if (body['line1'] != '2 Marina Boulevard' ||
            body['propertyType'] != 'PRIVATE_NON_LANDED') {
          throw StateError('Create payload changed');
        }
        return {'id': 'in'};
      }
      return [
        {
          'id': 'in',
          'kind': 'CHECK_IN',
          'status': statuses['in'],
          'property': '2 Marina Boulevard',
          'tenant': 'Tariq Tenant',
          'rooms': roomStatuses.containsKey('in') ? 1 : 0,
        },
      ];
    }
    final parts = path.split('/');
    if (parts.length < 5 || parts[3] != 'inspections') {
      throw StateError('Unknown route $method $path');
    }
    final id = parts[4];
    if (parts.length == 5 && method == 'GET') return _detail(id);
    final action = parts.length > 5 ? parts[5] : '';
    if (action == 'ai-consent' && method == 'POST') {
      if ((request.data as Map)['consent'] != true) {
        throw StateError('Consent must be explicit');
      }
      if (id == 'in') consentIn = true;
      if (id == 'out') consentOut = true;
      return {'consentedAt': '2026-10-10T08:00:00Z'};
    }
    if (action == 'rooms') {
      if (parts.length == 6 && method == 'POST') {
        if ((request.data as Map)['name'] != 'Kitchen') {
          throw StateError('Room payload changed');
        }
        roomStatuses[id] = 'PENDING';
        return {'id': 'room-$id'};
      }
      if (parts.length == 7 && method == 'GET') return _room(id);
      if (parts.length == 8 && parts[7] == 'finish') {
        if (!(id == 'in' ? consentIn : consentOut)) {
          throw StateError('Drafting before consent');
        }
        roomStatuses[id] = 'REVIEW';
        statuses[id] = 'REVIEW';
        return {'ok': true};
      }
      if (parts.length == 8 && parts[7] == 'review') {
        roomStatuses[id] = 'REVIEWED';
        return {'ok': true};
      }
      if (parts.length == 8 && parts[7] == 'items') {
        items[id] = [
          {
            'id': 'item-$id',
            'name': 'New item',
            'category': 'FIXTURE',
            'condition': 'GOOD',
            'quantity': 1,
            'notes': null,
            'identifier': null,
            'meterReading': null,
            'confidence': null,
            'editedByHuman': true,
          },
        ];
        return {'id': 'item-$id'};
      }
    }
    if (action == 'items' && parts.length == 7 && method == 'PATCH') {
      final body = request.data as Map<String, dynamic>;
      items[id]!.single.addAll(body);
      items[id]!.single['editedByHuman'] = true;
      return {'ok': true};
    }
    if (action == 'review' && method == 'POST') {
      if (roomStatuses[id] != 'REVIEWED') {
        throw StateError('Inventory sent before human room review');
      }
      statuses[id] = 'AWAITING_SIGNATURE';
      return {'ok': true};
    }
    if (action == 'signatures' && method == 'POST') {
      final body = request.data as Map<String, dynamic>;
      if (!(body['imageData'] as String).startsWith('data:image/png;base64,')) {
        throw StateError('Signature data contract changed');
      }
      signatures
          .putIfAbsent(id, () => <String>{})
          .add(body['stakeholderId'] as String);
      if (signatures[id]!.length == 2) statuses[id] = 'COMPLETED';
      return {'ok': true};
    }
    if (action == 'share') {
      if (method == 'POST') {
        shared = true;
        return {
          'token': 'bearer-token',
          'shareUrl': 'https://kivilo.test/reports/bearer-token',
        };
      }
      shared = false;
      return {'ok': true};
    }
    if (action == 'checkout' && method == 'POST') {
      hasOut = true;
      statuses['out'] = 'DRAFT';
      roomStatuses['out'] = 'PENDING';
      return {'id': 'out'};
    }
    if (action == 'findings') {
      if (parts.length == 7 && parts[6] == 'run') {
        if (!consentOut) throw StateError('Comparison before consent');
        hasFinding = true;
        return {'ok': true};
      }
      if (parts.length == 7 && parts[6] == 'publish') {
        if (statuses[id] != 'COMPLETED' || !findingEdited) {
          throw StateError('Assessment published before human review');
        }
        assessmentVersion++;
        findingEdited = false;
        return {
          'version': assessmentVersion,
          'publishedAt': '2026-10-10T11:00:00Z',
        };
      }
      if (parts.length == 7 && method == 'PATCH') {
        final body = request.data as Map<String, dynamic>;
        if (body['verdict'] != 'TENANT_LIABLE' ||
            body['estimatedCost'] != '80.00') {
          throw StateError('Finding review payload changed');
        }
        findingEdited = true;
        return {'ok': true};
      }
    }
    throw StateError('Unknown route $method $path');
  }
}

void main() {
  test('late inspection response never enters another account cache', () async {
    final cache = _MemoryCache();
    cache.owner = 'account-b';
    await cache.write('inspections', [
      {
        'id': 'b-inspection',
        'kind': 'CHECK_IN',
        'status': 'DRAFT',
        'property': 'B home',
        'tenant': 'B tenant',
        'rooms': 0,
      },
    ]);
    cache.owner = 'account-a';
    final started = Completer<void>();
    final response = Completer<void>();
    final backend = _Backend()..shared = true;
    final dio = Dio(BaseOptions(baseUrl: 'https://kivilo.test'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (request, handler) async {
          started.complete();
          await response.future;
          handler.resolve(
            Response(
              requestOptions: request,
              statusCode: 200,
              data: backend.respond(request),
            ),
          );
        },
      ),
    );
    final api = Api(dio: dio, cache: cache, attachAuth: false);
    final pending = api.inspection('in');
    await started.future;
    cache.owner = 'account-b';
    response.complete();

    await expectLater(pending, throwsA(isA<Exception>()));
    expect(
      (await cache.read('inspections') as List).single['id'],
      'b-inspection',
    );
    expect(await cache.read('inspection:in'), isNull);
    expect(await cache.readForOwner('account-a', 'inspection:in'), isNull);
  });

  test(
    'newly opened inspection remains reachable from Home after offline restart',
    () async {
      final cache = _MemoryCache();
      await cache.write('inspections', [
        {
          'id': 'earlier',
          'kind': 'CHECK_IN',
          'status': 'DRAFT',
          'property': '1 Earlier Lane',
          'tenant': 'Previous Tenant',
          'rooms': 1,
        },
      ]);
      final backend = _Backend();
      final online = Dio(BaseOptions(baseUrl: 'https://kivilo.test'));
      online.interceptors.add(
        InterceptorsWrapper(
          onRequest: (request, handler) => handler.resolve(
            Response(
              requestOptions: request,
              statusCode: 200,
              data: backend.respond(request),
            ),
          ),
        ),
      );
      final api = Api(dio: online, cache: cache, attachAuth: false);
      final id = await api.createInspection({
        'line1': '2 Marina Boulevard',
        'propertyType': 'PRIVATE_NON_LANDED',
      });
      await api.addRoom(id, 'Kitchen');
      expect((await api.inspection(id)).rooms, hasLength(1));
      await api.room(id, 'room-in');

      final offline = Dio(BaseOptions(baseUrl: 'https://kivilo.test'));
      offline.interceptors.add(
        InterceptorsWrapper(
          onRequest: (request, handler) => handler.reject(
            DioException(
              requestOptions: request,
              type: DioExceptionType.connectionError,
              message: 'No connection after relaunch',
            ),
          ),
        ),
      );
      final restarted = Api(dio: offline, cache: cache, attachAuth: false);
      final homeInspections = await restarted.inspections();
      expect(restarted.offlineCopy, isTrue);
      expect(homeInspections.map((inspection) => inspection.id), [
        id,
        'earlier',
      ]);
      expect(homeInspections.first.rooms, 1);
      expect((await restarted.inspection(id)).rooms.single.id, 'room-in');
    },
  );

  test(
    'native API completes check-in, check-out and account workflow',
    () async {
      final backend = _Backend();
      final dio = Dio(BaseOptions(baseUrl: 'https://kivilo.test'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (request, handler) {
            try {
              handler.resolve(
                Response(
                  requestOptions: request,
                  statusCode: 200,
                  data: backend.respond(request),
                ),
              );
            } catch (error) {
              handler.reject(
                DioException(requestOptions: request, error: error),
              );
            }
          },
        ),
      );
      final api = Api(dio: dio, cache: _MemoryCache(), attachAuth: false);

      final id = await api.createInspection({
        'line1': '2 Marina Boulevard',
        'unit': '#28-05',
        'postalCode': '018987',
        'propertyType': 'PRIVATE_NON_LANDED',
        'landlordName': 'Lena Landlord',
        'landlordEmail': null,
        'tenantName': 'Tariq Tenant',
        'tenantEmail': null,
        'startDate': '2026-10-10',
        'endDate': '2028-10-10',
        'monthlyRent': '6800',
        'deposit': '13600',
      });
      expect(id, 'in');
      expect((await api.inspections()).single.id, id);
      expect((await api.inspection(id)).rooms, isEmpty);

      expect(await api.addRoom(id, 'Kitchen'), 'room-in');
      await api.consentToAiProcessing(id);
      await api.processRoom(id, 'room-in');
      final draftedRoom = await api.room(id, 'room-in');
      expect(draftedRoom.status, 'REVIEW');
      expect(draftedRoom.captures.single.clientId, 'client-in');
      await api.addItem(id, 'room-in');
      await api.updateItem(id, 'item-in', {
        'name': 'Counter',
        'condition': 'FAIR',
        'quantity': 1,
      });
      expect((await api.room(id, 'room-in')).items.single.name, 'Counter');
      await api.markRoomReviewed(id, 'room-in');
      expect((await api.inspection(id)).allRoomsReviewed, isTrue);
      await api.completeReview(id);
      expect((await api.inspection(id)).isOpen, isFalse);
      await api.sign(id, 'landlord', 'data:image/png;base64,c2lnbg==');
      await api.sign(id, 'tenant', 'data:image/png;base64,c2lnbg==');
      expect((await api.inspection(id)).status, 'COMPLETED');
      expect(await api.share(id), 'https://kivilo.test/reports/bearer-token');
      expect((await api.inspection(id)).shareUrl, contains('/reports/'));
      await api.revokeShare(id);
      expect((await api.inspection(id)).shareUrl, isNull);

      final checkOutId = await api.startCheckOut(id);
      expect(checkOutId, 'out');
      expect((await api.inspection(id)).checkOutId, checkOutId);
      await api.consentToAiProcessing(checkOutId);
      await api.processRoom(checkOutId, 'room-out');
      await api.markRoomReviewed(checkOutId, 'room-out');
      await api.completeReview(checkOutId);
      await api.runFindings(checkOutId);
      expect(
        (await api.inspection(checkOutId)).findings.single.verdict,
        'UNDECIDED',
      );
      await api.updateFinding(checkOutId, 'finding', {
        'verdict': 'TENANT_LIABLE',
        'rationale': 'Photographed chip',
        'estimatedCost': '80.00',
      });
      await api.sign(checkOutId, 'landlord', 'data:image/png;base64,c2lnbg==');
      await api.sign(checkOutId, 'tenant', 'data:image/png;base64,c2lnbg==');
      expect((await api.inspection(checkOutId)).assessmentDraftChanged, isTrue);
      await api.publishFindings(checkOutId);
      expect((await api.inspection(checkOutId)).latestAssessment!.version, 1);

      expect((await api.deletionRequest())['request'], isNull);
      await api.requestDeletion();
      expect((await api.deletionRequest())['request']['status'], 'REQUESTED');
      expect(
        backend.calls,
        contains('POST /api/v1/inspections/out/findings/publish'),
      );
    },
  );
}
