import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/camera_startup.dart';

void main() {
  test(
    'resume during permission startup cannot start a second camera',
    () async {
      final startup = CameraStartup();
      final first = Completer<bool>();
      final second = Completer<bool>();
      var attempts = 0;
      Future<bool> open() {
        attempts++;
        return attempts == 1 ? first.future : second.future;
      }

      final initial = startup.open(open);
      final resumed = startup.open(open);
      expect(attempts, 1);
      first.complete(false);
      await Future<void>.delayed(Duration.zero);
      expect(attempts, 2);
      second.complete(true);
      await Future.wait([initial, resumed]);
    },
  );

  test('permission denial waits for an explicit retry', () async {
    final startup = CameraStartup();
    final denied = Completer<bool>();
    var attempts = 0;
    Future<bool> open() {
      attempts++;
      return attempts == 1 ? denied.future : Future<bool>.value(true);
    }

    final initial = startup.open(open);
    startup.markPermissionDenied();
    denied.complete(false);
    await initial;
    await startup.open(open);
    expect(attempts, 1);
    await startup.open(open, explicitRetry: true);
    expect(attempts, 2);
  });
}
