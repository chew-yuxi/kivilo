import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';
import '../models/inspection.dart';
import 'read_cache.dart';

class ApiFailure implements Exception {
  const ApiFailure(this.message, this.statusCode);

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

/// Every mutation delegates to the web app's authorized action through /api/v1.
class Api {
  Api({Dio? dio, ReadCache? cache, bool attachAuth = true})
    : _dio = dio ?? Dio(BaseOptions(baseUrl: Config.apiBase)),
      _cache = cache ?? ReadCache() {
    if (!attachAuth) return;
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token =
              Supabase.instance.client.auth.currentSession?.accessToken;
          if (token != null) options.headers['Authorization'] = 'Bearer $token';
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401 &&
              error.requestOptions.extra['retried'] != true) {
            try {
              await Supabase.instance.client.auth.refreshSession();
              final options = error.requestOptions..extra['retried'] = true;
              return handler.resolve(await _dio.fetch(options));
            } catch (refreshError) {
              debugPrint('Session refresh failed: $refreshError');
              return handler.next(error);
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio _dio;
  final ReadCache _cache;
  bool offlineCopy = false;
  Dio get dio => _dio;

  Future<T> _call<T>(Future<T> Function() request) async {
    try {
      return await request();
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      final code = error.response?.data is Map
          ? (error.response!.data as Map)['error']
          : null;
      final message = switch (code) {
        'unauthorized' => 'Your session has expired. Please sign in again.',
        'not_found' => 'This record was not found or you cannot access it.',
        'report_frozen' =>
          'This report has been sent for signature and cannot be changed.',
        'invalid_request' => 'Please check the details and try again.',
        'review_incomplete' => 'Finish reviewing every room before sending.',
        'assessment_review_incomplete' =>
          'Open and confirm every finding before publishing the assessment.',
        'invalid_state' =>
          'This action is not available at the current report stage.',
        'capture_conflict' =>
          'This capture was already registered differently.',
        'capture_missing' =>
          'Upload has not reached storage. The saved file remains on this phone; retry upload.',
        'consent_required' =>
          'Allow AI processing before drafting this report.',
        _ =>
          status == null
              ? 'Could not connect. Your saved captures remain on this device.'
              : 'The server could not complete this request ($status).',
      };
      throw ApiFailure(message, status);
    }
  }

  Future<Object> _read(String route, String cacheKey) async {
    try {
      final response = await _call(() => _dio.get<Object>(route));
      offlineCopy = false;
      await _cache.write(cacheKey, response.data);
      return response.data!;
    } on ApiFailure catch (error) {
      if (error.statusCode != null) rethrow;
      final cached = await _cache.read(cacheKey);
      if (cached == null) rethrow;
      offlineCopy = true;
      return cached;
    }
  }

  Future<List<InspectionSummary>> inspections() async {
    final data = await _read('/api/v1/inspections', 'inspections');
    return (data as List<dynamic>)
        .map((json) => InspectionSummary.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<InspectionDetail> inspection(String id) async {
    final data = await _read('/api/v1/inspections/$id', 'inspection:$id');
    return InspectionDetail.fromJson(data as Map<String, dynamic>);
  }

  Future<RoomDetail> room(String inspectionId, String roomId) async {
    final data = await _read(
      '/api/v1/inspections/$inspectionId/rooms/$roomId',
      'room:$inspectionId:$roomId',
    );
    return RoomDetail.fromJson(data as Map<String, dynamic>);
  }

  Future<String> createInspection(Map<String, dynamic> body) => _call(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/inspections',
      data: body,
    );
    return response.data!['id'] as String;
  });

  Future<String> addRoom(String inspectionId, String name) => _call(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/inspections/$inspectionId/rooms',
      data: {'name': name},
    );
    return response.data!['id'] as String;
  });

  Future<void> renameRoom(String inspectionId, String roomId, String name) =>
      _call(() async {
        await _dio.patch(
          '/api/v1/inspections/$inspectionId/rooms/$roomId',
          data: {'name': name},
        );
      });

  Future<void> deleteRoom(String inspectionId, String roomId) =>
      _call(() async {
        await _dio.delete('/api/v1/inspections/$inspectionId/rooms/$roomId');
      });

  Future<void> processRoom(String inspectionId, String roomId) => _call(
    () async {
      await _dio.post('/api/v1/inspections/$inspectionId/rooms/$roomId/finish');
    },
  );

  Future<void> markRoomReviewed(String inspectionId, String roomId) => _call(
    () async {
      await _dio.post('/api/v1/inspections/$inspectionId/rooms/$roomId/review');
    },
  );

  Future<void> addItem(String inspectionId, String roomId) => _call(() async {
    await _dio.post('/api/v1/inspections/$inspectionId/rooms/$roomId/items');
  });

  Future<void> updateItem(
    String inspectionId,
    String itemId,
    Map<String, dynamic> data,
  ) => _call(() async {
    await _dio.patch(
      '/api/v1/inspections/$inspectionId/items/$itemId',
      data: data,
    );
  });

  Future<void> deleteItem(String inspectionId, String itemId) =>
      _call(() async {
        await _dio.delete('/api/v1/inspections/$inspectionId/items/$itemId');
      });

  Future<void> completeReview(String inspectionId) => _call(() async {
    await _dio.post('/api/v1/inspections/$inspectionId/review');
  });

  Future<void> sign(
    String inspectionId,
    String stakeholderId,
    String imageData,
  ) => _call(() async {
    await _dio.post(
      '/api/v1/inspections/$inspectionId/signatures',
      data: {'stakeholderId': stakeholderId, 'imageData': imageData},
    );
  });

  Future<String> share(String inspectionId) => _call(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/inspections/$inspectionId/share',
    );
    return response.data!['shareUrl'] as String;
  });

  Future<void> revokeShare(String inspectionId) => _call(() async {
    await _dio.delete('/api/v1/inspections/$inspectionId/share');
  });

  Future<String> startCheckOut(String inspectionId) => _call(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/inspections/$inspectionId/checkout',
    );
    return response.data!['id'] as String;
  });

  Future<void> runFindings(String inspectionId) => _call(() async {
    await _dio.post('/api/v1/inspections/$inspectionId/findings/run');
  });

  Future<void> updateFinding(
    String inspectionId,
    String findingId,
    Map<String, dynamic> data,
  ) => _call(() async {
    await _dio.patch(
      '/api/v1/inspections/$inspectionId/findings/$findingId',
      data: data,
    );
  });

  Future<void> publishFindings(String inspectionId) => _call(() async {
    await _dio.post(
      '/api/v1/inspections/$inspectionId/findings/publish',
      data: {},
    );
  });

  Future<Map<String, dynamic>> deletionRequest() => _call(() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/api/v1/account/deletion-request',
    );
    return response.data!;
  });

  Future<void> requestDeletion() => _call(() async {
    await _dio.post('/api/v1/account/deletion-request');
  });

  Future<void> consentToAiProcessing(String inspectionId) => _call(() async {
    await _dio.post(
      '/api/v1/inspections/$inspectionId/ai-consent',
      data: {'consent': true},
    );
  });
}
