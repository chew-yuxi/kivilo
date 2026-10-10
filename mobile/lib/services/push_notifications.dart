import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../screens/maintenance_case_screen.dart';
import '../screens/notifications_screen.dart';
import 'api.dart';

final navigatorKey = GlobalKey<NavigatorState>();

class PushNotifications {
  PushNotifications._();

  static final instance = PushNotifications._();

  StreamSubscription<String>? _tokenSubscription;
  StreamSubscription<RemoteMessage>? _messageSubscription;
  StreamSubscription<RemoteMessage>? _openedSubscription;
  String? _currentToken;

  Future<void> initialize() async {
    await _tokenSubscription?.cancel();
    await _messageSubscription?.cancel();
    await _openedSubscription?.cancel();

    final messaging = FirebaseMessaging.instance;
    final permission = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (permission.authorizationStatus == AuthorizationStatus.denied) return;

    await messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );
    _tokenSubscription = messaging.onTokenRefresh.listen(
      (token) => unawaited(
        _register(token).catchError(
          (Object error) => debugPrint('push token registration error: $error'),
        ),
      ),
      onError: (Object error) => debugPrint('push token refresh error: $error'),
    );
    try {
      // On a first iOS launch APNs can finish registration after permission is
      // granted. The refresh stream above will register the FCM token when ready.
      final token = await messaging.getToken();
      if (token != null) await _register(token);
    } catch (error) {
      debugPrint('initial push token is not ready: $error');
    }
    _messageSubscription = FirebaseMessaging.onMessage.listen(_showForeground);
    _openedSubscription = FirebaseMessaging.onMessageOpenedApp.listen(
      _openMessage,
    );
    final initial = await messaging.getInitialMessage();
    if (initial != null) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _openMessage(initial),
      );
    }
  }

  Future<void> disableBeforeSignOut() async {
    await _tokenSubscription?.cancel();
    await _messageSubscription?.cancel();
    await _openedSubscription?.cancel();
    final token = _currentToken ?? await FirebaseMessaging.instance.getToken();
    if (token != null) await Api().disablePushDevice(token);
    _currentToken = null;
  }

  Future<void> _register(String token) async {
    await Api().registerPushDevice(
      token,
      defaultTargetPlatform == TargetPlatform.iOS ? 'IOS' : 'ANDROID',
    );
    _currentToken = token;
  }

  void _showForeground(RemoteMessage message) {
    final context = navigatorKey.currentContext;
    if (context == null) return;
    final notification = message.notification;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(notification?.title ?? 'New Kivilo notification'),
        action: SnackBarAction(
          label: 'Open',
          onPressed: () => _openMessage(message),
        ),
      ),
    );
  }

  void _openMessage(RemoteMessage message) {
    // A notification can arrive after this account has signed out. The next
    // account must never be taken into the previous account's private case.
    if (Supabase.instance.client.auth.currentSession == null) return;
    final notificationId = message.data['notificationId'];
    if (notificationId is String && notificationId.isNotEmpty) {
      unawaited(
        Api().markNotificationRead(notificationId).catchError(
          (Object error) => debugPrint('notification read error: $error'),
        ),
      );
    }
    final href = message.data['href'];
    final match = href is String
        ? RegExp(r'^/maintenance/([^/]+)$').firstMatch(href)
        : null;
    final caseId = match?.group(1);
    navigatorKey.currentState?.push(
      MaterialPageRoute<void>(
        builder: (_) => caseId == null
            ? const NotificationsScreen()
            : MaintenanceCaseScreen(caseId: caseId),
      ),
    );
  }
}
