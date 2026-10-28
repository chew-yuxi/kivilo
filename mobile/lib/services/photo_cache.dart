import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:path_provider/path_provider.dart';

/// Photos downloaded once and kept on this phone, so a property opened before shows its
/// pictures at once, after a restart and offline.
///
/// The server signs a new link for every photo on every response, so a link is never
/// the same twice and Flutter's own cache, keyed by it, never hits. A stored object
/// never changes after upload, so a photo is named here by its address without the
/// signed token. It is only ever looked up with a link the server has just issued, so it
/// never shows a photo this account can no longer open. Branding logos can be replaced
/// at the same address and do not come through here.
class PhotoCache {
  PhotoCache._();

  /// The oldest downloads go first once the folder passes this. The phone may also
  /// clear the app's cache folder itself when space runs low.
  static int maxBytes = 200 * 1024 * 1024;

  /// Replaced by tests.
  static Future<Directory> Function() directory = () async =>
      Directory('${(await getApplicationCacheDirectory()).path}/photos');

  static final _http = HttpClient();
  static final _inFlight = <String, Future<Uint8List>>{};
  static Future<void>? _pruned;

  static String key(String url) => url.split('?').first;

  static Future<Uint8List> bytes(String url) {
    final name = sha256.convert(utf8.encode(key(url))).toString();
    return _inFlight.putIfAbsent(
      name,
      // A block body: `remove` returns this very future, which `whenComplete`
      // would otherwise wait on forever.
      () => _bytes(url, name).whenComplete(() {
        _inFlight.remove(name);
      }),
    );
  }

  static Future<Uint8List> _bytes(String url, String name) async {
    final folder = await directory();
    final file = File('${folder.path}/$name');
    if (await file.exists()) return file.readAsBytes();
    final bytes = await _download(url);
    await folder.create(recursive: true);
    // Renamed into place, so a photo cut off mid-write is never read back as whole.
    final partial = File('${file.path}.part');
    await partial.writeAsBytes(bytes, flush: true);
    await partial.rename(file.path);
    await (_pruned ??= _prune(folder));
    return bytes;
  }

  static Future<Uint8List> _download(String url) async {
    final uri = Uri.parse(url);
    final response = await (await _http.getUrl(uri)).close();
    if (response.statusCode != HttpStatus.ok) {
      await response.drain<void>();
      throw NetworkImageLoadException(statusCode: response.statusCode, uri: uri);
    }
    return consolidateHttpClientResponseBytes(response);
  }

  /// Once a launch, after the first download.
  static Future<void> _prune(Directory folder) async {
    final files = [
      for (final entry in await folder.list().toList())
        if (entry is File) (file: entry, stat: await entry.stat()),
    ]..sort((a, b) => a.stat.modified.compareTo(b.stat.modified));
    var total = files.fold<int>(0, (sum, each) => sum + each.stat.size);
    for (final each in files) {
      if (total <= maxBytes) break;
      await each.file.delete();
      total -= each.stat.size;
    }
  }

  /// On sign-out, so the next account on this phone starts with none of them.
  static Future<void> clear() async {
    PaintingBinding.instance.imageCache.clear();
    final folder = await directory();
    if (await folder.exists()) await folder.delete(recursive: true);
    _pruned = null;
  }
}

/// [NetworkImage] for a stored photo, through [PhotoCache]. Two links to the same photo
/// are the same image, so a refreshed response reuses what is already drawn.
@immutable
class StoredNetworkImage extends ImageProvider<StoredNetworkImage> {
  const StoredNetworkImage(this.url);

  final String url;

  @override
  Future<StoredNetworkImage> obtainKey(ImageConfiguration configuration) =>
      SynchronousFuture(this);

  @override
  ImageStreamCompleter loadImage(
    StoredNetworkImage key,
    ImageDecoderCallback decode,
  ) => MultiFrameImageStreamCompleter(
    codec: _load(key, decode),
    scale: 1,
    debugLabel: PhotoCache.key(url),
  );

  Future<ui.Codec> _load(
    StoredNetworkImage key,
    ImageDecoderCallback decode,
  ) async {
    try {
      final bytes = await PhotoCache.bytes(url);
      return await decode(await ui.ImmutableBuffer.fromUint8List(bytes));
    } catch (_) {
      // As NetworkImage does: a failure is not cached, so the next build retries.
      scheduleMicrotask(() => PaintingBinding.instance.imageCache.evict(key));
      rethrow;
    }
  }

  @override
  bool operator ==(Object other) =>
      other is StoredNetworkImage &&
      PhotoCache.key(other.url) == PhotoCache.key(url);

  @override
  int get hashCode => PhotoCache.key(url).hashCode;

  @override
  String toString() => 'StoredNetworkImage("${PhotoCache.key(url)}")';
}
