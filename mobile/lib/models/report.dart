import '../ui/kivilo_format.dart';
import 'maintenance.dart' show MoveInDefectDispute;

/// The report the landlord and tenant are signing or have signed: the same document the
/// shared link shows. Read-only; the working inspection is the agent's.
class SignedReport {
  const SignedReport({
    required this.id,
    required this.kind,
    required this.status,
    this.signAs,
    required this.property,
    required this.landlord,
    required this.tenant,
    this.agent,
    required this.startDate,
    required this.endDate,
    required this.deposit,
    this.conductedAt,
    this.conductedBy,
    required this.rooms,
    required this.signatures,
    this.assessment,
    this.addenda = const [],
  });

  final String id;
  final String kind;

  /// `AWAITING_SIGNATURE` until both parties have signed, then `COMPLETED`.
  final String status;

  /// `LANDLORD` or `TENANT` while the report still waits for this viewer's signature.
  final String? signAs;
  final String property;
  final String landlord;
  final String tenant;
  final String? agent;
  final String startDate;
  final String endDate;
  final String deposit;
  final String? conductedAt;
  final String? conductedBy;
  final List<ReportRoom> rooms;
  final List<ReportSignature> signatures;
  final ReportAssessment? assessment;

  /// Updates since signing, oldest first. Each counts once both parties acknowledge it.
  final List<ReportAddendum> addenda;

  bool get isCheckOut => kind == 'CHECK_OUT';

  /// When the last of the parties signed, which is when the report was agreed.
  String? get agreedAt => signatures.isEmpty
      ? null
      : (signatures.map((s) => s.signedAt).toList()..sort()).last;

  factory SignedReport.fromJson(Map<String, dynamic> json) => SignedReport(
    id: json['id'] as String,
    kind: json['kind'] as String,
    status: json['status'] as String,
    signAs: json['signAs'] as String?,
    property: json['property'] as String,
    landlord: json['landlord'] as String,
    tenant: json['tenant'] as String,
    agent: json['agent'] as String?,
    startDate: json['startDate'] as String,
    endDate: json['endDate'] as String,
    deposit: json['deposit'] as String,
    conductedAt: json['conductedAt'] as String?,
    conductedBy: json['conductedBy'] as String?,
    rooms: (json['rooms'] as List<dynamic>)
        .map((room) => ReportRoom.fromJson(room as Map<String, dynamic>))
        .toList(),
    signatures: (json['signatures'] as List<dynamic>)
        .map((s) => ReportSignature.fromJson(s as Map<String, dynamic>))
        .toList(),
    assessment: json['assessment'] == null
        ? null
        : ReportAssessment.fromJson(json['assessment'] as Map<String, dynamic>),
    // Absent from a report cached before updates existed.
    addenda: ((json['addenda'] as List<dynamic>?) ?? const [])
        .map((a) => ReportAddendum.fromJson(a as Map<String, dynamic>))
        .toList(),
  );
}

class ReportRoom {
  const ReportRoom({
    required this.id,
    required this.name,
    required this.items,
    required this.photos,
  });
  final String id;
  final String name;
  final List<ReportItem> items;
  final List<ReportPhoto> photos;

  factory ReportRoom.fromJson(Map<String, dynamic> json) => ReportRoom(
    id: json['id'] as String,
    name: json['name'] as String,
    items: (json['items'] as List<dynamic>)
        .map((item) => ReportItem.fromJson(item as Map<String, dynamic>))
        .toList(),
    photos: (json['photos'] as List<dynamic>)
        .map((photo) => ReportPhoto.fromJson(photo as Map<String, dynamic>))
        .toList(),
  );
}

class ReportItem {
  const ReportItem({
    required this.id,
    required this.name,
    required this.quantity,
    this.identifier,
    required this.condition,
    this.meterReading,
    this.notes,
  });
  final String id;
  final String name;
  final int quantity;
  final String? identifier;
  final String condition;
  final String? meterReading;
  final String? notes;

  factory ReportItem.fromJson(Map<String, dynamic> json) => ReportItem(
    id: json['id'] as String,
    name: json['name'] as String,
    quantity: json['quantity'] as int,
    identifier: json['identifier'] as String?,
    condition: json['condition'] as String,
    meterReading: json['meterReading'] as String?,
    notes: json['notes'] as String?,
  );
}

class ReportPhoto {
  const ReportPhoto({
    required this.id,
    required this.url,
    this.note,
    this.annotations,
  });
  final String id;
  final String url;
  final String? note;

  /// Marks drawn beside the photo, never into it: `{width, height, marks}`, with every
  /// coordinate normalized against that upright box.
  final Map<String, dynamic>? annotations;

  List<Map<String, dynamic>> get marks =>
      ((annotations?['marks'] as List<dynamic>?) ?? const [])
          .cast<Map<String, dynamic>>();

  factory ReportPhoto.fromJson(Map<String, dynamic> json) => ReportPhoto(
    id: json['id'] as String,
    url: json['url'] as String,
    note: json['note'] as String?,
    annotations: json['annotations'] as Map<String, dynamic>?,
  );
}

class ReportSignature {
  const ReportSignature({
    required this.name,
    required this.signedAt,
    required this.imageData,
  });
  final String name;
  final String signedAt;

  /// A `data:image/png;base64,` URL, exactly as drawn.
  final String imageData;

  factory ReportSignature.fromJson(Map<String, dynamic> json) =>
      ReportSignature(
        name: json['name'] as String,
        signedAt: json['signedAt'] as String,
        imageData: json['imageData'] as String,
      );
}

class ReportAssessment {
  const ReportAssessment({
    required this.version,
    required this.publishedAt,
    this.summary,
    required this.findings,
  });
  final int version;
  final String publishedAt;
  final String? summary;
  final List<ReportFinding> findings;

  factory ReportAssessment.fromJson(Map<String, dynamic> json) =>
      ReportAssessment(
        version: json['version'] as int,
        publishedAt: json['publishedAt'] as String,
        summary: json['summary'] as String?,
        findings: (json['findings'] as List<dynamic>)
            .map((f) => ReportFinding.fromJson(f as Map<String, dynamic>))
            .toList(),
      );
}

class ReportFinding {
  const ReportFinding({
    required this.id,
    required this.itemLabel,
    required this.verdict,
    this.estimatedCost,
    required this.rationale,
    this.maintenanceTitle,
    required this.evidenceImageUrls,
  });
  final String id;
  final String itemLabel;
  final String verdict;
  final String? estimatedCost;
  final String rationale;
  final String? maintenanceTitle;
  final List<String> evidenceImageUrls;

  factory ReportFinding.fromJson(Map<String, dynamic> json) => ReportFinding(
    id: json['id'] as String,
    itemLabel: json['itemLabel'] as String,
    verdict: json['verdict'] as String,
    estimatedCost: json['estimatedCost'] as String?,
    rationale: json['rationale'] as String,
    maintenanceTitle: json['maintenanceTitle'] as String?,
    evidenceImageUrls: (json['evidence'] as List<dynamic>)
        .cast<Map<String, dynamic>>()
        .where((e) => (e['mimeType'] as String).startsWith('image/'))
        .map((e) => e['url'] as String)
        .toList(),
  );
}

/// A published update to a signed report: a dated, numbered record beside it, never an
/// edit to it.
class ReportAddendum {
  const ReportAddendum({
    required this.id,
    required this.number,
    required this.title,
    this.reason,
    required this.effectiveDate,
    required this.publishedAt,
    required this.publishedBy,
    required this.entries,
    required this.acknowledgements,
    this.acknowledgedAt,
    this.acknowledgeAs,
    this.acknowledgeInPerson = false,
    this.source = 'AGENT_UPDATE',
    this.moveInDefect,
    this.dispute,
    this.disputeAs,
  });
  final String id;
  final int number;
  final String title;
  final String? reason;
  final String effectiveDate;
  final String publishedAt;
  final String publishedBy;
  final List<AddendumEntry> entries;
  final List<AddendumAcknowledgement> acknowledgements;

  /// When the second party acknowledged it; null while it is pending.
  final String? acknowledgedAt;

  /// `LANDLORD` or `TENANT` while this viewer still has to acknowledge it.
  final String? acknowledgeAs;

  /// For the agent, who is no party: a party still pending can acknowledge in person on
  /// this phone.
  final bool acknowledgeInPerson;
  final String source;
  final ReportMoveInDefect? moveInDefect;
  final MoveInDefectDispute? dispute;
  final String? disputeAs;

  bool get isMoveInDefect => source == 'MOVE_IN_DEFECT';

  factory ReportAddendum.fromJson(Map<String, dynamic> json) => ReportAddendum(
    id: json['id'] as String,
    number: json['number'] as int,
    title: json['title'] as String,
    reason: json['reason'] as String?,
    effectiveDate: json['effectiveDate'] as String,
    publishedAt: json['publishedAt'] as String,
    publishedBy: json['publishedBy'] as String,
    entries: (json['entries'] as List<dynamic>)
        .map((e) => AddendumEntry.fromJson(e as Map<String, dynamic>))
        .toList(),
    acknowledgements: (json['acknowledgements'] as List<dynamic>)
        .map((a) => AddendumAcknowledgement.fromJson(a as Map<String, dynamic>))
        .toList(),
    acknowledgedAt: json['acknowledgedAt'] as String?,
    acknowledgeAs: json['acknowledgeAs'] as String?,
    acknowledgeInPerson: json['acknowledgeInPerson'] as bool? ?? false,
    source: json['source'] as String? ?? 'AGENT_UPDATE',
    moveInDefect: json['moveInDefect'] == null
        ? null
        : ReportMoveInDefect.fromJson(
            json['moveInDefect'] as Map<String, dynamic>,
          ),
    dispute: json['dispute'] == null
        ? null
        : MoveInDefectDispute.fromJson(json['dispute'] as Map<String, dynamic>),
    disputeAs: json['disputeAs'] as String?,
  );
}

class ReportMoveInDefect {
  const ReportMoveInDefect({
    required this.caseId,
    required this.reportedAt,
    required this.deadline,
  });
  final String caseId;
  final String reportedAt;
  final String deadline;

  factory ReportMoveInDefect.fromJson(Map<String, dynamic> json) =>
      ReportMoveInDefect(
        caseId: json['caseId'] as String,
        reportedAt: json['reportedAt'] as String,
        deadline: json['deadline'] as String,
      );
}

class AddendumEntry {
  const AddendumEntry({
    required this.id,
    required this.change,
    required this.roomName,
    this.notes,
    this.targetName,
    this.targetIdentifier,
    this.name,
    this.condition,
    this.quantity = 1,
    this.identifier,
    this.maintenanceTitle,
    required this.photos,
  });
  final String id;

  /// `ADDED`, `REPLACED` or `REMOVED`.
  final String change;
  final String roomName;
  final String? notes;

  /// The line as it stood, for a replacement or removal.
  final String? targetName;
  final String? targetIdentifier;

  /// The new line, for an addition or replacement.
  final String? name;
  final String? condition;
  final int quantity;
  final String? identifier;
  final String? maintenanceTitle;
  final List<AddendumPhoto> photos;

  String get heading => switch (change) {
    'ADDED' => 'Added: ${name ?? 'item'}',
    'REMOVED' => 'Removed: ${targetName ?? 'item'}',
    _ => 'Replaced: ${targetName ?? 'item'} with ${name ?? 'item'}',
  };

  factory AddendumEntry.fromJson(Map<String, dynamic> json) {
    final target = json['target'] as Map<String, dynamic>?;
    final line = json['line'] as Map<String, dynamic>?;
    final maintenance = json['maintenanceCase'] as Map<String, dynamic>?;
    return AddendumEntry(
      id: json['id'] as String,
      change: json['change'] as String,
      roomName: json['roomName'] as String,
      notes: json['notes'] as String?,
      targetName: target?['name'] as String?,
      targetIdentifier: target?['identifier'] as String?,
      name: line?['name'] as String?,
      condition: line?['condition'] as String?,
      quantity: (line?['quantity'] as int?) ?? 1,
      identifier: line?['identifier'] as String?,
      maintenanceTitle: maintenance?['title'] as String?,
      photos: (json['photos'] as List<dynamic>)
          .map((p) => AddendumPhoto.fromJson(p as Map<String, dynamic>))
          .toList(),
    );
  }
}

class AddendumPhoto {
  const AddendumPhoto({
    required this.id,
    required this.url,
    required this.mimeType,
    this.note,
    this.label,
  });
  final String id;
  final String url;
  final String mimeType;
  final String? note;

  /// "Before" or "After" for a repair's evidence.
  final String? label;

  factory AddendumPhoto.fromJson(Map<String, dynamic> json) => AddendumPhoto(
    id: json['id'] as String,
    url: json['url'] as String,
    mimeType: json['mimeType'] as String,
    note: json['note'] as String?,
    label: json['label'] as String?,
  );
}

class AddendumAcknowledgement {
  const AddendumAcknowledgement({
    required this.role,
    required this.name,
    this.stakeholderId,
    this.acknowledgedAt,
    this.inPerson = false,
  });

  /// `Landlord` or `Tenant`.
  final String role;
  final String name;

  /// The party, which the agent's phone names to take an acknowledgement in person.
  /// Null in a copy cached before it was sent.
  final String? stakeholderId;
  final String? acknowledgedAt;

  /// Given on the agent's phone rather than on the party's own account.
  final bool inPerson;

  String get status => acknowledgedAt == null
      ? '$role $name: pending acknowledgement'
      : '$role $name: acknowledged ${inPerson ? 'in person ' : ''}'
            '${shortDate(acknowledgedAt!)}';

  factory AddendumAcknowledgement.fromJson(Map<String, dynamic> json) =>
      AddendumAcknowledgement(
        role: json['role'] as String,
        name: json['name'] as String,
        stakeholderId: json['stakeholderId'] as String?,
        acknowledgedAt: json['acknowledgedAt'] as String?,
        inPerson: json['inPerson'] as bool? ?? false,
      );
}
