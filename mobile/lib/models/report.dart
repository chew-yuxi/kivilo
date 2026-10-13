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
