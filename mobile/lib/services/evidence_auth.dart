import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';

typedef EvidenceSession = ({String ownerId, String accessToken});

/// Each metadata request, including a 401 retry, must use the queue owner's session.
/// An account change stops the hand-over; the uploader retains the original and row.
Dio ownerBoundEvidenceDio(
  String ownerId, {
  Dio? dio,
  EvidenceSession? Function()? session,
  Future<void> Function()? refresh,
}) {
  final client = dio ?? Dio(BaseOptions(baseUrl: Config.apiBase));
  EvidenceSession? current() {
    if (session != null) return session();
    final auth = Supabase.instance.client.auth.currentSession;
    return auth == null
        ? null
        : (ownerId: auth.user.id, accessToken: auth.accessToken);
  }

  DioException changed(RequestOptions request) => DioException(
    requestOptions: request,
    type: DioExceptionType.cancel,
    message: 'Account changed. Photos remain saved for their original account.',
  );
  client.interceptors.add(
    InterceptorsWrapper(
      onRequest: (request, handler) {
        final auth = current();
        if (auth == null || auth.ownerId != ownerId) {
          handler.reject(changed(request));
          return;
        }
        request.headers['Authorization'] = 'Bearer ${auth.accessToken}';
        handler.next(request);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode != 401 ||
            error.requestOptions.extra['evidenceRetried'] == true) {
          handler.next(error);
          return;
        }
        if (current()?.ownerId != ownerId) {
          handler.reject(changed(error.requestOptions));
          return;
        }
        try {
          if (refresh != null) {
            await refresh();
          } else {
            await Supabase.instance.client.auth.refreshSession();
          }
          if (current()?.ownerId != ownerId) {
            handler.reject(changed(error.requestOptions));
            return;
          }
          error.requestOptions.extra['evidenceRetried'] = true;
          handler.resolve(await client.fetch<dynamic>(error.requestOptions));
        } catch (_) {
          handler.next(error);
        }
      },
    ),
  );
  return client;
}
