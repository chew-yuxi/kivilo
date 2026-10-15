class InspectionSummary {
  const InspectionSummary({
    required this.id,
    this.tenancyId,
    required this.kind,
    required this.status,
    required this.property,
    required this.tenant,
    required this.rooms,
  });

  final String id;
  final String? tenancyId;
  final String kind;
  final String status;
  final String property;
  final String tenant;
  final int rooms;

  factory InspectionSummary.fromJson(Map<String, dynamic> json) =>
      InspectionSummary(
        id: json['id'] as String,
        tenancyId: json['tenancyId'] as String?,
        kind: json['kind'] as String,
        status: json['status'] as String,
        property: json['property'] as String,
        tenant: json['tenant'] as String,
        rooms: json['rooms'] as int,
      );

  String get kindLabel => kind == 'CHECK_IN' ? 'Check-in' : 'Check-out';
}

class InspectionDetail {
  const InspectionDetail({
    required this.id,
    this.tenancyRecordId,
    required this.kind,
    required this.status,
    required this.property,
    required this.landlord,
    required this.tenant,
    required this.landlordId,
    required this.tenantId,
    required this.summary,
    required this.rooms,
    required this.signatures,
    required this.findings,
    required this.baselineId,
    required this.checkOutId,
    required this.shareToken,
    required this.shareUrl,
    required this.latestAssessment,
    required this.assessmentDraftChanged,
    required this.maintenanceHistory,
    required this.checkOutItems,
    required this.checkInItems,
  });

  final String id;
  final String? tenancyRecordId;
  final String kind;
  final String status;
  final String property;
  final String landlord;
  final String tenant;
  final String landlordId;
  final String tenantId;
  final String? summary;
  final List<RoomSummary> rooms;
  final List<InspectionSignature> signatures;
  final List<Finding> findings;
  final String? baselineId;
  final String? checkOutId;
  final String? shareToken;
  final String? shareUrl;
  final AssessmentVersion? latestAssessment;
  final bool assessmentDraftChanged;
  final List<Map<String, dynamic>> maintenanceHistory;

  /// What a finding can be written against, once a check-out is signed: every item on
  /// the check-out, and every item on the check-in for anything now missing.
  final List<ComparableItem> checkOutItems;
  final List<ComparableItem> checkInItems;

  factory InspectionDetail.fromJson(Map<String, dynamic> json) =>
      InspectionDetail(
        id: json['id'] as String,
        tenancyRecordId: json['tenancyRecordId'] as String?,
        kind: json['kind'] as String,
        status: json['status'] as String,
        property: json['property'] as String,
        landlord: json['landlord'] as String,
        tenant: json['tenant'] as String,
        landlordId: json['landlordId'] as String,
        tenantId: json['tenantId'] as String,
        summary: json['summary'] as String?,
        rooms: (json['rooms'] as List<dynamic>)
            .map((room) => RoomSummary.fromJson(room as Map<String, dynamic>))
            .toList(),
        signatures: (json['signatures'] as List<dynamic>)
            .map(
              (entry) =>
                  InspectionSignature.fromJson(entry as Map<String, dynamic>),
            )
            .toList(),
        findings: (json['findings'] as List<dynamic>)
            .map((entry) => Finding.fromJson(entry as Map<String, dynamic>))
            .toList(),
        baselineId: json['baselineId'] as String?,
        checkOutId: json['checkOutId'] as String?,
        shareToken: json['shareToken'] as String?,
        shareUrl: json['shareUrl'] as String?,
        latestAssessment: json['latestAssessment'] == null
            ? null
            : AssessmentVersion.fromJson(
                json['latestAssessment'] as Map<String, dynamic>,
              ),
        assessmentDraftChanged: json['assessmentDraftChanged'] as bool,
        maintenanceHistory:
            (json['maintenanceHistory'] as List<dynamic>? ?? const [])
                .cast<Map<String, dynamic>>(),
        checkOutItems: ComparableItem.listFromJson(json['checkOutItems']),
        checkInItems: ComparableItem.listFromJson(json['checkInItems']),
      );

  bool get isOpen => !['AWAITING_SIGNATURE', 'COMPLETED'].contains(status);
  bool get allRoomsReviewed =>
      rooms.isNotEmpty && rooms.every((room) => room.status == 'REVIEWED');
  bool signedBy(String stakeholderId) =>
      signatures.any((signature) => signature.stakeholderId == stakeholderId);
}

class RoomSummary {
  const RoomSummary({
    required this.id,
    required this.name,
    required this.status,
    required this.items,
    required this.photos,
    required this.videos,
    this.previewUrls = const [],
  });

  final String id;
  final String name;
  final String status;
  final int items;
  final int photos;
  final int videos;
  final List<String> previewUrls;

  factory RoomSummary.fromJson(Map<String, dynamic> json) {
    final previews = (json['previewUrls'] as List<dynamic>?)?.cast<String>();
    final previousPreview = json['previewUrl'] as String?;
    return RoomSummary(
      id: json['id'] as String,
      name: json['name'] as String,
      status: json['status'] as String,
      items: json['items'] as int,
      photos: json['photos'] as int,
      videos: json['videos'] as int,
      // A cached response written before the strip API still has one preview.
      previewUrls: previews ?? [?previousPreview],
    );
  }

  String get statusLabel => switch (status) {
    'PENDING' => 'Not started',
    'REVIEW' => 'Needs review',
    'REVIEWED' => 'Reviewed',
    // PROCESSING and FAILED are left over from AI drafting; Done moves them on.
    _ => 'Capturing',
  };

  String get countsLabel {
    final parts = <String>[
      if (videos > 0) '$videos video${videos == 1 ? '' : 's'}',
      if (photos > 0) '$photos photo${photos == 1 ? '' : 's'}',
    ];
    final base = parts.isEmpty ? 'Nothing captured yet' : parts.join(', ');
    return items > 0 ? '$base · $items items' : base;
  }
}

class RoomDetail {
  const RoomDetail({
    required this.id,
    required this.name,
    required this.status,
    required this.items,
    required this.captures,
  });

  final String id;
  final String name;
  final String status;
  final List<InventoryItem> items;
  final List<EvidenceCapture> captures;

  factory RoomDetail.fromJson(Map<String, dynamic> json) {
    final room = json['room'] as Map<String, dynamic>;
    return RoomDetail(
      id: room['id'] as String,
      name: room['name'] as String,
      status: room['status'] as String,
      items: (json['items'] as List<dynamic>)
          .map((item) => InventoryItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      captures: (json['captures'] as List<dynamic>)
          .map(
            (capture) =>
                EvidenceCapture.fromJson(capture as Map<String, dynamic>),
          )
          .toList(),
    );
  }
}

class InventoryItem {
  const InventoryItem({
    required this.id,
    required this.name,
    required this.category,
    required this.condition,
    required this.quantity,
    this.notes,
    this.identifier,
    this.meterReading,
    this.sourceCaptureId,
    this.sourceTimestampSec,
    this.evidenceCaptureIds = const [],
  });

  final String id;
  final String name;
  final String category;
  final String condition;
  final int quantity;
  final String? notes;
  final String? identifier;
  final String? meterReading;
  final String? sourceCaptureId;
  final int? sourceTimestampSec;
  final List<String> evidenceCaptureIds;

  factory InventoryItem.fromJson(Map<String, dynamic> json) => InventoryItem(
    id: json['id'] as String,
    name: json['name'] as String,
    category: json['category'] as String,
    condition: json['condition'] as String,
    quantity: json['quantity'] as int,
    notes: json['notes'] as String?,
    identifier: json['identifier'] as String?,
    meterReading: json['meterReading'] as String?,
    sourceCaptureId: json['sourceCaptureId'] as String?,
    sourceTimestampSec: json['sourceTimestampSec'] as int?,
    evidenceCaptureIds:
        (json['evidenceCaptureIds'] as List<dynamic>? ?? const [])
            .cast<String>(),
  );
}

class EvidenceCapture {
  const EvidenceCapture({
    required this.id,
    required this.kind,
    required this.url,
    this.posterUrl,
    this.clientId,
    this.note,
    this.annotations,
  });
  final String id;
  final String kind;
  final String url;

  /// A still from a video, made by the server a minute or so after upload. Null for
  /// photos and for a video whose poster is not ready.
  final String? posterUrl;
  final String? clientId;
  final String? note;
  final Map<String, dynamic>? annotations;

  factory EvidenceCapture.fromJson(Map<String, dynamic> json) =>
      EvidenceCapture(
        id: json['id'] as String,
        kind: json['kind'] as String,
        url: json['url'] as String,
        posterUrl: json['posterUrl'] as String?,
        clientId: json['clientId'] as String?,
        note: json['note'] as String?,
        annotations: json['annotations'] as Map<String, dynamic>?,
      );
}

class InspectionSignature {
  const InspectionSignature({
    required this.stakeholderId,
    required this.signedAt,
  });
  final String stakeholderId;
  final String signedAt;

  factory InspectionSignature.fromJson(Map<String, dynamic> json) =>
      InspectionSignature(
        stakeholderId: json['stakeholderId'] as String,
        signedAt: json['signedAt'] as String,
      );
}

class Finding {
  const Finding({
    required this.id,
    required this.changeType,
    required this.verdict,
    required this.rationale,
    required this.estimatedCost,
    required this.itemLabel,
    required this.baselineLabel,
    required this.editedByHuman,
    required this.maintenanceCaseId,
    required this.maintenanceCaseTitle,
  });

  final String id;
  final String changeType;
  final String verdict;
  final String rationale;
  final String? estimatedCost;
  final String? itemLabel;
  final String? baselineLabel;
  final bool editedByHuman;
  final String? maintenanceCaseId;
  final String? maintenanceCaseTitle;

  factory Finding.fromJson(Map<String, dynamic> json) => Finding(
    id: json['id'] as String,
    changeType: json['changeType'] as String,
    verdict: json['verdict'] as String,
    rationale: json['rationale'] as String,
    estimatedCost: json['estimatedCost'] as String?,
    itemLabel: json['itemLabel'] as String?,
    baselineLabel: json['baselineLabel'] as String?,
    editedByHuman: json['editedByHuman'] as bool,
    maintenanceCaseId: json['maintenanceCaseId'] as String?,
    maintenanceCaseTitle: json['maintenanceCaseTitle'] as String?,
  );
}

class ComparableItem {
  const ComparableItem({required this.id, required this.label});
  final String id;
  final String label;

  static List<ComparableItem> listFromJson(Object? json) =>
      (json as List<dynamic>)
          .map((entry) => entry as Map<String, dynamic>)
          .map(
            (entry) => ComparableItem(
              id: entry['id'] as String,
              label: entry['label'] as String,
            ),
          )
          .toList();
}

class AssessmentVersion {
  const AssessmentVersion({required this.version, required this.publishedAt});
  final int version;
  final String publishedAt;

  factory AssessmentVersion.fromJson(Map<String, dynamic> json) =>
      AssessmentVersion(
        version: json['version'] as int,
        publishedAt: json['publishedAt'] as String,
      );
}
