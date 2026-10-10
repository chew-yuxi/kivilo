import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Keeps previously viewed inspection metadata available on the same account's phone.
/// Captured media uses the separate durable capture journal.
class ReadCache {
  Future<File?> _file(String key) async {
    final owner = Supabase.instance.client.auth.currentUser?.id;
    if (owner == null) return null;
    final root = await getApplicationSupportDirectory();
    final account = base64Url.encode(utf8.encode(owner));
    final name = base64Url.encode(utf8.encode(key));
    return File('${root.path}/inspection-views/$account/$name.json');
  }

  Future<Object?> read(String key) async {
    final file = await _file(key);
    if (file == null || !await file.exists()) return null;
    try {
      return jsonDecode(await file.readAsString());
    } on FormatException catch (error) {
      debugPrint('Ignoring corrupt inspection cache $key: $error');
      return null;
    } on FileSystemException catch (error) {
      debugPrint('Could not read inspection cache $key: $error');
      return null;
    }
  }

  Future<void> write(String key, Object? value) async {
    final file = await _file(key);
    if (file == null) return;
    try {
      await file.parent.create(recursive: true);
      final temp = File(
        '${file.path}.${DateTime.now().microsecondsSinceEpoch}.tmp',
      );
      await temp.writeAsString(jsonEncode(value), flush: true);
      await temp.rename(file.path);
    } on FileSystemException catch (error) {
      debugPrint('Could not save inspection cache $key: $error');
    }
  }
}
