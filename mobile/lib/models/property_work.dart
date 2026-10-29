import 'maintenance.dart';

/// One property in the Properties tab, at the stage of its newest term.
class PropertyWorkItem {
  const PropertyWorkItem({
    required this.id,
    required this.address,
    required this.state,
    required this.tenant,
    required this.stage,
    required this.stageLabel,
    required this.reports,
    this.agencyName,
    this.leadAgentName,
    this.nextInspectionId,
    this.nextInspectionKind,
    this.startDate,
    this.endDate,
    this.coverUrl,
    this.nextStep,
    this.attention = const PropertyAttention(),
  });
  final String id;
  final String address;
  final String state;
  final String tenant;
  final String stage;
  final String stageLabel;
  final int reports;
  final String? agencyName;
  final String? leadAgentName;
  final String? nextInspectionId;
  final String? nextInspectionKind;

  /// The current term's lease, for the card's timeline. Absent in a copy saved before
  /// the server sent them.
  final String? startDate;
  final String? endDate;

  /// A photo from the newest check-in, its small copy where there is one.
  final String? coverUrl;

  /// What is next and who it waits on, where the stage label alone would be vague.
  final String? nextStep;
  final PropertyAttention attention;

  factory PropertyWorkItem.fromJson(Map<String, dynamic> json) =>
      PropertyWorkItem(
        id: json['id'] as String,
        address: json['address'] as String,
        state: json['state'] as String,
        tenant: json['tenant'] as String,
        stage: json['stage'] as String,
        stageLabel: json['stageLabel'] as String,
        reports: json['reports'] as int,
        agencyName: json['agencyName'] as String?,
        leadAgentName: json['leadAgentName'] as String?,
        nextInspectionId: json['nextInspectionId'] as String?,
        nextInspectionKind: json['nextInspectionKind'] as String?,
        startDate: json['startDate'] as String?,
        endDate: json['endDate'] as String?,
        coverUrl: json['coverUrl'] as String?,
        nextStep: json['nextStep'] as String?,
        attention: json['attention'] == null
            ? const PropertyAttention()
            : PropertyAttention.fromJson(
                json['attention'] as Map<String, dynamic>,
              ),
      );
}

/// What is waiting on someone at a property, as counts for the card.
class PropertyAttention {
  const PropertyAttention({
    this.openRepairs = 0,
    this.pendingUpdates = 0,
    this.depositAnswersMissing = 0,
  });
  final int openRepairs;
  final int pendingUpdates;
  final int depositAnswersMissing;

  factory PropertyAttention.fromJson(Map<String, dynamic> json) =>
      PropertyAttention(
        openRepairs: json['openRepairs'] as int? ?? 0,
        pendingUpdates: json['pendingUpdates'] as int? ?? 0,
        depositAnswersMissing: json['depositAnswersMissing'] as int? ?? 0,
      );
}

class PropertyReport {
  const PropertyReport({
    required this.id,
    required this.kind,
    required this.status,
    required this.createdAt,
  });
  final String id;
  final String kind;
  final String status;
  final String createdAt;

  String get kindLabel => kind == 'CHECK_OUT' ? 'Check-out' : 'Check-in';

  factory PropertyReport.fromJson(Map<String, dynamic> json) => PropertyReport(
    id: json['id'] as String,
    kind: json['kind'] as String,
    status: json['status'] as String,
    createdAt: json['createdAt'] as String,
  );
}

/// One tenancy at the property. [tenancy] is set when its repairs and assets screen
/// can be opened, which needs a running term.
class PropertyTerm {
  const PropertyTerm({
    required this.tenancyId,
    required this.startDate,
    required this.endDate,
    required this.tenant,
    required this.landlord,
    required this.reports,
    this.landlordEmail,
    this.tenantEmail,
    this.monthlyRent,
    this.deposit,
    this.canEditDetails = false,
    this.detailsLockedReason,
    this.agencyName,
    this.leadAgentName,
    this.tenancy,
    this.canOpenDocuments = false,
  });
  final String tenancyId;
  final String startDate;
  final String endDate;
  final String tenant;
  final String landlord;
  final String? landlordEmail;
  final String? tenantEmail;
  final String? monthlyRent;
  final String? deposit;
  final bool canEditDetails;
  final String? detailsLockedReason;
  final List<PropertyReport> reports;
  final String? agencyName;
  final String? leadAgentName;
  final TenancySummary? tenancy;
  final bool canOpenDocuments;

  factory PropertyTerm.fromJson(Map<String, dynamic> json) => PropertyTerm(
    tenancyId: json['tenancyId'] as String,
    canOpenDocuments: json['canOpenDocuments'] as bool? ?? false,
    startDate: json['startDate'] as String,
    endDate: json['endDate'] as String,
    tenant: json['tenant'] as String,
    landlord: json['landlord'] as String,
    landlordEmail: json['landlordEmail'] as String?,
    tenantEmail: json['tenantEmail'] as String?,
    monthlyRent: json['monthlyRent'] as String?,
    deposit: json['deposit'] as String?,
    canEditDetails: json['canEditDetails'] as bool? ?? false,
    detailsLockedReason: json['detailsLockedReason'] as String?,
    agencyName: json['agencyName'] as String?,
    leadAgentName: json['leadAgentName'] as String?,
    tenancy: json['tenancy'] == null
        ? null
        : TenancySummary.fromJson(json['tenancy'] as Map<String, dynamic>),
    reports: (json['reports'] as List<dynamic>)
        .map((value) => PropertyReport.fromJson(value as Map<String, dynamic>))
        .toList(),
  );
}

class PropertyOverview {
  const PropertyOverview({
    required this.id,
    required this.address,
    required this.line1,
    required this.postalCode,
    required this.propertyType,
    required this.state,
    required this.stage,
    required this.stageLabel,
    required this.canOpenTimeline,
    required this.terms,
    this.unit,
    this.canEditPropertyDetails = false,
    this.propertyDetailsLockedReason,
    this.nextInspectionId,
    this.nextInspectionKind,
  });
  final String id;
  final String address;
  final String line1;
  final String? unit;
  final String postalCode;
  final String propertyType;
  final String state;
  final String stage;
  final String stageLabel;
  final bool canOpenTimeline;
  final bool canEditPropertyDetails;
  final String? propertyDetailsLockedReason;
  final List<PropertyTerm> terms;
  final String? nextInspectionId;
  final String? nextInspectionKind;

  factory PropertyOverview.fromJson(
    Map<String, dynamic> json,
  ) => PropertyOverview(
    id: json['id'] as String,
    address: json['address'] as String,
    line1: json['line1'] as String? ?? json['address'] as String,
    unit: json['unit'] as String?,
    postalCode: json['postalCode'] as String? ?? '',
    propertyType: json['propertyType'] as String? ?? 'PRIVATE_NON_LANDED',
    state: json['state'] as String,
    stage: json['stage'] as String,
    stageLabel: json['stageLabel'] as String,
    canOpenTimeline: json['canOpenTimeline'] as bool,
    canEditPropertyDetails: json['canEditPropertyDetails'] as bool? ?? false,
    propertyDetailsLockedReason: json['propertyDetailsLockedReason'] as String?,
    nextInspectionId: json['nextInspectionId'] as String?,
    nextInspectionKind: json['nextInspectionKind'] as String?,
    terms: (json['terms'] as List<dynamic>)
        .map((value) => PropertyTerm.fromJson(value as Map<String, dynamic>))
        .toList(),
  );
}

/// A property where this account may start a new tenancy, for New check-in's picker.
/// [rooms] are the last check-in's room names, offered to start with; names only.
class StartableProperty {
  const StartableProperty({
    required this.id,
    required this.address,
    required this.propertyType,
    required this.lastTenant,
    required this.lastEndDate,
    this.agencyId,
    this.agencyName,
    this.furnishingLevel,
    this.rooms = const [],
    this.lastLandlordName,
    this.lastLandlordEmail,
  });
  final String id;
  final String address;
  final String propertyType;
  final String lastTenant;
  final String lastEndDate;
  final String? agencyId;
  final String? agencyName;
  final String? furnishingLevel;
  final List<String> rooms;

  /// The latest tenancy's landlord, offered as the new tenancy's.
  final String? lastLandlordName;
  final String? lastLandlordEmail;

  factory StartableProperty.fromJson(Map<String, dynamic> json) =>
      StartableProperty(
        id: json['id'] as String,
        address: json['address'] as String,
        propertyType: json['propertyType'] as String,
        lastTenant: json['lastTenant'] as String,
        lastEndDate: json['lastEndDate'] as String,
        agencyId: json['agencyId'] as String?,
        agencyName: json['agencyName'] as String?,
        furnishingLevel: json['furnishingLevel'] as String?,
        rooms: ((json['rooms'] as List<dynamic>?) ?? const []).cast<String>(),
        lastLandlordName:
            (json['lastLandlord'] as Map<String, dynamic>?)?['name'] as String?,
        lastLandlordEmail:
            (json['lastLandlord'] as Map<String, dynamic>?)?['email'] as String?,
      );

  Map<String, dynamic> toJson() => {
    'id': id,
    'address': address,
    'propertyType': propertyType,
    'lastTenant': lastTenant,
    'lastEndDate': lastEndDate,
    'agencyId': agencyId,
    'agencyName': agencyName,
    'furnishingLevel': furnishingLevel,
    'rooms': rooms,
    'lastLandlord': lastLandlordName == null
        ? null
        : {'name': lastLandlordName, 'email': lastLandlordEmail},
  };
}

/// A landlord or tenant on a tenancy this account works, offered to fill New
/// check-in's people fields. [roles] are LANDLORD and/or TENANT.
class Contact {
  const Contact({required this.name, this.email, this.roles = const []});
  final String name;
  final String? email;
  final List<String> roles;

  factory Contact.fromJson(Map<String, dynamic> json) => Contact(
    name: json['name'] as String,
    email: json['email'] as String?,
    roles: ((json['roles'] as List<dynamic>?) ?? const []).cast<String>(),
  );
}

/// A Singapore address from OneMap Search: the street address and postal code only.
/// The unit and everything else about the property is the agent's own entry.
class AddressMatch {
  const AddressMatch({
    required this.line1,
    required this.postalCode,
    this.building,
  });
  final String line1;
  final String postalCode;
  final String? building;

  factory AddressMatch.fromJson(Map<String, dynamic> json) => AddressMatch(
    line1: json['line1'] as String,
    postalCode: json['postalCode'] as String,
    building: json['building'] as String?,
  );
}
