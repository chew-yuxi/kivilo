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
