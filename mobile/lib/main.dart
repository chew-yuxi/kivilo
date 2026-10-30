import 'dart:async';

import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'screens/home_screen.dart';
import 'screens/update_gate.dart';
import 'services/api.dart';
import 'services/app_update.dart';
import 'services/error_reporter.dart';
import 'services/secure_session_store.dart';
import 'services/capture_sync.dart';
import 'services/foreground_capture_retry.dart';
import 'services/push_notifications.dart';
import 'services/patch_update.dart';
import 'services/product_events.dart';
import 'services/play_billing.dart';
import 'services/apple_billing.dart';
import 'screens/sign_in_screen.dart';
import 'ui/kivilo_theme.dart';
import 'services/photo_cache.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (Config.isPushComplete) {
    await Firebase.initializeApp(
      options: FirebaseOptions(
        apiKey: Config.firebaseApiKey,
        appId: Config.firebaseAppId,
        messagingSenderId: Config.firebaseMessagingSenderId,
        projectId: Config.firebaseProjectId,
      ),
    );
  }

  if (Config.isComplete) {
    await Supabase.initialize(
      url: Config.supabaseUrl,
      publishableKey: Config.supabaseAnonKey,
      // Keychain and EncryptedSharedPreferences rather than the default plaintext store.
      // The refresh token here opens an account holding photographs of people's homes.
      authOptions: const FlutterAuthClientOptions(
        localStorage: SecureSessionStore(),
      ),
    );
    PlayBilling.install(Api());
    AppleBilling.install(Api());
    // Without this, a token refresh that fails while the phone has no signal is an
    // unhandled zone error and takes the app down. An inspector is offline by default,
    // so this is the ordinary case, not the exceptional one.
    Supabase.instance.client.auth.onAuthStateChange.listen(
      (state) {
        if (state.event == AuthChangeEvent.signedOut) {
          unawaited(PhotoCache.clear());
        }
        _resumeUserServices();
      },
      onError: (Object error) => debugPrint('auth state error: $error'),
    );
    // Not awaited: reporting errors must never be what stops the app starting.
    unawaited(
      ErrorReporter.install(Api().dio).catchError(
        (Object error) => debugPrint('error reporting setup error: $error'),
      ),
    );
    unawaited(
      ProductEvents.install(Api().dio).catchError(
        (Object error) =>
            debugPrint('usage event setup error: ${error.runtimeType}'),
      ),
    );
    _resumeUserServices();
  }

  runApp(const KiviloApp());
}

class KiviloApp extends StatelessWidget {
  const KiviloApp({super.key});

  static final PatchUpdate _patchUpdate = DevicePatchUpdate();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kivilo',
      navigatorKey: navigatorKey,
      navigatorObservers: [productRouteObserver],
      debugShowCheckedModeBanner: false,
      theme: buildKiviloTheme(),
      // Above the navigator, so a retired build cannot reach any route, signed in or not.
      builder: (context, child) => UpdateGate(
        check: () => requiredUpdateUrl(Api()),
        patchUpdate: _patchUpdate,
        child: child!,
      ),
      home: const _Root(),
    );
  }
}

Future<void> _resumeCaptures() async {
  if (Supabase.instance.client.auth.currentSession == null) return;
  try {
    await resumePendingCaptures();
  } catch (error) {
    debugPrint('capture resume error: $error');
  }
}

void _resumeUserServices() {
  unawaited(_resumeCaptures());
  final billing = PlayBilling.current;
  if (billing != null) unawaited(billing.resume());
  final appleBilling = AppleBilling.current;
  if (appleBilling != null) unawaited(appleBilling.resume());
  // Reports wait for a session as well as for signal, so a sign-in is a moment to send.
  final reporter = ErrorReporter.current;
  if (reporter != null) unawaited(reporter.flush());
  final events = ProductEvents.current;
  if (events != null) {
    unawaited(
      events.resume().catchError(
        (Object error) =>
            debugPrint('usage event resume error: ${error.runtimeType}'),
      ),
    );
  }
  if (!Config.isPushComplete ||
      Supabase.instance.client.auth.currentSession == null) {
    return;
  }
  unawaited(
    PushNotifications.instance.initialize().catchError(
      (Object error) => debugPrint('push setup error: $error'),
    ),
  );
}

class _Root extends StatefulWidget {
  const _Root();

  @override
  State<_Root> createState() => _RootState();
}

class _RootState extends State<_Root> with WidgetsBindingObserver {
  late final _captureRetry = ForegroundCaptureRetry(drain: _resumeCaptures);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (Config.isComplete) _captureRetry.start();
  }

  @override
  void dispose() {
    _captureRetry.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && Config.isComplete) {
      _captureRetry.start();
      _resumeUserServices();
    } else if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      _captureRetry.stop();
      PlayBilling.current?.suspend();
      AppleBilling.current?.suspend();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!Config.isComplete) {
      return const _Misconfigured();
    }

    return StreamBuilder<AuthState>(
      stream: Supabase.instance.client.auth.onAuthStateChange,
      builder: (context, snapshot) {
        final session =
            snapshot.data?.session ??
            Supabase.instance.client.auth.currentSession;
        return session == null
            ? const SignInScreen()
            : HomeScreen(key: ValueKey(session.user.id));
      },
    );
  }
}

/// Config arrives through --dart-define, so a build with none is a real possibility and
/// should say so rather than failing at the first request.
class _Misconfigured extends StatelessWidget {
  const _Misconfigured();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text(
            'Built without SUPABASE_URL, SUPABASE_ANON_KEY and API_BASE.\n\n'
            'Run with --dart-define-from-file=env.json',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
