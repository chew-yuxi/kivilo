import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';
import '../models/inspection.dart';

/// Talks to the same Next.js backend the web app runs on. Every request carries the
/// Supabase access token, which the server verifies with the auth server and resolves to
/// the same Stakeholder row a browser cookie would, so both clients share one
/// authorization boundary rather than growing a second.
class Api {
  Api() : _dio = Dio(BaseOptions(baseUrl: Config.apiBase)) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = Supabase.instance.client.auth.currentSession?.accessToken;
          if (token != null) options.headers['Authorization'] = 'Bearer $token';
          handler.next(options);
        },
        onError: (error, handler) async {
          // One retry after a refresh. An access token expiring mid-walkthrough is
          // ordinary, not exceptional.
          if (error.response?.statusCode == 401 && error.requestOptions.extra['retried'] != true) {
            try {
              await Supabase.instance.client.auth.refreshSession();
              final options = error.requestOptions..extra['retried'] = true;
              return handler.resolve(await _dio.fetch(options));
            } catch (_) {
              // Fall through to the original 401.
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio _dio;

  Future<List<InspectionSummary>> inspections() async {
    final response = await _dio.get<List<dynamic>>('/api/v1/inspections');
    return (response.data ?? [])
        .map((json) => InspectionSummary.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<InspectionDetail> inspection(String id) async {
    final response = await _dio.get<Map<String, dynamic>>('/api/v1/inspections/$id');
    return InspectionDetail.fromJson(response.data!);
  }
}
