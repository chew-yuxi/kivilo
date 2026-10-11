import 'dart:async';

/// Rechecks durable evidence while the app is open, including a lease left by a
/// worker killed during upload. The queue itself prevents two workers claiming
/// the same row; this timer also avoids overlapping its own drain attempts.
class ForegroundCaptureRetry {
  ForegroundCaptureRetry({
    required this.drain,
    this.interval = const Duration(minutes: 1),
  });

  final Future<void> Function() drain;
  final Duration interval;
  Timer? _timer;
  bool _running = false;
  bool _disposed = false;

  void start() {
    if (_disposed || _timer != null) return;
    _timer = Timer.periodic(interval, (_) => unawaited(retry()));
  }

  Future<void> retry() async {
    if (_disposed || _timer == null || _running) return;
    _running = true;
    try {
      await drain();
    } finally {
      _running = false;
    }
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  void dispose() {
    stop();
    _disposed = true;
  }
}
