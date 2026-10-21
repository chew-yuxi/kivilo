import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';
import '../models/addenda.dart';
import '../models/handover.dart';
import '../models/inspection.dart';
import '../models/maintenance.dart';
import '../models/report.dart';
import '../models/renewal.dart';
import '../models/tenancy_access.dart';
import 'api_failure.dart';
import 'read_cache.dart';

export 'api_failure.dart';

/// Every mutation delegates to the web app's authorized action through /api/v1.
class Api {
  Api({Dio? dio, ReadCache? cache, bool attachAuth = true})
    : _dio = dio ?? Dio(BaseOptions(baseUrl: Config.apiBase)),
      _cache = cache ?? ReadCache() {
    if (!attachAuth) return;
    _dio.options.extra['currentOwnerId'] = () =>
        Supabase.instance.client.auth.currentUser?.id;
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final expected = options.extra['expectedOwnerId'] as String?;
          if (expected != null &&
              Supabase.instance.client.auth.currentUser?.id != expected) {
            return handler.reject(
              DioException(
                requestOptions: options,
                response: Response(requestOptions: options, statusCode: 401),
                error: const ApiFailure(
                  'Account changed. Open this page again.',
                  401,
                ),
              ),
            );
          }
          final token =
              Supabase.instance.client.auth.currentSession?.accessToken;
          if (token != null) options.headers['Authorization'] = 'Bearer $token';
          handler.next(options);
        },
        onResponse: (response, handler) {
          final expected =
              response.requestOptions.extra['expectedOwnerId'] as String?;
          if (expected != null &&
              Supabase.instance.client.auth.currentUser?.id != expected) {
            return handler.reject(
              DioException(
                requestOptions: response.requestOptions,
                response: Response(
                  requestOptions: response.requestOptions,
                  statusCode: 401,
                ),
                error: const ApiFailure(
                  'Account changed. Open this page again.',
                  401,
                ),
              ),
            );
          }
          handler.next(response);
        },
        onError: (error, handler) async {
          final expected =
              error.requestOptions.extra['expectedOwnerId'] as String?;
          if (expected != null &&
              Supabase.instance.client.auth.currentUser?.id != expected) {
            return handler.next(error);
          }
          if (error.response?.statusCode == 401 &&
              error.requestOptions.extra['retried'] != true) {
            try {
              await Supabase.instance.client.auth.refreshSession();
              if (expected != null &&
                  Supabase.instance.client.auth.currentUser?.id != expected) {
                return handler.next(error);
              }
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
    String? expectedOwnerId,
  }) {
    final cancel = CancelToken();
    // A connected radio can silently drop every packet. Bound the whole read
    // (including session refresh), then cancel it so cached capture screens can
    // open. Mutations and long-running AI requests keep their own semantics.
    return _call(
      () => _dio
          .get<T>(
            route,
            queryParameters: queryParameters,
            cancelToken: cancel,
            options: Options(extra: {'expectedOwnerId': ?expectedOwnerId}),
          )
          .timeout(
            const Duration(seconds: 8),
            onTimeout: () {
              cancel.cancel('Read deadline exceeded');
              throw const ApiFailure(
                'Kivilo did not respond. Check your signal and try again. '
                'Anything you took is saved on this phone.',
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

  Future<Object> _read(
    String route,
    String cacheKey, {
    String? expectedOwnerId,
  }) async {
    final owner = _cache.ownerId;
    try {
      final response = await _get<Object>(
        route,
        expectedOwnerId: expectedOwnerId,
      );
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

  Future<List<RenewalReminder>> renewals() async {
    final data = await _read('/api/v1/renewals', 'renewals');
    return (data as List<dynamic>)
        .map((json) => RenewalReminder.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> renewal(String tenancyId) async =>
      (await _get<Map<String, dynamic>>('/api/v1/renewals/$tenancyId')).data!;

  Future<void> respondToRenewal(String tenancyId, String choice) =>
      _call(() async {
        await _dio.patch<Object>(
          '/api/v1/renewals/$tenancyId',
          data: {'choice': choice},
        );
      });

  Future<String> createRenewal(String tenancyId, Map<String, dynamic> data) =>
      _call(() async {
        final response = await _dio.post<Map<String, dynamic>>(
          '/api/v1/renewals/$tenancyId',
          data: data,
        );
        return response.data!['id'] as String;
      });

  Future<UserProfile> me() async {
    final data = await _read('/api/v1/me', 'me');
    return UserProfile.fromJson(data as Map<String, dynamic>);
  }

  /// Public, so it is read the same with or without a session.
  Future<Map<String, dynamic>> appConfig() async =>
      (await _get<Map<String, dynamic>>('/api/v1/app-config')).data!;

  Future<AgentBranding?> branding() async => AgentBranding.fromResponse(
    await _read('/api/v1/me/branding', 'branding') as Map<String, dynamic>,
  );

  Future<WorkspacePlan> plan() async => WorkspacePlan.fromJson(
    await _read('/api/v1/me/plan', 'plan') as Map<String, dynamic>,
  );

  Future<AgentBranding?> saveBranding(Map<String, dynamic> body) =>
      _call(() async {
        final response = await _dio.put<Map<String, dynamic>>(
          '/api/v1/me/branding',
          data: body,
        );
        return AgentBranding.fromResponse(response.data!);
      });

  /// The raw image is the body. The server decides what it is from its bytes.
  Future<AgentBranding?> uploadBrandingLogo(Uint8List bytes) => _call(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/me/branding/logo',
      data: Stream.fromIterable([bytes]),
      options: Options(
        contentType: 'application/octet-stream',
        headers: {'content-length': bytes.length},
      ),
    );
    return AgentBranding.fromResponse(response.data!);
  });

  Future<AgentBranding?> removeBrandingLogo() => _call(() async {
    final response = await _dio.delete<Map<String, dynamic>>(
      '/api/v1/me/branding/logo',
    );
    return AgentBranding.fromResponse(response.data!);
  });

  /// Prints the signed report on the server; the link expires in ten minutes.
  Future<String> reportPdf(String inspectionId) => _call(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/inspections/$inspectionId/pdf',
    );
    return response.data!['url'] as String;
  });

  Future<List<TenancySummary>> tenancies() async {
    final data = await _read('/api/v1/tenancies', 'tenancies');
    return (data as List<dynamic>)
        .map((json) => TenancySummary.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<TenancyDetail> tenancy(String tenancyId) async {
    final data = await _read(
      '/api/v1/tenancies/$tenancyId',
      'tenancy:$tenancyId',
    );
    return TenancyDetail.fromJson(data as Map<String, dynamic>);
  }

  /// Access is read fresh; a cached copy cannot confirm who may collaborate now.
  Future<TenancyAccess> tenancyAccess(String tenancyId) async {
    final response = await _get<Map<String, dynamic>>(
      '/api/v1/tenancies/$tenancyId/access',
    );
    return TenancyAccess.fromJson(response.data!);
  }

  Future<void> addTenancyCollaborator(String tenancyId, String email) =>
      _call(() async {
        await _dio.post<Object>(
          '/api/v1/tenancies/$tenancyId/access',
          data: {'email': email.trim().toLowerCase()},
        );
      });

  Future<void> removeTenancyCollaborator(
    String tenancyId,
    String stakeholderId,
  ) => _call(() async {
    await _dio.delete<Object>(
      '/api/v1/tenancies/$tenancyId/access/$stakeholderId',
    );
  });

  Future<TenantHandover?> handover(String inspectionId) async {
    try {
      final response = await _get<Map<String, dynamic>>(
        '/api/v1/inspections/$inspectionId/handover',
      );
      return response.data == null
          ? null
          : TenantHandover.fromJson(response.data!);
    } on ApiFailure catch (error) {
      // Unsigned, missing and inaccessible handovers share the same absence.
      if (error.statusCode == 404) return null;
      rethrow;
    }
  }

  Future<void> updateTenancyTerms(
    String tenancyId,
    Map<String, dynamic> body,
  ) => _call(() async {
    await _dio.patch('/api/v1/tenancies/$tenancyId', data: body);
  });

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

  Future<PropertyTimeline> propertyTimeline(String propertyId) async {
    final data = await _read(
      '/api/v1/properties/$propertyId/timeline',
      'property-timeline:$propertyId',
    );
    return PropertyTimeline.fromJson(data as Map<String, dynamic>);
  }

  Future<SignedReport> report(String inspectionId) async {
    final data = await _read(
      '/api/v1/inspections/$inspectionId/report',
      'report:$inspectionId',
    );
    return SignedReport.fromJson(data as Map<String, dynamic>);
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

  Future<void> recordMoveInDefect(String caseId, Map<String, dynamic> body) =>
      _call(() async {
        await _dio.post(
          '/api/v1/maintenance/$caseId/move-in-defect',
          data: body,
        );
      });

  Future<void> disputeAddendum(String addendumId, String reason) =>
      _call(() async {
        await _dio.post(
          '/api/v1/addenda/$addendumId/dispute',
          data: {'reason': reason},
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

  Future<void> proposeResponsibility(
    String caseId,
    Map<String, dynamic> body,
  ) => _call(() async {
    await _dio.post('/api/v1/maintenance/$caseId/responsibility', data: body);
  });

  /// [decision] is ACCEPT, REJECT (note required) or WITHDRAW.
  Future<void> answerResponsibility(
    String caseId,
    String proposalId,
    String decision, {
    String? note,
  }) => _call(() async {
    await _dio.post(
      '/api/v1/maintenance/$caseId/responsibility/$proposalId',
      data: {'decision': decision, 'note': ?note},
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
      'tenancyId': detail.tenancyRecordId,
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

  Future<void> finishRoom(String inspectionId, String roomId) => _call(
    () async {
      await _dio.post('/api/v1/inspections/$inspectionId/rooms/$roomId/finish');
    },
  );

  Future<void> markRoomReviewed(
    String inspectionId,
    String roomId, {
    bool nothingToRecord = false,
  }) => _call(() async {
    await _dio.post(
      '/api/v1/inspections/$inspectionId/rooms/$roomId/review',
      data: {if (nothingToRecord) 'nothingToRecord': true},
    );
  });

  Future<String> addItem(String inspectionId, String roomId) => _call(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/inspections/$inspectionId/rooms/$roomId/items',
    );
    return response.data!['id'] as String;
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

  /// The signed-in landlord or tenant signs their own report.
  Future<void> signOwnReport(String inspectionId, String imageData) =>
      _call(() async {
        await _dio.post(
          '/api/v1/inspections/$inspectionId/report/signature',
          data: {'imageData': imageData},
        );
      });

  /// The signed-in landlord or tenant acknowledges an update to their report. Like
  /// signing, the server takes the party from the token, not from the request.
  Future<void> acknowledgeAddendum(String addendumId) => _call(() async {
    await _dio.post('/api/v1/addenda/$addendumId/acknowledgement');
  });

  /// The report a published update belongs to, for a notification that names only the
  /// update.
  Future<String> addendumReport(String addendumId) => _call(() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/api/v1/addenda/$addendumId',
    );
    return response.data!['inspectionId'] as String;
  });

  /// The landlord or tenant acknowledges on this (the agent's) phone. The server checks
  /// the party belongs to the tenancy.
  Future<void> acknowledgeAddendumInPerson(
    String addendumId,
    String stakeholderId,
  ) => _call(() async {
    await _dio.post(
      '/api/v1/addenda/$addendumId/in-person-acknowledgement',
      data: {'stakeholderId': stakeholderId},
    );
  });

  /// Agrees or disputes the deposit statement in assessment `version`. With no
  /// `stakeholderId` the party is whoever holds the token; with one, a party answering
  /// on this (the agent's) phone, which the server checks belongs to the tenancy.
  Future<void> answerDepositStatement(
    String inspectionId, {
    required int version,
    required bool agreed,
    String? reason,
    String? stakeholderId,
  }) => _call(() async {
    await _dio.post(
      '/api/v1/inspections/$inspectionId/deposit-statement',
      data: {
        'version': version,
        'answer': agreed ? 'AGREED' : 'DISPUTED',
        'reason': ?reason,
        'stakeholderId': ?stakeholderId,
      },
    );
  });

  /// "Add to the report as an update" on a resolved repair. Returns the check-in whose
  /// draft update now carries it, where the agent finishes and publishes it.
  Future<String> addendumFromMaintenanceCase(String caseId) => _call(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/maintenance/$caseId/addendum',
    );
    return response.data!['inspectionId'] as String;
  });

  /// Updates since signing on a countersigned check-in, with the open draft.
  Future<AddendaWorkspace> addenda(String inspectionId) async {
    final data = await _read(
      '/api/v1/inspections/$inspectionId/addenda',
      'addenda:$inspectionId',
    );
    return AddendaWorkspace.fromJson(data as Map<String, dynamic>);
  }

  /// Opens the draft update, or returns the one already open.
  Future<String> startAddendum(String inspectionId) => _call(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/inspections/$inspectionId/addenda',
    );
    return response.data!['id'] as String;
  });

  Future<void> updateAddendum(
    String addendumId, {
    required String title,
    required String? reason,
    required String effectiveDate,
  }) => _call(() async {
    await _dio.patch(
      '/api/v1/addenda/$addendumId',
      data: {'title': title, 'reason': reason, 'effectiveDate': effectiveDate},
    );
  });

  Future<void> discardAddendum(String addendumId) => _call(() async {
    await _dio.delete('/api/v1/addenda/$addendumId');
  });

  Future<void> addAddendumEntry(String addendumId, Map<String, dynamic> body) =>
      _call(() async {
        await _dio.post('/api/v1/addenda/$addendumId/entries', data: body);
      });

  Future<void> updateAddendumEntry(
    String addendumId,
    String entryId,
    Map<String, dynamic> body,
  ) => _call(() async {
    await _dio.patch(
      '/api/v1/addenda/$addendumId/entries/$entryId',
      data: body,
    );
  });

  Future<void> deleteAddendumEntry(String addendumId, String entryId) =>
      _call(() async {
        await _dio.delete('/api/v1/addenda/$addendumId/entries/$entryId');
      });

  Future<void> deleteAddendumPhoto(String addendumId, String photoId) =>
      _call(() async {
        await _dio.delete('/api/v1/addenda/$addendumId/photos/$photoId');
      });

  Future<void> publishAddendum(String addendumId) => _call(() async {
    await _dio.post('/api/v1/addenda/$addendumId/publish');
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

  /// Emails the landlord or tenant the link to review and sign on their own phone.
  Future<void> emailSigningLink(String inspectionId, String stakeholderId) =>
      _call(() async {
        await _dio.post(
          '/api/v1/inspections/$inspectionId/signing-email',
          data: {'stakeholderId': stakeholderId},
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

  Future<void> createFinding(
    String inspectionId,
    Map<String, dynamic> data, {
    String? ownerId,
  }) => _call(() async {
    await _dio.post(
      '/api/v1/inspections/$inspectionId/findings',
      data: data,
      options: Options(extra: {'expectedOwnerId': ?ownerId}),
    );
  });

  Future<Map<String, dynamic>> findingPhotoDraft(
    String inspectionId,
    String draftId, {
    String? ownerId,
  }) async =>
      await _read(
            '/api/v1/inspections/$inspectionId/finding-photo-drafts/$draftId',
            'finding-photos-$inspectionId-$draftId',
            expectedOwnerId: ownerId,
          )
          as Map<String, dynamic>;

  Future<void> discardFindingPhotoDraft(
    String inspectionId,
    String draftId, {
    String? ownerId,
  }) => _call(() async {
    await _dio.delete(
      '/api/v1/inspections/$inspectionId/finding-photo-drafts/$draftId',
      options: Options(extra: {'expectedOwnerId': ?ownerId}),
    );
  });

  Future<void> deleteFinding(
    String inspectionId,
    String findingId, {
    String? ownerId,
  }) => _call(() async {
    await _dio.delete(
      '/api/v1/inspections/$inspectionId/findings/$findingId',
      options: Options(extra: {'expectedOwnerId': ?ownerId}),
    );
  });

  Future<void> updateFinding(
    String inspectionId,
    String findingId,
    Map<String, dynamic> data, {
    String? ownerId,
  }) => _call(() async {
    await _dio.patch(
      '/api/v1/inspections/$inspectionId/findings/$findingId',
      data: data,
      options: Options(extra: {'expectedOwnerId': ?ownerId}),
    );
  });

  Future<void> publishFindings(
    String inspectionId, {
    bool noFindings = false,
  }) => _call(() async {
    await _dio.post(
      '/api/v1/inspections/$inspectionId/findings/publish',
      data: {if (noFindings) 'noFindings': true},
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
}
