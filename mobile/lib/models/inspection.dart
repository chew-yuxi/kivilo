import 'report.dart' show ReportPhoto;
import 'tenancy_access.dart';

class InspectionSummary {
  const InspectionSummary({
    required this.id,
    this.tenancyId,
    this.agency,
    this.leadAgent,
    required this.kind,
    required this.status,
    required this.property,
    required this.tenant,
    required this.rooms,
  });

  final String id;
  final String? tenancyId;
  final Map<String, dynamic>? agency;
  final Map<String, dynamic>? leadAgent;
  final String kind;
  final String status;
  final String property;
  final String tenant;
  final int rooms;

  factory InspectionSummary.fromJson(Map<String, dynamic> json) =>
      InspectionSummary(
        id: json['id'] as String,
        tenancyId: json['tenancyId'] as String?,
        agency: json['agency'] as Map<String, dynamic>?,
        leadAgent: json['leadAgent'] as Map<String, dynamic>?,
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
    this.propertyId,
    this.propertyState = 'ACTIVE',
    this.access,
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
    this.signingParties = const [],
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
  final String? propertyId;
  final String propertyState;
  final TenancyAccess? access;
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

  /// Whether each party has been emailed the link to sign. Absent from servers older
  /// than the signing email, which is why it defaults to empty.
  final List<SigningParty> signingParties;
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
        propertyId: json['propertyId'] as String?,
        propertyState: json['propertyState'] as String? ?? 'ACTIVE',
        access: json['access'] == null
            ? null
            : TenancyAccess.fromJson(json['access'] as Map<String, dynamic>),
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
        signingParties: (json['signingParties'] as List<dynamic>? ?? const [])
            .map(
              (entry) => SigningParty.fromJson(entry as Map<String, dynamic>),
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
  SigningParty? signingParty(String stakeholderId) => signingParties
      .where((party) => party.stakeholderId == stakeholderId)
      .firstOrNull;
}

class RoomSummary {
  const RoomSummary({
    required this.id,
    required this.name,
    required this.status,
    required this.items,
    required this.photos,
    required this.videos,
    this.previews = const [],
  });

  final String id;
  final String name;
  final String status;
  final int items;
  final int photos;
  final int videos;
  final List<RoomPreview> previews;

  factory RoomSummary.fromJson(Map<String, dynamic> json) {
    final previewMedia = (json['previewMedia'] as List<dynamic>?)
        ?.map((value) => RoomPreview.fromJson(value as Map<String, dynamic>))
        .toList();
    final previewUrls = (json['previewUrls'] as List<dynamic>?)?.cast<String>();
    final previousPreview = json['previewUrl'] as String?;
    return RoomSummary(
      id: json['id'] as String,
      name: json['name'] as String,
      status: json['status'] as String,
      items: json['items'] as int,
      photos: json['photos'] as int,
      videos: json['videos'] as int,
      // A cached response written before the strip API still has one preview.
      previews:
          previewMedia ??
          (previewUrls ?? [?previousPreview])
              .map((url) => RoomPreview(url: url))
              .toList(),
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

class RoomPreview {
  const RoomPreview({required this.url, this.annotations});

  final String url;
  final Map<String, dynamic>? annotations;

  factory RoomPreview.fromJson(Map<String, dynamic> json) => RoomPreview(
    url: json['url'] as String,
    annotations: json['annotations'] as Map<String, dynamic>?,
  );
}

class RoomDetail {
  const RoomDetail({
    required this.id,
    required this.name,
    required this.status,
    required this.items,
    required this.captures,
    this.checkIn,
  });

  final String id;
  final String name;
  final String status;
  final List<InventoryItem> items;
  final List<EvidenceCapture> captures;

  /// On a check-out, the room as it was at check-in. Null on a check-in, on a room added
  /// during the check-out, for an agent who conducts the check-out but may not see the
  /// check-in, and from a server older than the field.
  final CheckInReference? checkIn;

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
      checkIn: json['checkIn'] == null
          ? null
          : CheckInReference.fromJson(json['checkIn'] as Map<String, dynamic>),
    );
  }
}

/// What a check-out room looked like at check-in, frozen when the check-out started: the
/// lines it began from and the photos both parties agreed to. Reference only; nothing
/// writes a line from it.
class CheckInReference {
  const CheckInReference({
    required this.baselineId,
    required this.conductedAt,
    required this.lines,
    required this.photos,
  });

  final String baselineId;
  final String? conductedAt;
  final List<CheckInLine> lines;
  final List<CheckInPhoto> photos;

  factory CheckInReference.fromJson(Map<String, dynamic> json) =>
      CheckInReference(
        baselineId: json['baselineId'] as String,
        conductedAt: json['conductedAt'] as String?,
        lines: (json['lines'] as List<dynamic>)
            .map((line) => CheckInLine.fromJson(line as Map<String, dynamic>))
            .toList(),
        photos: (json['photos'] as List<dynamic>)
            .map(
              (photo) => CheckInPhoto.fromJson(photo as Map<String, dynamic>),
            )
            .toList(),
      );
}

class CheckInLine {
  const CheckInLine({
    required this.key,
    required this.name,
    required this.condition,
    required this.quantity,
    this.notes,
    this.identifier,
    this.meterReading,
    this.update = false,
  });

  final String key;
  final String name;
  final String condition;
  final int quantity;
  final String? notes;
  final String? identifier;
  final String? meterReading;

  /// Added or replaced by an acknowledged addendum rather than signed at check-in.
  final bool update;

  factory CheckInLine.fromJson(Map<String, dynamic> json) => CheckInLine(
    key: json['key'] as String,
    name: json['name'] as String,
    condition: json['condition'] as String,
    quantity: json['quantity'] as int,
    notes: json['notes'] as String?,
    identifier: json['identifier'] as String?,
    meterReading: json['meterReading'] as String?,
    update: json['update'] as bool,
  );
}

class CheckInPhoto {
  const CheckInPhoto({
    required this.id,
    required this.url,
    this.posterUrl,
    this.caption,
    this.update = false,
    this.annotations,
  });

  final String id;
  final String url;

  /// The photo resized to 640px, for tiles. Null until the server has made it, and
  /// always for a photo from an addendum.
  final String? posterUrl;

  /// What the photo is of, as the report captions it ("Before: cracked basin").
  final String? caption;

  /// From an addendum acknowledged after the check-in, not the check-in itself.
  final bool update;
  final Map<String, dynamic>? annotations;

  factory CheckInPhoto.fromJson(Map<String, dynamic> json) => CheckInPhoto(
    id: json['id'] as String,
    url: json['url'] as String,
    posterUrl: json['posterUrl'] as String?,
    caption: json['caption'] as String?,
    update: json['update'] as bool,
    annotations: json['annotations'] as Map<String, dynamic>?,
  );
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
    this.baselineKey,
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

  /// On a check-out row, the check-in line it was copied from.
  final String? baselineKey;

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
    baselineKey: json['baselineKey'] as String?,
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

/// A landlord or tenant, and the email that asks them to sign from their own phone.
class SigningParty {
  const SigningParty({
    required this.stakeholderId,
    required this.email,
    required this.emailState,
    required this.emailedAt,
  });

  final String stakeholderId;
  final String? email;

  /// QUEUED, SENT or FAILED; null when no signing email has been asked for.
  final String? emailState;
  final String? emailedAt;

  factory SigningParty.fromJson(Map<String, dynamic> json) {
    final signingEmail = json['signingEmail'] as Map<String, dynamic>?;
    return SigningParty(
      stakeholderId: json['stakeholderId'] as String,
      email: json['email'] as String?,
      emailState: signingEmail?['state'] as String?,
      emailedAt: signingEmail?['at'] as String?,
    );
  }
}

class Finding {
  const Finding({
    required this.id,
    this.itemId,
    this.baselineItemId,
    required this.changeType,
    required this.verdict,
    required this.rationale,
    required this.estimatedCost,
    required this.itemLabel,
    required this.baselineLabel,
    required this.editedByHuman,
    required this.maintenanceCaseId,
    required this.maintenanceCaseTitle,
    this.photos = const [],
  });

  final String id;
  final String? itemId;
  final String? baselineItemId;
  final String changeType;
  final String verdict;
  final String rationale;
  final String? estimatedCost;
  final String? itemLabel;
  final String? baselineLabel;
  final bool editedByHuman;
  final String? maintenanceCaseId;
  final String? maintenanceCaseTitle;
  final List<ReportPhoto> photos;

  factory Finding.fromJson(Map<String, dynamic> json) => Finding(
    id: json['id'] as String,
    itemId: json['itemId'] as String?,
    baselineItemId: json['baselineItemId'] as String?,
    changeType: json['changeType'] as String,
    verdict: json['verdict'] as String,
    rationale: json['rationale'] as String,
    estimatedCost: json['estimatedCost'] as String?,
    itemLabel: json['itemLabel'] as String?,
    baselineLabel: json['baselineLabel'] as String?,
    editedByHuman: json['editedByHuman'] as bool,
    maintenanceCaseId: json['maintenanceCaseId'] as String?,
    maintenanceCaseTitle: json['maintenanceCaseTitle'] as String?,
    photos: ((json['photos'] as List<dynamic>?) ?? const [])
        .map((photo) => ReportPhoto.fromJson(photo as Map<String, dynamic>))
        .toList(),
  );
}

/// Item evidence used while choosing a finding. The signed URL is a temporary read
/// capability, never an identity or part of the finding request.
class ComparablePhoto {
  const ComparablePhoto({
    required this.id,
    required this.url,
    this.posterUrl,
    this.note,
    this.annotations,
  });
  final String id;
  final String url;
  /// The photo resized to 640px, for tiles. Null until the server has made it.
  final String? posterUrl;
  final String? note;
  final Map<String, dynamic>? annotations;

  static List<ComparablePhoto> listFromJson(Object? json) =>
      (json as List<dynamic>? ?? const []).map((value) {
        final photo = value as Map<String, dynamic>;
        return ComparablePhoto(
          id: photo['id'] as String,
          url: photo['url'] as String,
          posterUrl: photo['posterUrl'] as String?,
          note: photo['note'] as String?,
          annotations: photo['annotations'] as Map<String, dynamic>?,
        );
      }).toList();
}

/// The agreed line frozen when this check-out began, not today's live check-in.
class ComparableCheckIn {
  const ComparableCheckIn({
    required this.key,
    required this.name,
    required this.condition,
    required this.quantity,
    this.identifier,
    this.meterReading,
    this.notes,
    this.update = false,
    this.photos = const [],
  });
  final String key;
  final String name;
  final String condition;
  final int quantity;
  final String? identifier;
  final String? meterReading;
  final String? notes;
  final bool update;
  final List<ComparablePhoto> photos;

  factory ComparableCheckIn.fromJson(Map<String, dynamic> json) =>
      ComparableCheckIn(
        key: json['key'] as String,
        name: json['name'] as String,
        condition: json['condition'] as String,
        quantity: json['quantity'] as int,
        identifier: json['identifier'] as String?,
        meterReading: json['meterReading'] as String?,
        notes: json['notes'] as String?,
        update: json['update'] as bool? ?? false,
        photos: ComparablePhoto.listFromJson(json['photos']),
      );
}

class ComparableItem {
  const ComparableItem({
    required this.id,
    required this.label,
    this.roomId,
    this.roomName,
    this.name,
    this.category,
    this.condition,
    this.quantity,
    this.identifier,
    this.meterReading,
    this.notes,
    this.baselineKey,
    this.photos = const [],
    this.checkIn,
    this.representedAtCheckOut,
    this.representedByItemIds = const [],
    this.includedAtCheckOutStart,
  });
  final String id;
  final String label;
  final String? roomId;
  final String? roomName;
  final String? name;
  final String? category;
  final String? condition;
  final int? quantity;
  final String? identifier;
  final String? meterReading;
  final String? notes;
  final String? baselineKey;
  final List<ComparablePhoto> photos;
  final ComparableCheckIn? checkIn;
  final bool? representedAtCheckOut;
  final List<String> representedByItemIds;
  final bool? includedAtCheckOutStart;

  String get displayName => name ?? label;

  static List<ComparableItem> listFromJson(Object? json) =>
      (json as List<dynamic>)
          .map((entry) => entry as Map<String, dynamic>)
          .map(
            (entry) => ComparableItem(
              id: entry['id'] as String,
              label: entry['label'] as String,
              roomId: entry['roomId'] as String?,
              roomName: entry['roomName'] as String?,
              name: entry['name'] as String?,
              category: entry['category'] as String?,
              condition: entry['condition'] as String?,
              quantity: entry['quantity'] as int?,
              identifier: entry['identifier'] as String?,
              meterReading: entry['meterReading'] as String?,
              notes: entry['notes'] as String?,
              baselineKey: entry['baselineKey'] as String?,
              photos: ComparablePhoto.listFromJson(entry['photos']),
              checkIn: entry['checkIn'] == null
                  ? null
                  : ComparableCheckIn.fromJson(
                      entry['checkIn'] as Map<String, dynamic>,
                    ),
              representedAtCheckOut: entry['representedAtCheckOut'] as bool?,
              representedByItemIds:
                  (entry['representedByItemIds'] as List<dynamic>? ?? const [])
                      .cast<String>(),
              includedAtCheckOutStart:
                  entry['includedAtCheckOutStart'] as bool?,
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
