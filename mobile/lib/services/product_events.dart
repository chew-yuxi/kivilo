import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'capture_queue.dart' show newCaptureId;

/// Matches the server allowlist in src/lib/product-event-keys.ts. Routes, tenancy
/// ids and anything a person typed cannot become an event property.
enum ProductScreenName {
  inspections('inspections'),
  newInspection('new_inspection'),
  inspection('inspection'),
  room('room'),
  capture('capture'),
  account('account'),
  renewal('renewal'),
  report('report'),
  addenda('addenda');

  const ProductScreenName(this.value);
  final String value;
}

class ProductEventSession {
  const ProductEventSession({required this.ownerId, required this.accessToken});
  final String ownerId;
  final String accessToken;

  /// This only checks token/account consistency. The server still verifies the token
  /// against Supabase and resolves its own stakeholder; a decoded JWT grants nothing.
  bool get matchesToken {
    final parts = accessToken.split('.');
    if (parts.length != 3) return false;
    try {
      final claims = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      );
      return claims is Map && claims['sub'] == ownerId;
    } on FormatException {
      return false;
    }
  }
}

/// Best-effort usage counts, kept apart from evidence and error reporting. The file
/// holds at most 20 events per auth account and three recent accounts. An old account's
/// events wait for that account to return; they never follow a different sign-in.
class ProductEvents {
  ProductEvents({
    required this._dio,
    required this._file,
    required this._source,
    required String release,
    required this._session,
  }) : _release = release.substring(0, min(release.length, 64)) {
    if (!const {'IOS', 'ANDROID'}.contains(_source)) {
      throw ArgumentError.value(_source, 'source');
    }
    _dio.options.connectTimeout ??= const Duration(seconds: 5);
    // Api's interceptor can read a newly signed-in token after a request was queued.
    // This later interceptor pins this request to its captured account and token.
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final expected = options.extra[_sessionKey];
          if (expected is! ProductEventSession) return handler.next(options);
          if (!_isOwner(expected.ownerId) || !expected.matchesToken) {
            return handler.reject(
              DioException(
                requestOptions: options,
                type: DioExceptionType.cancel,
                error: 'Usage event account changed',
              ),
            );
          }
          options.headers['Authorization'] = 'Bearer ${expected.accessToken}';
          handler.next(options);
        },
      ),
    );
  }

  final Dio _dio;
  final File _file;
  final String _source;
  final String _release;
  final ProductEventSession? Function() _session;
  final _verifiedOwners = <String, String>{};
  Future<void> _turn = Future.value();
  static const _sessionKey = 'productEventSession';
  static const _maxPending = 20;
  static const _maxOwners = 3;
  static final _visibleScreens = ValueNotifier<int>(0);
  static ProductEvents? current;

  String? get ownerId => _snapshot()?.ownerId;

  static Future<void> install(Dio dio) async {
    final (directory, info, patch) = await (
      getApplicationSupportDirectory(),
      PackageInfo.fromPlatform(),
      ShorebirdUpdater().readCurrentPatch(),
    ).wait;
    final build = '${info.version} (${info.buildNumber})';
    final reporter = ProductEvents(
      dio: dio,
      file: File('${directory.path}/product-events.json'),
      source: Platform.isIOS ? 'IOS' : 'ANDROID',
      release: patch == null ? build : '$build patch ${patch.number}',
      session: () {
        final session = Supabase.instance.client.auth.currentSession;
        return session == null
            ? null
            : ProductEventSession(
                ownerId: session.user.id,
                accessToken: session.accessToken,
              );
      },
    );
    current = reporter;
    // A route may have appeared while package information was being read. Only its
    // currently visible wrapper records it, after setup is ready.
    _visibleScreens.value++;
    await reporter.flush();
  }

  ProductEventSession? _snapshot() {
    final session = _session();
    return session != null && session.matchesToken ? session : null;
  }

  bool _isOwner(String owner) => _snapshot()?.ownerId == owner;

  Future<void> record(ProductScreenName screen) async {
    final session = _snapshot();
    if (session == null) return;
    final event = <String, Object?>{
      'id': newCaptureId(),
      'name': 'screen_viewed',
      'properties': {'screen': screen.value},
      'release': _release,
      'occurredAt': DateTime.now().toUtc().toIso8601String(),
    };
    await _inTurn(() async {
      if (!_isOwner(session.ownerId)) return;
      final queues = await _read();
      if (!_isOwner(session.ownerId)) return;
      final events = [...?queues.remove(session.ownerId), event];
      queues[session.ownerId] = events.sublist(
        max(0, events.length - _maxPending),
      );
      while (queues.length > _maxOwners) {
        queues.remove(queues.keys.first);
      }
      await _write(queues);
    });
    await flush();
  }

  /// Called after auth changes and foregrounding. A visible route records a new
  /// account once, without repeating a screen merely because its token refreshed.
  Future<void> resume() {
    _visibleScreens.value++;
    return flush();
  }

  Future<void> flush() {
    final session = _snapshot();
    if (session == null) return Future.value();
    return _inTurn(() async {
      if (!_isOwner(session.ownerId)) return;
      final queues = await _read();
      if (!_isOwner(session.ownerId)) return;
      final events = queues[session.ownerId];
      if (events == null || events.isEmpty) return;
      try {
        var stakeholder = _verifiedOwners[session.ownerId];
        if (stakeholder == null) {
          final response = await _dio.get<Map<String, dynamic>>(
            '/api/v1/me',
            options: _options(session),
          );
          if (!_isOwner(session.ownerId)) return;
          final value = response.data?['id'];
          if (value is! String || value.isEmpty) {
            throw const FormatException('Missing verified usage event owner');
          }
          stakeholder = value;
          _verifiedOwners[session.ownerId] = stakeholder;
          while (_verifiedOwners.length > _maxOwners) {
            _verifiedOwners.remove(_verifiedOwners.keys.first);
          }
        }
        if (!_isOwner(session.ownerId)) return;
        await _dio.post<Object>(
          '/api/v1/events',
          data: {'source': _source, 'events': events},
          options: _options(session, stakeholder),
        );
        if (!_isOwner(session.ownerId)) return;
      } on DioException catch (error) {
        // Offline, auth changes and server failures keep this account's events. A
        // schema refusal is permanent and can be dropped from this bounded queue.
        if (error.response?.statusCode != 400 || !_isOwner(session.ownerId)) {
          return;
        }
      }
      queues.remove(session.ownerId);
      await _write(queues);
    });
  }

  Options _options(
    ProductEventSession session, [
    String? stakeholder,
  ]) => Options(
    headers: {'x-kivilo-owner': ?stakeholder},
    // Usage can wait for Supabase's normal session refresh. Opt out of Api's own
    // 401 retry, which must not refresh another account after a sign-out/sign-in.
    extra: {_sessionKey: session, 'retried': true},
    sendTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 8),
  );

  Future<void> _inTurn(Future<void> Function() action) {
    final next = _turn.then((_) => action());
    // Preserve the error for the caller while allowing a later attempt to proceed.
    _turn = next.catchError((Object _) {});
    return next;
  }

  Future<Map<String, List<Map<String, Object?>>>> _read() async {
    if (!await _file.exists()) return {};
    try {
      final value = jsonDecode(await _file.readAsString());
      if (value is! Map<String, dynamic>) {
        throw const FormatException('Invalid usage queue');
      }
      final queues = <String, List<Map<String, Object?>>>{};
      for (final entry in value.entries) {
        if (entry.key.length > 128 || entry.value is! List) continue;
        final events = (entry.value as List)
            .where(_validEvent)
            .map((event) => Map<String, Object?>.from(event as Map))
            .toList();
        if (events.isNotEmpty) {
          queues[entry.key] = events.sublist(
            max(0, events.length - _maxPending),
          );
        }
      }
      while (queues.length > _maxOwners) {
        queues.remove(queues.keys.first);
      }
      return queues;
    } on FormatException {
      debugPrint('Ignoring corrupt usage event queue');
      return {};
    }
  }

  bool _validEvent(Object? value) {
    if (value is! Map ||
        value.length != 5 ||
        value['name'] != 'screen_viewed' ||
        !value.keys.toSet().containsAll(const {
          'id',
          'name',
          'properties',
          'release',
          'occurredAt',
        })) {
      return false;
    }
    final properties = value['properties'];
    final id = value['id'];
    final occurredAt = value['occurredAt'];
    final release = value['release'];
    return id is String &&
        RegExp(
          r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
        ).hasMatch(id) &&
        properties is Map &&
        properties.length == 1 &&
        ProductScreenName.values.any(
          (screen) => screen.value == properties['screen'],
        ) &&
        (release == null || release is String && release.length <= 64) &&
        occurredAt is String &&
        occurredAt.length <= 40 &&
        occurredAt.endsWith('Z') &&
        DateTime.tryParse(occurredAt) != null;
  }

  Future<void> _write(Map<String, List<Map<String, Object?>>> queues) async {
    final temp = File(
      '${_file.path}.${DateTime.now().microsecondsSinceEpoch}.tmp',
    );
    await temp.writeAsString(jsonEncode(queues), flush: true);
    await temp.rename(_file.path);
  }
}

final productRouteObserver = RouteObserver<PageRoute<dynamic>>();

/// Screen views follow route visibility. Tabs opt out while hidden; a single wrapper
/// around Home can change [screen] as the selected tab changes, including null for an
/// unlisted tab. A rebuild alone never records another view.
class ProductScreen extends StatefulWidget {
  const ProductScreen({
    super.key,
    required this.screen,
    required this.child,
    this.active = true,
  });
  final ProductScreenName? screen;
  final Widget child;
  final bool active;

  @override
  State<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends State<ProductScreen> with RouteAware {
  PageRoute<dynamic>? _route;
  ProductScreenName? _emittedScreen;
  String? _emittedOwner;

  @override
  void initState() {
    super.initState();
    ProductEvents._visibleScreens.addListener(_report);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final currentRoute = ModalRoute.of(context);
    final route = currentRoute is PageRoute<dynamic> ? currentRoute : null;
    if (route == _route) return;
    productRouteObserver.unsubscribe(this);
    _route = route;
    if (route != null) productRouteObserver.subscribe(this, route);
  }

  @override
  void didUpdateWidget(ProductScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.active || widget.screen == null) {
      _emittedScreen = null;
      _emittedOwner = null;
    }
    _report();
  }

  @override
  void didPush() => _report();

  @override
  void didPopNext() {
    _emittedScreen = null;
    _report();
  }

  @override
  void didPushNext() => _emittedScreen = null;

  void _report() {
    final screen = widget.screen;
    final reporter = ProductEvents.current;
    final owner = reporter?.ownerId;
    if (!mounted ||
        !widget.active ||
        screen == null ||
        _route?.isCurrent != true ||
        reporter == null ||
        owner == null ||
        _emittedScreen == screen && _emittedOwner == owner) {
      return;
    }
    _emittedScreen = screen;
    _emittedOwner = owner;
    unawaited(
      reporter.record(screen).catchError((Object error) {
        debugPrint('Usage event reporting failed: ${error.runtimeType}');
      }),
    );
  }

  @override
  void dispose() {
    productRouteObserver.unsubscribe(this);
    ProductEvents._visibleScreens.removeListener(_report);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
