import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// A landlord's or tenant's own signature, kept on their phone so the next report they
/// sign as themselves needs no drawing. It is the PNG the signature pad made, exactly as
/// it was accepted.
///
/// Keyed by the signed-in user's id, so another account on the same phone never sees
/// it, and removed when they sign out. Only `SignatureScreen.own` is given one: on the
/// agent's phone the person signing is not the signed-in user.
class SavedSignature {
  const SavedSignature(this.userId);

  final String userId;

  // The Keychain or EncryptedSharedPreferences that holds the session. The default
  // iOS accessibility (unlocked) rather than the session's first_unlock, since nothing
  // reads a signature in the background.
  static const _storage = FlutterSecureStorage();

  String get _key => 'kivilo.signature.$userId';

  Future<Uint8List?> read() async {
    final png = await _storage.read(key: _key);
    return png == null ? null : base64Decode(png);
  }

  Future<void> save(Uint8List png) =>
      _storage.write(key: _key, value: base64Encode(png));

  Future<void> forget() => _storage.delete(key: _key);
}
