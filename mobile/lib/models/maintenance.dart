class UserProfile {
  const UserProfile({
    required this.id,
    required this.name,
    required this.roles,
  });
  final String id;
  final String name;
  final List<String> roles;

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json['id'] as String,
    name: json['name'] as String,
    roles: (json['roles'] as List<dynamic>).cast<String>(),
  );
}

class TenancySummary {
  const TenancySummary({
    required this.id,
    required this.role,
    required this.propertyId,
    required this.property,
    required this.postalCode,
    required this.landlord,
    required this.tenant,
    required this.maintenanceCases,
    required this.inspections,
  });
  final String id;
  final String role;
  final String propertyId;
  final String property;
  final String postalCode;
  final String landlord;
  final String tenant;
  final int maintenanceCases;
  final int inspections;

  factory TenancySummary.fromJson(Map<String, dynamic> json) => TenancySummary(
    id: json['id'] as String,
    role: json['role'] as String,
    propertyId: json['propertyId'] as String,
    property: json['property'] as String,
    postalCode: json['postalCode'] as String,
    landlord: json['landlord'] as String,
    tenant: json['tenant'] as String,
    maintenanceCases: json['maintenanceCases'] as int,
    inspections: json['inspections'] as int,
  );
}

class MaintenanceCaseSummary {
  const MaintenanceCaseSummary({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.priority,
    required this.status,
    required this.repairAttempts,
    this.asset,
  });
  final String id;
  final String title;
  final String description;
  final String category;
  final String priority;
  final String status;
  final int repairAttempts;
  final String? asset;

  factory MaintenanceCaseSummary.fromJson(Map<String, dynamic> json) =>
      MaintenanceCaseSummary(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        category: json['category'] as String,
        priority: json['priority'] as String,
        status: json['status'] as String,
        repairAttempts: json['repairAttempts'] as int,
        asset: json['asset'] as String?,
      );
}

class PropertyAssetSummary {
  const PropertyAssetSummary({
    required this.id,
    required this.name,
    required this.category,
    required this.repairVisitsLast365Days,
    this.roomLabel,
    this.identifier,
  });
  final String id;
  final String name;
  final String category;
  final int repairVisitsLast365Days;
  final String? roomLabel;
  final String? identifier;

  factory PropertyAssetSummary.fromJson(Map<String, dynamic> json) =>
      PropertyAssetSummary(
        id: json['id'] as String,
        name: json['name'] as String,
        category: json['category'] as String,
        repairVisitsLast365Days: json['repairVisitsLast365Days'] as int,
        roomLabel: json['roomLabel'] as String?,
        identifier: json['identifier'] as String?,
      );
}

class MaintenanceVisitModel {
  const MaintenanceVisitModel({
    required this.id,
    this.scheduledAt,
    this.completedAt,
    this.notes,
    this.verificationOutcome,
  });
  final String id;
  final String? scheduledAt;
  final String? completedAt;
  final String? notes;
  final String? verificationOutcome;

  factory MaintenanceVisitModel.fromJson(Map<String, dynamic> json) =>
      MaintenanceVisitModel(
        id: json['id'] as String,
        scheduledAt: json['scheduledAt'] as String?,
        completedAt: json['completedAt'] as String?,
        notes: json['notes'] as String?,
        verificationOutcome:
            (json['verification'] as Map<String, dynamic>?)?['outcome']
                as String?,
      );
}

class MaintenanceEvidenceModel {
  const MaintenanceEvidenceModel({
    required this.id,
    required this.purpose,
    required this.mimeType,
    required this.url,
    required this.createdAt,
    this.visitId,
    this.note,
  });

  final String id;
  final String purpose;
  final String mimeType;
  final String url;
  final String createdAt;
  final String? visitId;
  final String? note;

  bool get isImage => mimeType.startsWith('image/');

  factory MaintenanceEvidenceModel.fromJson(Map<String, dynamic> json) =>
      MaintenanceEvidenceModel(
        id: json['id'] as String,
        purpose: json['purpose'] as String,
        mimeType: json['mimeType'] as String,
        url: json['url'] as String,
        createdAt: json['createdAt'] as String,
        visitId: json['visitId'] as String?,
        note: json['note'] as String?,
      );
}

class MaintenanceCaseDetail {
  const MaintenanceCaseDetail({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.property,
    required this.role,
    required this.canManage,
    required this.canVerify,
    required this.visits,
    required this.evidence,
    required this.events,
  });
  final String id;
  final String title;
  final String description;
  final String status;
  final String priority;
  final String property;
  final String role;
  final bool canManage;
  final bool canVerify;
  final List<MaintenanceVisitModel> visits;
  final List<MaintenanceEvidenceModel> evidence;
  final List<Map<String, dynamic>> events;

  factory MaintenanceCaseDetail.fromJson(
    Map<String, dynamic> json,
  ) => MaintenanceCaseDetail(
    id: json['id'] as String,
    title: json['title'] as String,
    description: json['description'] as String,
    status: json['status'] as String,
    priority: json['priority'] as String,
    property: json['property'] as String,
    role: json['role'] as String,
    canManage: json['canManage'] as bool,
    canVerify: json['canVerify'] as bool,
    visits: (json['visits'] as List<dynamic>)
        .map(
          (entry) =>
              MaintenanceVisitModel.fromJson(entry as Map<String, dynamic>),
        )
        .toList(),
    evidence: (json['evidence'] as List<dynamic>)
        .map(
          (entry) =>
              MaintenanceEvidenceModel.fromJson(entry as Map<String, dynamic>),
        )
        .toList(),
    events: (json['events'] as List<dynamic>).cast<Map<String, dynamic>>(),
  );
}

class ServiceProviderModel {
  const ServiceProviderModel({
    required this.id,
    required this.name,
    required this.category,
    required this.phone,
    required this.lastVerifiedAt,
    this.whatsapp,
    this.hours,
  });
  final String id;
  final String name;
  final String category;
  final String phone;
  final String? whatsapp;
  final String? hours;
  final String lastVerifiedAt;

  factory ServiceProviderModel.fromJson(Map<String, dynamic> json) =>
      ServiceProviderModel(
        id: json['id'] as String,
        name: json['name'] as String,
        category: json['category'] as String,
        phone: json['phone'] as String,
        whatsapp: json['whatsapp'] as String?,
        hours: json['hours'] as String?,
        lastVerifiedAt: json['lastVerifiedAt'] as String,
      );
}

class NotificationModel {
  const NotificationModel({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    this.href,
    this.readAt,
  });
  final String id;
  final String title;
  final String body;
  final String? href;
  final String? readAt;
  final String createdAt;

  factory NotificationModel.fromJson(Map<String, dynamic> json) =>
      NotificationModel(
        id: json['id'] as String,
        title: json['title'] as String,
        body: json['body'] as String,
        href: json['href'] as String?,
        readAt: json['readAt'] as String?,
        createdAt: json['createdAt'] as String,
      );
}
