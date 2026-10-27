import 'report.dart';

/// Updates since signing on a countersigned check-in, as the agent works on them: the
/// same data the web panel draws (`GET /api/v1/inspections/<id>/addenda`).
class AddendaWorkspace {
  const AddendaWorkspace({
    required this.published,
    required this.draft,
    required this.rooms,
    required this.targets,
    required this.resolvedCases,
  });

  final List<PublishedAddendum> published;
  final AddendumDraft? draft;

  /// The rooms of the report as it stands, which an added line can go in.
  final List<String> rooms;

  /// The lines a replacement or removal can name.
  final List<AddendumTarget> targets;

  /// Resolved repairs on this tenancy not yet in any update.
  final List<({String id, String title})> resolvedCases;

  factory AddendaWorkspace.fromJson(Map<String, dynamic> json) =>
      AddendaWorkspace(
        published: (json['published'] as List<dynamic>)
            .map((p) => PublishedAddendum.fromJson(p as Map<String, dynamic>))
            .toList(),
        draft: json['draft'] == null
            ? null
            : AddendumDraft.fromJson(json['draft'] as Map<String, dynamic>),
        rooms: (json['rooms'] as List<dynamic>).cast<String>(),
        targets: (json['targets'] as List<dynamic>)
            .map((t) => t as Map<String, dynamic>)
            .map(
              (t) => AddendumTarget(
                key: t['key'] as String,
                label: t['label'] as String,
              ),
            )
            .toList(),
        resolvedCases: (json['resolvedCases'] as List<dynamic>)
            .map((c) => c as Map<String, dynamic>)
            .map((c) => (id: c['id'] as String, title: c['title'] as String))
            .toList(),
      );
}

class AddendumTarget {
  const AddendumTarget({required this.key, required this.label});

  /// `item:<id>` or `entry:<id>`.
  final String key;

  /// "Kitchen · Dishwasher (Bosch SMS2)".
  final String label;
}

class PublishedAddendum {
  const PublishedAddendum({
    required this.id,
    required this.number,
    required this.title,
    required this.effectiveDate,
    required this.acknowledgements,
  });

  final String id;
  final int number;
  final String title;
  final String effectiveDate;
  final List<AddendumAcknowledgement> acknowledgements;

  factory PublishedAddendum.fromJson(Map<String, dynamic> json) =>
      PublishedAddendum(
        id: json['id'] as String,
        number: json['number'] as int,
        title: json['title'] as String,
        effectiveDate: json['effectiveDate'] as String,
        acknowledgements: (json['acknowledgements'] as List<dynamic>)
            .map(
              (a) =>
                  AddendumAcknowledgement.fromJson(a as Map<String, dynamic>),
            )
            .toList(),
      );
}

class AddendumDraft {
  const AddendumDraft({
    required this.id,
    required this.title,
    this.reason,
    required this.effectiveDate,
    required this.entries,
  });

  final String id;
  final String title;
  final String? reason;

  /// `YYYY-MM-DD`, the day the change happened.
  final String effectiveDate;
  final List<DraftEntry> entries;

  factory AddendumDraft.fromJson(Map<String, dynamic> json) => AddendumDraft(
    id: json['id'] as String,
    title: json['title'] as String,
    reason: json['reason'] as String?,
    effectiveDate: json['effectiveDate'] as String,
    entries: (json['entries'] as List<dynamic>)
        .map((e) => DraftEntry.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
}

/// One change on the draft, as the agent wrote it.
class DraftEntry {
  const DraftEntry({
    required this.id,
    required this.change,
    required this.roomName,
    this.targetKey,
    this.name,
    this.category,
    this.condition,
    this.quantity = 1,
    this.identifier,
    this.notes,
    this.maintenanceCaseTitle,
    this.photos = const [],
  });

  final String id;

  /// `ADDED`, `REPLACED` or `REMOVED`.
  final String change;
  final String roomName;
  final String? targetKey;
  final String? name;
  final String? category;
  final String? condition;
  final int quantity;
  final String? identifier;
  final String? notes;
  final String? maintenanceCaseTitle;
  final List<DraftPhoto> photos;

  /// The body the entry endpoints take, the same fields the web form sends.
  Map<String, dynamic> toJson() => {
    'change': change,
    'roomName': roomName,
    'targetKey': targetKey,
    'name': name,
    'category': category,
    'condition': condition,
    'quantity': quantity,
    'identifier': identifier,
    'notes': notes,
  };

  factory DraftEntry.fromJson(Map<String, dynamic> json) => DraftEntry(
    id: json['id'] as String,
    change: json['change'] as String,
    roomName: json['roomName'] as String,
    targetKey: json['targetKey'] as String?,
    name: json['name'] as String?,
    category: json['category'] as String?,
    condition: json['condition'] as String?,
    quantity: json['quantity'] as int,
    identifier: json['identifier'] as String?,
    notes: json['notes'] as String?,
    maintenanceCaseTitle: json['maintenanceCaseTitle'] as String?,
    photos: (json['photos'] as List<dynamic>)
        .map((p) => p as Map<String, dynamic>)
        .map(
          (p) => DraftPhoto(
            id: p['id'] as String,
            url: p['url'] as String,
            posterUrl: p['posterUrl'] as String?,
            note: p['note'] as String?,
            label: p['label'] as String?,
          ),
        )
        .toList(),
  );
}

class DraftPhoto {
  const DraftPhoto({
    required this.id,
    required this.url,
    this.posterUrl,
    this.note,
    this.label,
  });
  final String id;
  final String url;
  /// The photo resized to 640px, for tiles. Null until the server has made it.
  final String? posterUrl;
  final String? note;

  /// "Before" or "After" for a repair's evidence.
  final String? label;
}
