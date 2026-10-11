import 'package:wakelock_plus/wakelock_plus.dart';

/// Keeps the display awake only while the camera owns a video recording.
class RecordingScreenAwake {
  RecordingScreenAwake({Future<void> Function(bool)? toggle})
    : _toggle = toggle ?? ((enabled) => WakelockPlus.toggle(enable: enabled));

  final Future<void> Function(bool) _toggle;
  Future<void> _pending = Future<void>.value();
  bool _held = false;
  bool _closed = false;

  Future<void> hold() async {
    if (_closed) throw StateError('Capture screen has closed.');
    await _set(true);
    if (_closed) throw StateError('Capture screen has closed.');
  }

  Future<void> start(Future<void> Function() startRecording) async {
    await hold();
    try {
      await startRecording();
    } catch (_) {
      await release();
      rethrow;
    }
  }

  Future<void> release() async {
    await _set(false);
  }

  Future<void> close() {
    _closed = true;
    return _set(false);
  }

  Future<void> _set(bool enabled) {
    final operation = _pending.then((_) async {
      if ((enabled && _closed) || _held == enabled) return;
      await _toggle(enabled);
      _held = enabled;
    });
    // A failed native call is returned to its caller, but does not block a
    // later release from clearing a previously acquired screen lock.
    _pending = operation.then<void>(
      (_) {},
      onError: (Object _, StackTrace _) {},
    );
    return operation;
  }
}
