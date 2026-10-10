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
  final Set<Future<void>> _pendingRegistrations = {};
  String? _currentToken;
  int _initializationId = 0;

  Future<void> initialize() async {
    final initializationId = ++_initializationId;
    await _tokenSubscription?.cancel();
    await _messageSubscription?.cancel();
    await _openedSubscription?.cancel();
    if (initializationId != _initializationId) return;

    final messaging = FirebaseMessaging.instance;
    final permission = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (initializationId != _initializationId ||
        permission.authorizationStatus == AuthorizationStatus.denied) {
      return;
    }

    await messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );
    if (initializationId != _initializationId) return;
    _tokenSubscription = messaging.onTokenRefresh.listen(
      (token) {
        if (initializationId != _initializationId) return;
        unawaited(
          _register(token).catchError(
            (Object error) =>
                debugPrint('push token registration error: $error'),
          ),
        );
      },
      onError: (Object error) => debugPrint('push token refresh error: $error'),
    );
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

    try {
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        // APNs registration can finish after permission is granted. Asking for an
        // FCM token before then can fail without a later token-refresh event.
        var apnsReady = false;
        for (var attempt = 0; attempt < 15; attempt++) {
          if (initializationId != _initializationId) return;
          if (await messaging.getAPNSToken() != null) {
            apnsReady = true;
            break;
          }
          await Future<void>.delayed(const Duration(seconds: 1));
        }
        if (!apnsReady) {
          // App resume retries initialization after APNs becomes available.
          debugPrint('APNs token is not ready; push registration will retry');
          return;
        }
      }
      if (initializationId != _initializationId) return;
      final token = await messaging.getToken();
      if (token != null && initializationId == _initializationId) {
        await _register(token);
      }
    } catch (error) {
      debugPrint('initial push token is not ready: $error');
    }
  }

  Future<void> disableBeforeSignOut() async {
    ++_initializationId;
    await _tokenSubscription?.cancel();
    await _messageSubscription?.cancel();
    await _openedSubscription?.cancel();
    try {
      await Future.wait(_pendingRegistrations.toList());
    } catch (error) {
      debugPrint('pending push registration error during sign-out: $error');
    }
    // An unregistered token has no server record to disable. In particular, do
    // not ask FCM for a token while iOS is still waiting for its APNs token.
    final token = _currentToken;
    if (token != null) await Api().disablePushDevice(token);
    _currentToken = null;
  }

  Future<void> _register(String token) async {
    final registration = Api().registerPushDevice(
      token,
      defaultTargetPlatform == TargetPlatform.iOS ? 'IOS' : 'ANDROID',
    );
    _pendingRegistrations.add(registration);
    try {
      await registration;
      _currentToken = token;
    } finally {
      _pendingRegistrations.remove(registration);
    }
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
