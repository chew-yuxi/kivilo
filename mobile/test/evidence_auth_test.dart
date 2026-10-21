import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/evidence_auth.dart';

class _Adapter implements HttpClientAdapter {
  _Adapter(this.status);
  final int Function(RequestOptions) status;
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => ResponseBody.fromString(
    '{}',
    status(options),
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
  @override
  void close({bool force = false}) {}
}

void main() {
  test(
    'metadata never sends a different account bearer after queue creation',
    () async {
      EvidenceSession? session = (ownerId: 'owner', accessToken: 'owner-token');
      final dio = ownerBoundEvidenceDio(
        'owner',
        dio: Dio(BaseOptions(baseUrl: 'https://example.test')),
        session: () => session,
      );
      final sent = <String>[];
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (request, handler) {
            sent.add(request.headers['Authorization'] as String);
            handler.resolve(Response(requestOptions: request, statusCode: 200));
          },
        ),
      );
      await dio.post<void>('/upload-url');
      session = (ownerId: 'other', accessToken: 'other-token');
      await expectLater(
        dio.post<void>('/photos'),
        throwsA(isA<DioException>()),
      );
      session = null;
      await expectLater(
        dio.post<void>('/photos'),
        throwsA(isA<DioException>()),
      );
      expect(sent, ['Bearer owner-token']);
    },
  );

  test(
    'account change during 401 refresh prevents the registration retry',
    () async {
      EvidenceSession? session = (ownerId: 'owner', accessToken: 'expired');
      var sends = 0;
      final dio = ownerBoundEvidenceDio(
        'owner',
        dio: Dio(BaseOptions(baseUrl: 'https://example.test')),
        session: () => session,
        refresh: () async {
          session = (ownerId: 'other', accessToken: 'other-token');
        },
      );
      dio.httpClientAdapter = _Adapter((request) {
        sends++;
        return 401;
      });
      await expectLater(
        dio.post<void>('/photos'),
        throwsA(isA<DioException>()),
      );
      expect(sends, 1);
      expect(session?.ownerId, 'other');
    },
  );

  test('same-owner refresh retries with the refreshed token once', () async {
    EvidenceSession session = (ownerId: 'owner', accessToken: 'expired');
    final sent = <String>[];
    final dio = ownerBoundEvidenceDio(
      'owner',
      dio: Dio(BaseOptions(baseUrl: 'https://example.test')),
      session: () => session,
      refresh: () async {
        session = (ownerId: 'owner', accessToken: 'fresh');
      },
    );
    dio.httpClientAdapter = _Adapter((request) {
      sent.add(request.headers['Authorization'] as String);
      return sent.length == 1 ? 401 : 200;
    });
    await dio.post<void>('/photos');
    expect(sent, ['Bearer expired', 'Bearer fresh']);
  });
}
