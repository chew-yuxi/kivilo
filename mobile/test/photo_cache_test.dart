import 'dart:io';

import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/photo_cache.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late HttpServer server;
  late Directory root;
  final requests = <Uri>[];
  var expired = false;

  setUpAll(() async {
    // The test binding answers every real request with 400; this test needs a server.
    HttpOverrides.global = null;
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    server.listen((request) {
      requests.add(request.uri);
      final response = request.response;
      if (expired) {
        response.statusCode = HttpStatus.badRequest;
      } else {
        response.add(List.filled(1000, request.uri.path.length));
      }
      response.close();
    });
  });
  tearDownAll(() => server.close(force: true));

  setUp(() async {
    root = Directory.systemTemp.createTempSync('kivilo-photo-cache-');
    PhotoCache.directory = () async => Directory('${root.path}/photos');
    PhotoCache.maxBytes = 200 * 1024 * 1024;
    requests.clear();
    expired = false;
  });
  tearDown(() async {
    await PhotoCache.clear();
    if (root.existsSync()) root.deleteSync(recursive: true);
  });

  String link(String path, String token) =>
      'http://${server.address.host}:${server.port}/storage/v1/object/sign/captures/$path?token=$token';

  test('a photo is downloaded once whatever token its link carries', () async {
    final first = await PhotoCache.bytes(link('room/a.webp', 'one'));
    final second = await PhotoCache.bytes(link('room/a.webp', 'two'));
    expect(second, first);
    expect(requests, hasLength(1));
    expect(
      StoredNetworkImage(link('room/a.webp', 'one')),
      StoredNetworkImage(link('room/a.webp', 'two')),
    );
    expect(
      StoredNetworkImage(link('room/a.webp', 'one')),
      isNot(StoredNetworkImage(link('room/b.webp', 'one'))),
    );
  });

  test('after a restart the saved photo opens from the phone, even on an expired link', () async {
    final saved = await PhotoCache.bytes(link('room/a.webp', 'one'));
    PaintingBinding.instance.imageCache.clear();
    expired = true;
    expect(await PhotoCache.bytes(link('room/a.webp', 'old')), saved);
    expect(requests, hasLength(1));
  });

  test('a failed download is not saved, so the next link retries', () async {
    expired = true;
    await expectLater(
      PhotoCache.bytes(link('room/a.webp', 'old')),
      throwsA(isA<NetworkImageLoadException>()),
    );
    expired = false;
    expect(await PhotoCache.bytes(link('room/a.webp', 'new')), hasLength(1000));
    expect(requests, hasLength(2));
  });

  test('the oldest photos go once the folder passes its limit', () async {
    PhotoCache.maxBytes = 2500;
    final folder = await PhotoCache.directory();
    await folder.create(recursive: true);
    final old = File('${folder.path}/old')..writeAsBytesSync(List.filled(2000, 0));
    old.setLastModifiedSync(DateTime(2026));
    await PhotoCache.bytes(link('room/a.webp', 'one'));
    expect(old.existsSync(), isFalse);
    expect(folder.listSync(), hasLength(1));
  });

  test('sign-out removes every saved photo', () async {
    await PhotoCache.bytes(link('room/a.webp', 'one'));
    await PhotoCache.clear();
    expect((await PhotoCache.directory()).existsSync(), isFalse);
  });
}
