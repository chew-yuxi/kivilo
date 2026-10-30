import 'package:flutter/foundation.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';

enum PatchAvailability { none, downloadRequired, restartRequired }

abstract interface class PatchUpdate {
  Future<PatchAvailability> check();

  Future<void> install();
}

class DevicePatchUpdate implements PatchUpdate {
  DevicePatchUpdate({ShorebirdUpdater? updater})
      : _updater = updater ?? ShorebirdUpdater();

  final ShorebirdUpdater _updater;

  @override
  Future<PatchAvailability> check() async {
    if (!_updater.isAvailable) return PatchAvailability.none;
    try {
      return _availability(await _updater.checkForUpdate());
    } catch (error) {
      // A patch check must not lock an inspector out when the phone has no signal.
      debugPrint('Shorebird update check error: $error');
      return PatchAvailability.none;
    }
  }

  @override
  Future<void> install() async {
    final status = await _updater.checkForUpdate();
    if (status == UpdateStatus.outdated) await _updater.update();

    if (await _updater.checkForUpdate() != UpdateStatus.restartRequired) {
      throw StateError('Shorebird did not stage the downloaded patch');
    }

    // Shorebird applies this on the next launch. Keep the app and its durable upload
    // queue running; updating never needs notification permission or a forced exit.
  }

  static PatchAvailability _availability(UpdateStatus status) =>
      switch (status) {
        UpdateStatus.outdated => PatchAvailability.downloadRequired,
        UpdateStatus.restartRequired => PatchAvailability.restartRequired,
        UpdateStatus.upToDate ||
        UpdateStatus.unavailable => PatchAvailability.none,
      };
}
