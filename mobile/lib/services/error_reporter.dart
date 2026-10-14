import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';

import 'api_failure.dart';
import 'capture_queue.dart' show newCaptureId;

/// Errors the app saw, sent to `/api/v1/errors` beside the web app's, where a new kind
/// of error emails us. A report is written to a file the moment it is made and leaves
/// only once the server has confirmed it, because errors cluster where the signal is
/// worst.
///
/// Only bugs are reported. A refusal or failure from Kivilo is recorded by the server
/// where it happened, and no signal is an inspector's ordinary day, so neither is sent.
class ErrorReporter {
  ErrorReporter({
    required this._dio,
    required this._file,
    required this._source,
    required this._release,
  });

  final Dio _dio;
  final File _file;
  final String _source;
  final String _release;

  /// The installed reporter. Null in tests, and until [install] has finished.
  static ErrorReporter? current;

  /// Enough to see what went wrong, without a phone offline for a week hoarding every
  /// error it saw.
  static const _maxPending = 20;

  /// One report per error per launch, so a widget throwing on every frame is one
  /// report, not thousands.
  final _seen = <String>{};

  /// File reads and writes take turns, so two errors at once cannot drop each other.
  Future<void> _turn = Future.value();

  /// Called once from main. Errors Flutter and the platform would otherwise only
  /// print are reported, and reports left from an earlier launch are sent.
  static Future<void> install(Dio dio) async {
    final (directory, info, patch) = await (
      getApplicationSupportDirectory(),
      PackageInfo.fromPlatform(),
      ShorebirdUpdater().readCurrentPatch(),
    ).wait;
    final build = '${info.version} (${info.buildNumber})';
    final reporter = ErrorReporter(
      dio: dio,
      file: File('${directory.path}/error-reports.json'),
      source: Platform.isIOS ? 'IOS' : 'ANDROID',
      release: patch == null ? build : '$build patch ${patch.number}',
    );
    current = reporter;

    final present = FlutterError.onError;
    FlutterError.onError = (details) {
      present?.call(details);
      report(details.exception, details.stack, 'flutter');
    };
    // False keeps the platform's own handling, which prints it, as before.
    PlatformDispatcher.instance.onError = (error, stack) {
      report(error, stack, 'platform');
      return false;
    };
    await reporter.flush();
  }

  /// Records [error] if it is a bug. Does nothing before [install].
  static void report(Object error, StackTrace? stack, String context) {
    final reporter = current;
    if (reporter == null || !isBug(error)) return;
    unawaited(reporter._record(error, stack, context));
  }

  /// Not a bug: Kivilo answered, and recorded any failure of its own, or there was no
  /// signal to answer with.
  static bool isBug(Object error) =>
      error is! ApiFailure &&
      error is! DioException &&
      error is! SocketException &&
      error is! HttpException &&
      error is! TimeoutException;

  Future<void> _record(Object error, StackTrace? stack, String context) async {
    final name = '${error.runtimeType}';
    final message = '$error';
    if (!_seen.add('$name: $message')) return;
    final report = <String, Object?>{
      'id': newCaptureId(),
      'context': context,
      'name': _clip(name, 200),
      'message': _clip(message, 2000),
      'stack': stack == null ? null : _clip('$stack', 8000),
      'path': null,
      'release': _release,
      'occurredAt': DateTime.now().toUtc().toIso8601String(),
    };
    await _inTurn(() async {
      final pending = [...await _read(), report];
      await _write(pending.sublist(max(0, pending.length - _maxPending)));
    });
    await flush();
  }

  /// Sends whatever is waiting: at launch, after each report, and whenever the app
  /// returns to the foreground or someone signs in.
  Future<void> flush() => _inTurn(() async {
    final pending = await _read();
    if (pending.isEmpty) return;
    try {
      await _dio.post<Object>(
        '/api/v1/errors',
        data: {'source': _source, 'errors': pending},
      );
    } on DioException catch (error) {
      // No signal, no one signed in yet, or the server failing: keep them for next
      // time. A 400 will never be accepted, so it is dropped rather than retried forever.
      if (error.response?.statusCode != 400) return;
    }
    await _write(const []);
  });

  Future<void> _inTurn(Future<void> Function() step) {
    final next = _turn.then((_) => step());
    // The caller still gets the failure through [next]; the chain only needs to carry
    // on to the next turn.
    _turn = next.catchError((Object _) {});
    return next;
  }

  Future<List<Object?>> _read() async {
    if (!await _file.exists()) return [];
    try {
      return jsonDecode(await _file.readAsString()) as List<Object?>;
    } on FormatException catch (error) {
      debugPrint('Ignoring corrupt error reports: $error');
      return [];
    }
  }

  Future<void> _write(List<Object?> reports) async {
    final temp = File(
      '${_file.path}.${DateTime.now().microsecondsSinceEpoch}.tmp',
    );
    await temp.writeAsString(jsonEncode(reports), flush: true);
    await temp.rename(_file.path);
  }

  static String _clip(String text, int length) =>
      text.length <= length ? text : text.substring(0, length);
}
