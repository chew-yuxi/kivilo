import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/property_work.dart';
import 'package:kivilo/models/renewal.dart';
import 'package:kivilo/screens/properties_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

/// Screens open with what this phone saved last time, then the server's answer
/// replaces it; a refusal from the server forgets the saved copy.

class _MemoryCache extends ReadCache {
  final data = <String, Object?>{};
  @override
  String? get ownerId => 'account';
  @override
  Future<Object?> readForOwner(String owner, String key) async => data[key];
  @override
  Future<bool> writeForOwner(String owner, String key, Object? value) async {
    data[key] = value;
    return true;
  }

  @override
  Future<void> deleteForOwner(String owner, String key) async =>
      data.remove(key);
}

const _refuse = 'refuse';

Map<String, Object?> _row(String address) => {
  'id': address,
  'address': address,
  'state': 'ACTIVE',
  'tenant': 'Tenant',
  'stage': 'RUNNING',
  'stageLabel': 'Tenancy running',
  'reports': 1,
};

/// A server that answers when told to, and records every request it gets.
({
  Api api,
  _MemoryCache cache,
  List<String> requests,
  Completer<Object?> answer,
})
_setup() {
  final cache = _MemoryCache();
  final requests = <String>[];
  final answer = Completer<Object?>();
  final dio = Dio(BaseOptions(baseUrl: 'https://kivilo.test'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (request, handler) async {
        requests.add(request.path);
        final data = await answer.future;
        if (data == _refuse) {
          handler.reject(
            DioException(
              requestOptions: request,
              response: Response(
                requestOptions: request,
                statusCode: 404,
                data: {'error': 'not_found'},
              ),
              type: DioExceptionType.badResponse,
            ),
          );
          return;
        }
        handler.resolve(
          Response(requestOptions: request, statusCode: 200, data: data),
        );
      },
    ),
  );
  return (
    api: Api(dio: dio, cache: cache, attachAuth: false),
    cache: cache,
    requests: requests,
    answer: answer,
  );
}

void main() {
  test('shows the saved copy first, then the server answer', () async {
    final s = _setup();
    s.cache.data['/api/v1/property-work?'] = [_row('Saved Road')];
    final loading = s.api.load(() => s.api.propertyWork());
    final seen = <String>[];
    final done = Completer<void>();
    loading.stream.listen(
      (rows) => seen.add(rows.single.address),
      onDone: done.complete,
    );
    await pumpEventQueue();
    // The saved copy is on screen before the server has answered.
    expect(seen, ['Saved Road']);
    expect(s.requests, ['/api/v1/property-work?']);

    s.answer.complete([_row('Fresh Road')]);
    await done.future;
    expect(seen, ['Saved Road', 'Fresh Road']);
    expect((await loading.fresh).single.address, 'Fresh Road');
    expect(s.cache.data['/api/v1/property-work?'], [_row('Fresh Road')]);
  });

  test('the saved pass never sends a request or writes anything', () async {
    final s = _setup();
    s.answer.complete([_row('Fresh Road')]);
    var savedPassWrites = 0;
    final loading = s.api.load(() async {
      if (s.api.readingSavedCopy) savedPassWrites++;
      // A load that also sends or saves something must not do so from saved data.
      await s.api.saveWorkspacePreference('team');
      return s.api.propertyWork();
    });
    await loading.fresh;
    expect(savedPassWrites, 1);
    expect(s.requests, ['/api/v1/property-work?']);
    // Only the real pass saved the preference.
    expect(s.cache.data['workspace'], 'team');
  });

  test('a refusal from the server forgets the saved copy', () async {
    final s = _setup();
    s.cache.data['/api/v1/property-work?'] = [_row('Saved Road')];
    final loading = s.api.load(() => s.api.propertyWork());
    s.answer.complete(_refuse);
    await expectLater(loading.fresh, throwsA(isA<ApiFailure>()));
    expect(s.cache.data.containsKey('/api/v1/property-work?'), isFalse);
  });

  testWidgets('refreshing keeps the list on screen instead of a spinner', (
    tester,
  ) async {
    final api = _RefreshApi();
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: PropertiesScreen(api: api),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('First Road'), findsOneWidget);

    api.next = Completer<List<PropertyWorkItem>>();
    final refresh = tester
        .widget<RefreshIndicator>(find.byType(RefreshIndicator))
        .onRefresh();
    await tester.pump();
    expect(find.text('First Road'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsNothing);

    api.next!.complete([PropertyWorkItem.fromJson(_row('Second Road'))]);
    await refresh;
    await tester.pumpAndSettle();
    expect(find.text('Second Road'), findsOneWidget);
    expect(find.text('First Road'), findsNothing);
  });
}

class _RefreshApi extends Api {
  _RefreshApi() : super(attachAuth: false, cache: _MemoryCache());
  Completer<List<PropertyWorkItem>>? next;

  @override
  Future<AgencyIndex> agencies() async =>
      const AgencyIndex(agencies: [], invitations: []);
  @override
  Future<String?> workspacePreference() async => null;
  @override
  Future<void> saveWorkspacePreference(String? value) async {}
  @override
  Future<List<RenewalReminder>> renewals() async => [];
  @override
  Future<List<PropertyWorkItem>> propertyWork({
    String? agencyId,
    String? assigneeId,
    bool personal = false,
    String state = 'active',
  }) async {
    if (readingSavedCopy) throw StateError('nothing saved');
    if (next != null) return next!.future;
    return [PropertyWorkItem.fromJson(_row('First Road'))];
  }
}
