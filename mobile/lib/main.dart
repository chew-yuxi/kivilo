import 'dart:async';

import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'screens/home_screen.dart';
import 'services/secure_session_store.dart';
import 'services/capture_sync.dart';
import 'services/push_notifications.dart';
import 'screens/sign_in_screen.dart';

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
    // Without this, a token refresh that fails while the phone has no signal is an
    // unhandled zone error and takes the app down. An inspector is offline by default,
    // so this is the ordinary case, not the exceptional one.
    Supabase.instance.client.auth.onAuthStateChange.listen(
      (_) => _resumeUserServices(),
      onError: (Object error) => debugPrint('auth state error: $error'),
    );
    _resumeUserServices();
  }

  runApp(const KiviloApp());
}

class KiviloApp extends StatelessWidget {
  const KiviloApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kivilo',
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFEC4899)),
        scaffoldBackgroundColor: const Color(0xFFF9FAFB),
      ),
      home: const _Root(),
    );
  }
}

void _resumeCaptures() {
  if (Supabase.instance.client.auth.currentSession == null) return;
  unawaited(
    resumePendingCaptures()
        .then((_) {})
        .catchError(
          (Object error) => debugPrint('capture resume error: $error'),
        ),
  );
}

void _resumeUserServices() {
  _resumeCaptures();
  if (!Config.isPushComplete ||
      Supabase.instance.client.auth.currentSession == null) {
    return;
  }
  unawaited(
    PushNotifications.instance
        .initialize()
        .catchError((Object error) => debugPrint('push setup error: $error')),
  );
}

class _Root extends StatefulWidget {
  const _Root();

  @override
  State<_Root> createState() => _RootState();
}

class _RootState extends State<_Root> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && Config.isComplete) {
      _resumeUserServices();
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
            : const HomeScreen();
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
