import 'package:flutter/foundation.dart';

/// Supplied at build time, so no key or origin is committed:
///   flutter run --dart-define-from-file=env.json
class Config {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  static const apiBase = String.fromEnvironment('API_BASE');
  static const firebaseAndroidApiKey = String.fromEnvironment(
    'FIREBASE_ANDROID_API_KEY',
  );
  static const firebaseIosApiKey = String.fromEnvironment('FIREBASE_IOS_API_KEY');
  static const firebaseAndroidAppId = String.fromEnvironment(
    'FIREBASE_ANDROID_APP_ID',
  );
  static const firebaseIosAppId = String.fromEnvironment('FIREBASE_IOS_APP_ID');
  static const firebaseMessagingSenderId = String.fromEnvironment(
    'FIREBASE_MESSAGING_SENDER_ID',
  );
  static const firebaseProjectId = String.fromEnvironment(
    'FIREBASE_PROJECT_ID',
  );

  static bool get isComplete =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty && apiBase.isNotEmpty;

  static String get firebaseAppId => switch (defaultTargetPlatform) {
    TargetPlatform.android => firebaseAndroidAppId,
    TargetPlatform.iOS => firebaseIosAppId,
    _ => '',
  };

  static String get firebaseApiKey => switch (defaultTargetPlatform) {
    TargetPlatform.android => firebaseAndroidApiKey,
    TargetPlatform.iOS => firebaseIosApiKey,
    _ => '',
  };

  static bool get isPushComplete =>
      firebaseApiKey.isNotEmpty &&
      firebaseAppId.isNotEmpty &&
      firebaseMessagingSenderId.isNotEmpty &&
      firebaseProjectId.isNotEmpty;
}
