import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';
import '../models/inspection.dart';
import '../models/maintenance.dart';
import 'api_failure.dart';
import 'read_cache.dart';

export 'api_failure.dart';

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
      throw ApiFailure.fromDio(error);
    }
  }

  Future<Response<T>> _get<T>(
    String route, {
    Map<String, dynamic>? queryParameters,
  }) {
    final cancel = CancelToken();
    // A connected radio can silently drop every packet. Bound the whole read
    // (including session refresh), then cancel it so cached capture screens can
    // open. Mutations and long-running AI requests keep their own semantics.
    return _call(
      () => _dio
          .get<T>(route, queryParameters: queryParameters, cancelToken: cancel)
          .timeout(
            const Duration(seconds: 8),
            onTimeout: () {
              cancel.cancel('Read deadline exceeded');
              throw const ApiFailure(
                'The server did not respond. Check your connection and retry. '
                'Saved captures remain on this device.',
                null,
              );
            },
          ),
    );
  }

  void _checkOwner(String? owner) {
    if (_cache.ownerId != owner) {
      throw const ApiFailure('Account changed. Open this page again.', 401);
    }
  }

  Future<Object> _read(String route, String cacheKey) async {
    final owner = _cache.ownerId;
    try {
      final response = await _get<Object>(route);
      _checkOwner(owner);
      if (owner != null) {
        await _cache.writeForOwner(owner, cacheKey, response.data);
      }
      _checkOwner(owner);
      offlineCopy = false;
      return response.data!;
    } on ApiFailure catch (error) {
      if (error.statusCode != null) rethrow;
      _checkOwner(owner);
      final cached = owner == null
          ? null
          : await _cache.readForOwner(owner, cacheKey);
      _checkOwner(owner);
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

  Future<UserProfile> me() async {
    final data = await _read('/api/v1/me', 'me');
    return UserProfile.fromJson(data as Map<String, dynamic>);
  }

  Future<List<TenancySummary>> tenancies() async {
    final data = await _read('/api/v1/tenancies', 'tenancies');
    return (data as List<dynamic>)
        .map((json) => TenancySummary.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<List<MaintenanceCaseSummary>> maintenanceCases(
    String tenancyId,
  ) async {
    final data = await _read(
      '/api/v1/tenancies/$tenancyId/maintenance',
      'maintenance:$tenancyId',
    );
    return (data as List<dynamic>)
        .map(
          (json) =>
              MaintenanceCaseSummary.fromJson(json as Map<String, dynamic>),
        )
        .toList();
  }

  Future<MaintenanceCaseDetail> maintenanceCase(String caseId) async {
    final data = await _read(
      '/api/v1/maintenance/$caseId',
      'maintenance-case:$caseId',
    );
    return MaintenanceCaseDetail.fromJson(data as Map<String, dynamic>);
  }

  Future<List<PropertyAssetSummary>> propertyAssets(String propertyId) async {
    final data = await _read(
      '/api/v1/properties/$propertyId/assets',
      'property-assets:$propertyId',
    );
    return (data as List<dynamic>)
        .map(
          (json) => PropertyAssetSummary.fromJson(json as Map<String, dynamic>),
        )
        .toList();
  }

  Future<String> createPropertyAsset(
    String propertyId,
    Map<String, dynamic> body,
  ) => _call(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/properties/$propertyId/assets',
      data: body,
    );
    return response.data!['id'] as String;
  });

  Future<String> createMaintenanceCase(
    String tenancyId,
    Map<String, dynamic> body,
  ) => _call(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/tenancies/$tenancyId/maintenance',
      data: body,
    );
    return response.data!['id'] as String;
  });

  Future<void> updateMaintenanceCase(
    String caseId,
    String status, {
    String? resolutionReason,
  }) => _call(() async {
    await _dio.patch(
      '/api/v1/maintenance/$caseId',
      data: {'status': status, 'resolutionReason': resolutionReason},
    );
  });

  Future<void> addMaintenanceComment(String caseId, String body) =>
      _call(() async {
        await _dio.post(
          '/api/v1/maintenance/$caseId/events',
          data: {'body': body},
        );
      });

  Future<String> addMaintenanceVisit(
    String caseId, {
    String? providerId,
    DateTime? scheduledAt,
    DateTime? completedAt,
    String? notes,
    String? cost,
  }) => _call(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/maintenance/$caseId/visits',
      data: {
        'providerId': providerId,
        'scheduledAt': scheduledAt?.toUtc().toIso8601String(),
        'completedAt': completedAt?.toUtc().toIso8601String(),
        'notes': notes,
        'cost': cost,
      },
    );
    return response.data!['id'] as String;
  });

  Future<void> verifyMaintenanceVisit(
    String caseId,
    String visitId,
    String outcome, {
    String? note,
  }) => _call(() async {
    await _dio.post(
      '/api/v1/maintenance/$caseId/visits/$visitId/verification',
      data: {'outcome': outcome, 'note': note},
    );
  });

  Future<List<ServiceProviderModel>> serviceProviders({
    String? category,
  }) async {
    final response = await _get<Map<String, dynamic>>(
      '/api/v1/service-providers',
      queryParameters: category == null ? const {} : {'category': category},
    );
    return (response.data!['providers'] as List<dynamic>)
        .map(
          (json) => ServiceProviderModel.fromJson(json as Map<String, dynamic>),
        )
        .toList();
  }

  Future<List<NotificationModel>> notifications() async {
    final data = await _read('/api/v1/notifications', 'notifications');
    return (data as List<dynamic>)
        .map((json) => NotificationModel.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<void> markNotificationRead(String id) => _call(() async {
    await _dio.patch('/api/v1/notifications/$id');
  });

  Future<void> registerPushDevice(String token, String platform) =>
      _call(() async {
        await _dio.post(
          '/api/v1/notifications/device',
          data: {'token': token, 'platform': platform},
        );
      });

  Future<void> disablePushDevice(String token) => _call(() async {
    await _dio.delete('/api/v1/notifications/device', data: {'token': token});
  });

  Future<InspectionDetail> inspection(String id) async {
    final owner = _cache.ownerId;
    final data = await _read('/api/v1/inspections/$id', 'inspection:$id');
    final detail = InspectionDetail.fromJson(data as Map<String, dynamic>);
    _checkOwner(owner);
    if (owner == null) return detail;
    final cached = await _cache.readForOwner(owner, 'inspections');
    _checkOwner(owner);
    final summaries = cached == null
        ? <dynamic>[]
        : List<dynamic>.from(cached as List<dynamic>);
    final summary = {
      'id': detail.id,
      'kind': detail.kind,
      'status': detail.status,
      'property': detail.property,
      'tenant': detail.tenant,
      'rooms': detail.rooms.length,
    };
    final previous = summaries.indexWhere(
      (entry) => entry is Map && entry['id'] == detail.id,
    );
    if (previous == -1) {
      summaries.insert(0, summary);
    } else {
      summaries[previous] = summary;
    }
    await _cache.writeForOwner(owner, 'inspections', summaries);
    _checkOwner(owner);
    return detail;
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

  Future<Map<String, dynamic>> deletionRequest() async {
    final response = await _get<Map<String, dynamic>>(
      '/api/v1/account/deletion-request',
    );
    return response.data!;
  }

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
