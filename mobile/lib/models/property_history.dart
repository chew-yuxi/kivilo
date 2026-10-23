class HistoryChange {
  const HistoryChange({required this.field, this.from, this.to});
  final String field;
  final String? from;
  final String? to;

  factory HistoryChange.fromJson(Map<String, dynamic> json) => HistoryChange(
    field: json['field'] as String,
    from: json['from'] as String?,
    to: json['to'] as String?,
  );
}

/// Something deleted and still in the 30-day bin, or since restored.
class BinEntry {
  const BinEntry({
    required this.id,
    required this.expiresAt,
    required this.restorable,
    this.restoredAt,
  });
  final String id;
  final DateTime expiresAt;
  final bool restorable;
  final DateTime? restoredAt;

  factory BinEntry.fromJson(Map<String, dynamic> json) => BinEntry(
    id: json['id'] as String,
    expiresAt: DateTime.parse(json['expiresAt'] as String),
    restorable: json['restorable'] as bool,
    restoredAt: json['restoredAt'] == null
        ? null
        : DateTime.parse(json['restoredAt'] as String),
  );
}

class HistoryEvent {
  const HistoryEvent({
    required this.id,
    required this.at,
    required this.actorName,
    required this.kind,
    required this.summary,
    this.changes = const [],
    this.bin,
  });
  final String id;
  final DateTime at;
  final String actorName;
  final String kind;
  final String summary;
  final List<HistoryChange> changes;
  final BinEntry? bin;

  bool get isDeletion => kind.endsWith('_DELETED');

  factory HistoryEvent.fromJson(Map<String, dynamic> json) => HistoryEvent(
    id: json['id'] as String,
    at: DateTime.parse(json['at'] as String),
    actorName: json['actorName'] as String,
    kind: json['kind'] as String,
    summary: json['summary'] as String,
    changes: (json['changes'] as List<dynamic>? ?? const [])
        .map((value) => HistoryChange.fromJson(value as Map<String, dynamic>))
        .toList(),
    bin: json['bin'] == null
        ? null
        : BinEntry.fromJson(json['bin'] as Map<String, dynamic>),
  );
}

class PropertyHistory {
  const PropertyHistory({required this.address, required this.events});
  final String address;
  final List<HistoryEvent> events;

  factory PropertyHistory.fromJson(
    Map<String, dynamic> json,
  ) => PropertyHistory(
    address: (json['property'] as Map<String, dynamic>)['address'] as String,
    events: (json['events'] as List<dynamic>)
        .map((value) => HistoryEvent.fromJson(value as Map<String, dynamic>))
        .toList(),
  );
}
