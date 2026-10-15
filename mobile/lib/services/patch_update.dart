import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';

import 'api_failure.dart';

enum PatchAvailability { none, downloadRequired, restartRequired }

abstract interface class PatchUpdate {
  Future<PatchAvailability> check();

  Future<void> installAndClose();
}

class DevicePatchUpdate implements PatchUpdate {
  DevicePatchUpdate({
    ShorebirdUpdater? updater,
    FlutterLocalNotificationsPlugin? notifications,
    void Function()? terminate,
  }) : _updater = updater ?? ShorebirdUpdater(),
       _notifications = notifications ?? FlutterLocalNotificationsPlugin(),
       _terminate = terminate ?? _terminateProcess;

  final ShorebirdUpdater _updater;
  final FlutterLocalNotificationsPlugin _notifications;
  final void Function() _terminate;

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
  Future<void> installAndClose() async {
    await _prepareNotification();

    final status = await _updater.checkForUpdate();
    if (status == UpdateStatus.outdated) await _updater.update();

    if (await _updater.checkForUpdate() != UpdateStatus.restartRequired) {
      throw StateError('Shorebird did not stage the downloaded patch');
    }

    // Posting before exit hands the notification to the OS. It remains in the tray
    // after this process ends, and tapping it launches the newly staged patch.
    await _notifications.show(
      id: 41022,
      title: 'Kivilo is updated',
      body: 'Tap to reopen Kivilo.',
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'app_updates',
          'App updates',
          channelDescription: 'Completed Kivilo app updates',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBanner: true,
          presentList: true,
          presentSound: true,
        ),
      ),
      payload: 'shorebird-update',
    );
    await Future<void>.delayed(const Duration(milliseconds: 500));
    _terminate();
  }

  Future<void> _prepareNotification() async {
    await _notifications.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('ic_notification'),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
    );

    bool? granted;
    if (defaultTargetPlatform == TargetPlatform.android) {
      granted = await _notifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.requestNotificationsPermission();
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      granted = await _notifications
          .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin
          >()
          ?.requestPermissions(alert: true, sound: true);
    }
    if (granted == false) {
      throw const ApiFailure(
        'Notifications must be enabled so Kivilo can tell you when it is safe to reopen.',
        null,
      );
    }
  }

  static PatchAvailability _availability(UpdateStatus status) =>
      switch (status) {
        UpdateStatus.outdated => PatchAvailability.downloadRequired,
        UpdateStatus.restartRequired => PatchAvailability.restartRequired,
        UpdateStatus.upToDate ||
        UpdateStatus.unavailable => PatchAvailability.none,
      };

  static void _terminateProcess() => exit(0);
}
