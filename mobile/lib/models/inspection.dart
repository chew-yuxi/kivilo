/// Mirrors GET /api/v1/inspections. Hand written rather than generated: the shape is
/// small and it is the server's route handler, not a schema, that defines it.
class InspectionSummary {
  const InspectionSummary({
    required this.id,
    required this.kind,
    required this.status,
    required this.property,
    required this.tenant,
    required this.rooms,
  });

  final String id;
  final String kind;
  final String status;
  final String property;
  final String tenant;
  final int rooms;

  factory InspectionSummary.fromJson(Map<String, dynamic> json) => InspectionSummary(
        id: json['id'] as String,
        kind: json['kind'] as String,
        status: json['status'] as String,
        property: json['property'] as String,
        tenant: json['tenant'] as String,
        rooms: json['rooms'] as int,
      );

  String get kindLabel => kind == 'CHECK_IN' ? 'Check-in' : 'Check-out';
}

/// Mirrors GET /api/v1/inspections/[id].
class InspectionDetail {
  const InspectionDetail({
    required this.id,
    required this.kind,
    required this.status,
    required this.property,
    required this.landlord,
    required this.tenant,
    required this.summary,
    required this.rooms,
  });

  final String id;
  final String kind;
  final String status;
  final String property;
  final String landlord;
  final String tenant;
  final String? summary;
  final List<RoomSummary> rooms;

  factory InspectionDetail.fromJson(Map<String, dynamic> json) => InspectionDetail(
        id: json['id'] as String,
        kind: json['kind'] as String,
        status: json['status'] as String,
        property: json['property'] as String,
        landlord: json['landlord'] as String,
        tenant: json['tenant'] as String,
        summary: json['summary'] as String?,
        rooms: (json['rooms'] as List)
            .map((room) => RoomSummary.fromJson(room as Map<String, dynamic>))
            .toList(),
      );
}

class RoomSummary {
  const RoomSummary({
    required this.id,
    required this.name,
    required this.status,
    required this.items,
    required this.photos,
    required this.videos,
    required this.newSinceDraft,
  });

  final String id;
  final String name;
  final String status;
  final int items;
  final int photos;
  final int videos;
  final int newSinceDraft;

  factory RoomSummary.fromJson(Map<String, dynamic> json) => RoomSummary(
        id: json['id'] as String,
        name: json['name'] as String,
        status: json['status'] as String,
        items: json['items'] as int,
        photos: json['photos'] as int,
        videos: json['videos'] as int,
        newSinceDraft: json['newSinceDraft'] as int,
      );

  /// The same wording the web app uses, so an agent moving between the two reads one
  /// vocabulary rather than two.
  String get statusLabel => switch (status) {
        'PENDING' => 'Not started',
        'CAPTURING' => 'Capturing',
        'PROCESSING' => 'Drafting',
        'REVIEW' => 'Needs review',
        'REVIEWED' => 'Reviewed',
        _ => 'Failed',
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
