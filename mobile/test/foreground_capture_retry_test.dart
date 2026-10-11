import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/foreground_capture_retry.dart';

void main() {
  testWidgets('foreground retries resume after a stalled worker settles', (
    tester,
  ) async {
    final first = Completer<void>();
    var attempts = 0;
    final retry = ForegroundCaptureRetry(
      interval: const Duration(minutes: 1),
      drain: () {
        attempts++;
        return attempts == 1 ? first.future : Future<void>.value();
      },
    );

    retry.start();
    await tester.pump(const Duration(minutes: 1));
    expect(attempts, 1);
    await tester.pump(const Duration(minutes: 2));
    expect(
      attempts,
      1,
      reason: 'a second timer tick cannot start another worker',
    );

    first.complete();
    await tester.pump();
    await tester.pump(const Duration(minutes: 1));
    expect(attempts, 2, reason: 'restored connectivity gets another drain');

    retry.stop();
    await tester.pump(const Duration(minutes: 2));
    expect(attempts, 2, reason: 'backgrounding cancels foreground retries');
    retry.start();
    await tester.pump(const Duration(minutes: 1));
    expect(attempts, 3);

    retry.dispose();
    await tester.pump(const Duration(minutes: 2));
    expect(attempts, 3, reason: 'disposing the root screen cancels retries');
  });
}
