import 'handover.dart';
import 'tenancy_access.dart';
import 'supporting_documents.dart';

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

/// How this agent's reports are headed. Null until they set an agency name.
class AgentBranding {
  const AgentBranding({
    required this.agencyName,
    this.agencyLicence,
    this.ceaRegistration,
    this.phone,
    this.logoUrl,
  });
  final String agencyName;
  final String? agencyLicence;
  final String? ceaRegistration;
  final String? phone;
  final String? logoUrl;

  static AgentBranding? fromResponse(Map<String, dynamic> json) {
    final branding = json['branding'] as Map<String, dynamic>?;
    if (branding == null) return null;
    return AgentBranding(
      agencyName: branding['agencyName'] as String,
      agencyLicence: branding['agencyLicence'] as String?,
      ceaRegistration: branding['ceaRegistration'] as String?,
      phone: branding['phone'] as String?,
      logoUrl: branding['logoUrl'] as String?,
    );
  }
}

/// The plan of the agent's workspace (their team, or them alone) and how much of it is
/// in use. The Android billing screen reads available prices from Google Play.
class WorkspacePlan {
  const WorkspacePlan({
    required this.pro,
    required this.activeProperties,
    required this.limit,
    required this.seats,
    this.team,
  });
  final bool pro;
  final int activeProperties;
  final int limit;
  final int seats;
  final String? team;

  factory WorkspacePlan.fromJson(Map<String, dynamic> json) => WorkspacePlan(
    pro: json['plan'] == 'PRO',
    activeProperties: json['activeProperties'] as int,
    limit: json['limit'] as int,
    seats: json['seats'] as int,
    team: json['team'] as String?,
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
    this.latestReportId,
    this.latestReportKind,
    this.latestReportStatus,
    this.awaitingMySignature = false,
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

  /// The newest report sent for signature, which every party on the tenancy may read.
  final String? latestReportId;
  final String? latestReportKind;

  /// `AWAITING_SIGNATURE` or `COMPLETED`.
  final String? latestReportStatus;

  /// The latest report still needs this landlord's or tenant's own signature.
  final bool awaitingMySignature;

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
    latestReportId:
        (json['latestReport'] as Map<String, dynamic>?)?['id'] as String?,
    latestReportKind:
        (json['latestReport'] as Map<String, dynamic>?)?['kind'] as String?,
    latestReportStatus:
        (json['latestReport'] as Map<String, dynamic>?)?['status'] as String?,
    awaitingMySignature:
        (json['latestReport'] as Map<String, dynamic>?)?['awaitingMySignature']
            as bool? ??
        false,
  );
}

class TenancyDetail {
  const TenancyDetail({
    required this.id,
    required this.role,
    required this.agentMayAgreeCosts,
    required this.canEditMinorRepairCap,
    required this.canEditAgentAuthority,
    this.minorRepairCap,
    this.maintenanceTerms,
    this.moveInDefects,
    this.access,
  });
  final String id;
  final String role;
  final String? minorRepairCap;
  final AgreementTerms? maintenanceTerms;
  final bool agentMayAgreeCosts;
  final bool canEditMinorRepairCap;
  final bool canEditAgentAuthority;
  final MoveInDefectWindow? moveInDefects;
  final TenancyAccess? access;

  factory TenancyDetail.fromJson(Map<String, dynamic> json) {
    final capabilities = json['capabilities'] as Map<String, dynamic>;
    return TenancyDetail(
      id: json['id'] as String,
      role: json['role'] as String,
      access: json['access'] == null
          ? null
          : TenancyAccess.fromJson(json['access'] as Map<String, dynamic>),
      minorRepairCap: json['minorRepairCap'] as String?,
      maintenanceTerms: json['maintenanceTerms'] == null ? null
          : AgreementTerms.fromJson(json['maintenanceTerms'] as Map<String, dynamic>),
      agentMayAgreeCosts: json['agentMayAgreeCosts'] as bool,
      canEditMinorRepairCap: capabilities['editMinorRepairCap'] as bool,
      canEditAgentAuthority: capabilities['editAgentAuthority'] as bool,
      moveInDefects: json['moveInDefects'] == null
          ? null
          : MoveInDefectWindow.fromJson(
              json['moveInDefects'] as Map<String, dynamic>,
            ),
    );
  }
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
    this.cost,
    this.verificationOutcome,
    this.verificationNote,
  });
  final String id;
  final String? scheduledAt;
  final String? completedAt;
  final String? notes;
  final String? cost;
  final String? verificationOutcome;
  final String? verificationNote;

  factory MaintenanceVisitModel.fromJson(Map<String, dynamic> json) =>
      MaintenanceVisitModel(
        id: json['id'] as String,
        scheduledAt: json['scheduledAt'] as String?,
        completedAt: json['completedAt'] as String?,
        notes: json['notes'] as String?,
        cost: json['cost'] as String?,
        verificationOutcome:
            (json['verification'] as Map<String, dynamic>?)?['outcome']
                as String?,
        verificationNote:
            (json['verification'] as Map<String, dynamic>?)?['note'] as String?,
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
  bool get isVideo => mimeType.startsWith('video/');

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

const partyLabels = {'LANDLORD': 'Landlord', 'TENANT': 'Tenant'};

const basisLabels = {
  'MINOR_REPAIR_CLAUSE': 'Minor repair clause',
  'TENANT_CAUSED': 'Caused by the tenant',
  'FAIR_WEAR': 'Fair wear and tear',
  'LANDLORD_OBLIGATION': "Landlord's obligation",
  'OTHER': 'Other',
};

/// Mirrors `describeProposal` in src/lib/maintenance.ts, so the preview a proposer
/// sees is the sentence the other side will receive.
String describeProposal({
  required String arrangedBy,
  required String payer,
  String? tenantCap,
}) {
  final pays = payer == 'SHARED'
      ? 'Tenant pays the first S\$$tenantCap, landlord pays the rest.'
      : '${partyLabels[payer]} pays.';
  return '$pays ${partyLabels[arrangedBy]} arranges the repair.';
}

class ResponsibilityProposal {
  const ResponsibilityProposal({
    required this.id,
    required this.side,
    required this.proposedBy,
    required this.arrangedBy,
    required this.payer,
    required this.basis,
    required this.reason,
    required this.summary,
    required this.status,
    required this.createdAt,
    this.tenantCap,
    this.clauseRef,
    this.respondedBy,
    this.respondedAt,
    this.responseNote,
  });
  final String id;
  final String side;
  final String proposedBy;
  final String arrangedBy;
  final String payer;
  final String? tenantCap;
  final String basis;
  final String reason;
  final String? clauseRef;
  final String summary;
  final String status;
  final String? respondedBy;
  final String? respondedAt;
  final String? responseNote;
  final String createdAt;

  factory ResponsibilityProposal.fromJson(Map<String, dynamic> json) =>
      ResponsibilityProposal(
        id: json['id'] as String,
        side: json['side'] as String,
        proposedBy:
            (json['proposedBy'] as Map<String, dynamic>)['name'] as String,
        arrangedBy: json['arrangedBy'] as String,
        payer: json['payer'] as String,
        tenantCap: json['tenantCap'] as String?,
        basis: json['basis'] as String,
        reason: json['reason'] as String,
        clauseRef: json['clauseRef'] as String?,
        summary: json['summary'] as String,
        status: json['status'] as String,
        respondedBy:
            (json['respondedBy'] as Map<String, dynamic>?)?['name'] as String?,
        respondedAt: json['respondedAt'] as String?,
        responseNote: json['responseNote'] as String?,
        createdAt: json['createdAt'] as String,
      );
}

class CostShares {
  const CostShares({
    required this.total,
    required this.tenant,
    required this.landlord,
  });
  final String total;
  final String tenant;
  final String landlord;

  factory CostShares.fromJson(Map<String, dynamic> json) => CostShares(
    total: json['total'] as String,
    tenant: json['tenant'] as String,
    landlord: json['landlord'] as String,
  );
}

class Responsibility {
  const Responsibility({
    required this.arrangedBy,
    required this.history,
    required this.canPropose,
    required this.canAnswer,
    required this.canWithdraw,
    this.minorRepairCap,
    this.maintenanceTerms,
    this.agreement,
    this.pending,
    this.shares,
  });
  final String arrangedBy;
  final String? minorRepairCap;
  final AgreementTerms? maintenanceTerms;
  final ResponsibilityProposal? agreement;
  final ResponsibilityProposal? pending;
  final List<ResponsibilityProposal> history;
  final CostShares? shares;
  final bool canPropose;
  final bool canAnswer;
  final bool canWithdraw;

  /// The most recent answer, when it was a no and nothing has replaced it.
  ResponsibilityProposal? get rejection {
    if (pending != null || history.isEmpty) return null;
    final last = history.last;
    return last.status == 'REJECTED' ? last : null;
  }

  factory Responsibility.fromJson(Map<String, dynamic> json) {
    ResponsibilityProposal? proposal(Object? value) => value == null
        ? null
        : ResponsibilityProposal.fromJson(value as Map<String, dynamic>);
    return Responsibility(
      arrangedBy: json['arrangedBy'] as String,
      minorRepairCap: json['minorRepairCap'] as String?,
      maintenanceTerms: json['maintenanceTerms'] == null ? null
          : AgreementTerms.fromJson(json['maintenanceTerms'] as Map<String, dynamic>),
      agreement: proposal(json['agreement']),
      pending: proposal(json['pending']),
      history: (json['history'] as List<dynamic>)
          .map((entry) => proposal(entry)!)
          .toList(),
      shares: json['shares'] == null
          ? null
          : CostShares.fromJson(json['shares'] as Map<String, dynamic>),
      canPropose: json['canPropose'] as bool,
      canAnswer: json['canAnswer'] as bool,
      canWithdraw: json['canWithdraw'] as bool,
    );
  }
}

class MaintenanceCaseDetail {
  const MaintenanceCaseDetail({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.category,
    required this.property,
    required this.reportedBy,
    required this.createdAt,
    required this.role,
    required this.canManage,
    required this.canLogVisit,
    required this.canVerify,
    required this.responsibility,
    required this.visits,
    required this.evidence,
    required this.events,
    this.resolutionReason,
    this.moveInDefect,
  });
  final String id;
  final String title;
  final String description;
  final String status;
  final String priority;
  final String category;
  final String property;
  final String reportedBy;
  final String createdAt;
  final String? resolutionReason;
  final String role;
  final bool canManage;
  final bool canLogVisit;
  final bool canVerify;
  final Responsibility responsibility;
  final List<MaintenanceVisitModel> visits;
  final List<MaintenanceEvidenceModel> evidence;
  final List<Map<String, dynamic>> events;
  final MaintenanceMoveInDefect? moveInDefect;

  factory MaintenanceCaseDetail.fromJson(
    Map<String, dynamic> json,
  ) => MaintenanceCaseDetail(
    id: json['id'] as String,
    title: json['title'] as String,
    description: json['description'] as String,
    status: json['status'] as String,
    priority: json['priority'] as String,
    category: json['category'] as String,
    property: json['property'] as String,
    reportedBy: (json['reportedBy'] as Map<String, dynamic>)['name'] as String,
    createdAt: json['createdAt'] as String,
    resolutionReason: json['resolutionReason'] as String?,
    role: json['role'] as String,
    canManage: json['canManage'] as bool,
    canLogVisit: json['canLogVisit'] as bool,
    canVerify: json['canVerify'] as bool,
    responsibility: Responsibility.fromJson(
      json['responsibility'] as Map<String, dynamic>,
    ),
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
    moveInDefect: json['moveInDefect'] == null
        ? null
        : MaintenanceMoveInDefect.fromJson(
            json['moveInDefect'] as Map<String, dynamic>,
          ),
  );
}

class MaintenanceMoveInDefect {
  const MaintenanceMoveInDefect({
    required this.wasPresentAtMoveIn,
    required this.canSubmit,
    this.canRespond = false,
    required this.targets,
    this.addendumId,
    this.inspectionId,
    this.status,
    this.reportedAt,
    this.deadline,
    this.dispute,
  });
  final bool wasPresentAtMoveIn;
  final bool canSubmit;
  final bool canRespond;
  final List<MoveInDefectTarget> targets;
  final String? addendumId;
  final String? inspectionId;
  final String? status;
  final String? reportedAt;
  final String? deadline;
  final MoveInDefectDispute? dispute;

  factory MaintenanceMoveInDefect.fromJson(Map<String, dynamic> json) =>
      MaintenanceMoveInDefect(
        wasPresentAtMoveIn: json['wasPresentAtMoveIn'] as bool,
        canSubmit: json['canSubmit'] as bool,
        canRespond: json['canRespond'] as bool? ?? false,
        targets: (json['targets'] as List<dynamic>)
            .map(
              (target) =>
                  MoveInDefectTarget.fromJson(target as Map<String, dynamic>),
            )
            .toList(),
        addendumId: json['addendumId'] as String?,
        inspectionId: json['inspectionId'] as String?,
        status: json['status'] as String?,
        reportedAt: json['reportedAt'] as String?,
        deadline: json['deadline'] as String?,
        dispute: json['dispute'] == null
            ? null
            : MoveInDefectDispute.fromJson(
                json['dispute'] as Map<String, dynamic>,
              ),
      );
}

class MoveInDefectDispute {
  const MoveInDefectDispute({
    required this.disputedAt,
    required this.disputedBy,
    required this.reason,
  });
  final String disputedAt;
  final String disputedBy;
  final String reason;

  factory MoveInDefectDispute.fromJson(Map<String, dynamic> json) =>
      MoveInDefectDispute(
        disputedAt: json['disputedAt'] as String,
        disputedBy: json['disputedBy'] as String,
        reason: json['reason'] as String,
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

class TimelineEvent {
  const TimelineEvent({
    required this.id,
    required this.at,
    required this.kind,
    required this.title,
    this.detail,
    this.linkType,
    this.linkId,
    this.reportId,
  });
  final String id;
  final String at;
  final String kind;
  final String title;
  final String? detail;

  /// `maintenance` or `inspection`, present only when this viewer can open it.
  final String? linkType;
  final String? linkId;

  /// The signed report behind a check-in, check-out or assessment event. Every viewer of
  /// the timeline may read it, including a landlord or tenant with no [linkId].
  final String? reportId;

  factory TimelineEvent.fromJson(Map<String, dynamic> json) {
    final link = json['link'] as Map<String, dynamic>?;
    return TimelineEvent(
      id: json['id'] as String,
      at: json['at'] as String,
      kind: json['kind'] as String,
      title: json['title'] as String,
      detail: json['detail'] as String?,
      linkType: link?['type'] as String?,
      linkId: link?['id'] as String?,
      reportId: json['reportId'] as String?,
    );
  }
}

class PropertyTimeline {
  const PropertyTimeline({required this.property, required this.events});
  final String property;
  final List<TimelineEvent> events;

  factory PropertyTimeline.fromJson(Map<String, dynamic> json) =>
      PropertyTimeline(
        property: json['property'] as String,
        events: (json['events'] as List<dynamic>)
            .map(
              (entry) => TimelineEvent.fromJson(entry as Map<String, dynamic>),
            )
            .toList(),
      );
}
