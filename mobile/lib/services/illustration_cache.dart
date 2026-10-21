import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';

import '../config.dart';

typedef IllustrationVariant = ({
  String filename,
  int width,
  int height,
  int bytes,
});

// Content-addressed variants from mobile/design/illustration-assets.json.
enum KiviloScene {
  handover(
    small: (
      filename: 'handover-192-a2c0aa072bfb.webp',
      width: 192,
      height: 96,
      bytes: 7242,
    ),
    large: (
      filename: 'handover-768-ea8147d471c4.webp',
      width: 768,
      height: 384,
      bytes: 44436,
    ),
  ),
  capture(
    small: (
      filename: 'capture-192-8eb52fcd35f7.webp',
      width: 192,
      height: 128,
      bytes: 8788,
    ),
    large: (
      filename: 'capture-768-7282a81449e3.webp',
      width: 768,
      height: 512,
      bytes: 50566,
    ),
  ),
  inventory(
    small: (
      filename: 'inventory-192-51b47a2cc5cc.webp',
      width: 192,
      height: 128,
      bytes: 10500,
    ),
    large: (
      filename: 'inventory-768-4a57537a634d.webp',
      width: 768,
      height: 512,
      bytes: 65282,
    ),
  ),
  sign(
    small: (
      filename: 'sign-192-db573d5d986f.webp',
      width: 192,
      height: 128,
      bytes: 8884,
    ),
    large: (
      filename: 'sign-768-8d977bcfeef9.webp',
      width: 768,
      height: 512,
      bytes: 58176,
    ),
  );

  const KiviloScene({required this.small, required this.large});
  final IllustrationVariant small;
  final IllustrationVariant large;
}

/// Expected network, storage or image failures leave the decorative space empty.
class IllustrationUnavailable implements Exception {
  const IllustrationUnavailable(this.cause);
  final Object cause;
}

/// Public artwork is cached separately from account data and never receives a bearer.
/// Temporary files may be cleared by the OS; the eight current variants bound this cache.
class IllustrationCache {
  IllustrationCache({
    String baseUrl = Config.apiBase,
    Dio? downloads,
    Future<Directory> Function()? temporaryDirectory,
    this.timeout = const Duration(seconds: 8),
  }) : _origin = Uri.tryParse(baseUrl),
       _downloads = downloads ?? Dio(),
       _temporaryDirectory = temporaryDirectory ?? getTemporaryDirectory;

  final Uri? _origin;
  final Dio _downloads;
  final Future<Directory> Function() _temporaryDirectory;
  final Duration timeout;
  final _pending = <String, Future<File>>{};
  Future<Directory>? _directory;

  bool get available =>
      _origin != null &&
      ['http', 'https'].contains(_origin.scheme) &&
      _origin.host.isNotEmpty;

  Future<Directory> _prepare() async {
    try {
      final root = await _temporaryDirectory();
      final originKey = base64Url.encode(utf8.encode(_origin!.origin));
      final directory = await Directory(
        '${root.path}/kivilo-illustrations/$originKey',
      ).create(recursive: true);
      final current = {
        for (final scene in KiviloScene.values) ...[
          scene.small.filename,
          scene.large.filename,
        ],
      };
      await for (final entry in directory.list()) {
        if (entry is File && !current.contains(entry.uri.pathSegments.last)) {
          await entry.delete();
        }
      }
      return directory;
    } on FileSystemException {
      _directory = null;
      rethrow;
    }
  }

  Future<File> load(IllustrationVariant variant) {
    if (!available) throw StateError('Illustration origin is not configured');
    return _pending.putIfAbsent(variant.filename, () async {
      try {
        return await _load(variant);
      } on DioException catch (error) {
        throw IllustrationUnavailable(error);
      } on TimeoutException catch (error) {
        throw IllustrationUnavailable(error);
      } on FileSystemException catch (error) {
        throw IllustrationUnavailable(error);
      } on FormatException catch (error) {
        throw IllustrationUnavailable(error);
      } finally {
        _pending.remove(variant.filename);
      }
    });
  }

  Future<File> _load(IllustrationVariant variant) async {
    final directory = await (_directory ??= _prepare());
    await directory.create(recursive: true);
    final file = File('${directory.path}/${variant.filename}');
    if (await file.exists()) {
      try {
        await _validate(await file.readAsBytes(), variant);
        return file;
      } on FormatException {
        await file.delete();
      }
    }

    final cancel = CancelToken();
    final response = await _downloads
        .get<List<int>>(
          _origin!.resolve('/illustrations/${variant.filename}').toString(),
          options: Options(
            responseType: ResponseType.bytes,
            receiveTimeout: timeout,
          ),
          cancelToken: cancel,
        )
        .timeout(
          timeout,
          onTimeout: () {
            cancel.cancel('Illustration download deadline exceeded');
            throw TimeoutException(
              'Illustration download deadline exceeded',
              timeout,
            );
          },
        );
    final bytes = Uint8List.fromList(response.data!);
    await _validate(bytes, variant);
    final partial = File('${file.path}.part');
    try {
      await partial.writeAsBytes(bytes, flush: true);
      return await partial.rename(file.path);
    } catch (_) {
      if (await partial.exists()) await partial.delete();
      rethrow;
    }
  }

  Future<void> _validate(Uint8List bytes, IllustrationVariant variant) async {
    if (bytes.length != variant.bytes) {
      throw const FormatException('Illustration file is incomplete');
    }
    ui.Codec? codec;
    try {
      codec = await ui.instantiateImageCodec(bytes, targetWidth: 16);
      final frame = await codec.getNextFrame();
      frame.image.dispose();
    } on Exception catch (error) {
      throw FormatException('Illustration is not a readable image', error);
    } finally {
      codec?.dispose();
    }
  }
}
