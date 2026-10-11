import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/recording_screen_awake.dart';

void main() {
  test(
    'screen is held before recording starts and released after stop',
    () async {
      final events = <String>[];
      final awake = RecordingScreenAwake(
        toggle: (enabled) async => events.add(enabled ? 'awake' : 'sleep'),
      );

      await awake.start(() async => events.add('start recording'));
      events.add('stop recording');
      await awake.release();
      await awake.close();

      expect(events, ['awake', 'start recording', 'stop recording', 'sleep']);
    },
  );

  test('failed camera start clears the screen lock', () async {
    final toggles = <bool>[];
    final awake = RecordingScreenAwake(
      toggle: (enabled) async => toggles.add(enabled),
    );

    await expectLater(
      awake.start(() async => throw StateError('Camera failed')),
      throwsStateError,
    );

    expect(toggles, [true, false]);
  });

  test('closing during pending enable cannot leave the screen awake', () async {
    final enabled = Completer<void>();
    final toggles = <bool>[];
    var cameraStarted = false;
    final awake = RecordingScreenAwake(
      toggle: (value) async {
        toggles.add(value);
        if (value) await enabled.future;
      },
    );

    final starting = awake.start(() async => cameraStarted = true);
    await Future<void>.delayed(Duration.zero);
    final closing = awake.close();
    enabled.complete();

    await expectLater(starting, throwsStateError);
    await closing;
    expect(cameraStarted, isFalse);
    expect(toggles, [true, false]);
  });

  test('failed release is retried on close', () async {
    final toggles = <bool>[];
    var failRelease = true;
    final awake = RecordingScreenAwake(
      toggle: (enabled) async {
        toggles.add(enabled);
        if (!enabled && failRelease) {
          failRelease = false;
          throw StateError('Window unavailable');
        }
      },
    );

    await awake.start(() async {});
    await expectLater(awake.release(), throwsStateError);
    await awake.close();

    expect(toggles, [true, false, false]);
  });
}
