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

      // The first controller was abandoned while Android showed its permission
      // dialog. A single resumed attempt may now recover the camera.
      first.complete(false);
      await Future<void>.delayed(Duration.zero);
      expect(attempts, 2);
      second.complete(true);
      await Future.wait([initial, resumed]);
      expect(attempts, 2);
    },
  );

  test(
    'denial blocks dialog-driven resume until an explicit user retry',
    () async {
      final startup = CameraStartup();
      final denied = Completer<bool>();
      var attempts = 0;
      Future<bool> open() {
        attempts++;
        return attempts == 1 ? denied.future : Future<bool>.value(true);
      }

      final initial = startup.open(open);
      final resumed = startup.open(open);
      startup.markPermissionDenied();
      denied.complete(false);
      await Future.wait([initial, resumed]);
      await startup.open(open);
      expect(
        attempts,
        1,
        reason: 'resumed must not reopen the permission dialog',
      );

      await startup.open(open, explicitRetry: true);
      expect(attempts, 2);
    },
  );

  test(
    'mode switch while opening waits then starts the selected mode',
    () async {
      final startup = CameraStartup();
      final photos = Completer<bool>();
      final openedModes = <String>[];
      var videoMode = false;
      Future<bool> open() {
        openedModes.add(videoMode ? 'video' : 'photos');
        return openedModes.length == 1
            ? photos.future
            : Future<bool>.value(true);
      }

      final initial = startup.open(open);
      videoMode = true;
      final switched = startup.open(open, explicitRetry: true);
      expect(openedModes, ['photos']);

      photos.complete(false); // The stale photo controller was disposed.
      await Future.wait([initial, switched]);
      expect(openedModes, ['photos', 'video']);
    },
  );
}
