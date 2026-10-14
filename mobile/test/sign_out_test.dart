import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/settings_screen.dart';
import 'package:kivilo/services/secure_session_store.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class _MemoryStorage extends GotrueAsyncStorage {
  final _items = <String, String>{};

  @override
  Future<String?> getItem({required String key}) async => _items[key];

  @override
  Future<void> setItem({required String key, required String value}) async =>
      _items[key] = value;

  @override
  Future<void> removeItem({required String key}) async => _items.remove(key);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  /// What this phone holds in secure storage: user A signed in, and both A and B,
  /// who has used this phone before, with a saved signature.
  final phone = <String, String>{
    'kivilo.session': jsonEncode({
      'access_token': 'token-a',
      'token_type': 'bearer',
      'refresh_token': 'refresh-a',
      'user': {
        'id': 'user-a',
        'aud': 'authenticated',
        'email': 'a@kivilo.test',
        'created_at': '2026-10-01T00:00:00Z',
      },
    }),
    'kivilo.signature.user-a': 'signature-a',
    'kivilo.signature.user-b': 'signature-b',
  };

  setUpAll(() async {
    FlutterSecureStorage.setMockInitialValues(phone);
    PackageInfo.setMockInitialValues(
      appName: 'Kivilo',
      packageName: 'one.kivilo.kivilo',
      version: '1.0.0',
      buildNumber: '22',
      buildSignature: '',
    );
    await Supabase.initialize(
      url: 'https://kivilo.test',
      publishableKey: 'publishable',
      authOptions: FlutterAuthClientOptions(
        localStorage: const SecureSessionStore(),
        pkceAsyncStorage: _MemoryStorage(),
        detectSessionInUri: false,
        autoRefreshToken: false,
      ),
    );
  });

  testWidgets('signing out removes your saved signature from the phone', (
    tester,
  ) async {
    expect(Supabase.instance.client.auth.currentUser?.id, 'user-a');
    await tester.pumpWidget(const MaterialApp(home: SettingsScreen()));
    // The account screen's own requests have nowhere to go and give up.
    await tester.pump(const Duration(seconds: 9));
    await tester.scrollUntilVisible(find.text('Sign out'), 300);
    await tester.tap(find.text('Sign out'));
    await tester.pump(const Duration(seconds: 6));

    expect(Supabase.instance.client.auth.currentUser, isNull);
    expect(phone, {'kivilo.signature.user-b': 'signature-b'});
  });
}
