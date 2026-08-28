import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Where the signed-in session lives between launches.
///
/// The default store is SharedPreferences, which on Android is a world-readable-to-root
/// XML file and on iOS an unprotected plist. What is being kept is a refresh token that
/// opens an account holding photographs of people's homes and stakeholder records with
/// NRIC and FIN numbers, on a phone that gets left in cars. So: Keychain on iOS,
/// EncryptedSharedPreferences on Android.
class SecureSessionStore extends LocalStorage {
  const SecureSessionStore();

  static const _key = 'kivilo.session';
  // Android encrypts unconditionally from v11, so there is no flag to set there.
  // first_unlock rather than unlocked, so a background upload can still read the token
  // with the phone in a pocket, which is the normal state during a walkthrough.
  static const _storage = FlutterSecureStorage(
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  @override
  Future<void> initialize() async {}

  @override
  Future<String?> accessToken() => _storage.read(key: _key);

  @override
  Future<bool> hasAccessToken() => _storage.containsKey(key: _key);

  @override
  Future<void> persistSession(String persistSessionString) =>
      _storage.write(key: _key, value: persistSessionString);

  @override
  Future<void> removePersistedSession() => _storage.delete(key: _key);
}
