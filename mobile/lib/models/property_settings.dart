class PropertyEntry {
  const PropertyEntry({
    required this.id,
    required this.label,
    required this.state,
    required this.canManage,
    required this.tenancyCount,
    required this.inspectionCount,
    this.trashExpiresAt,
  });
  final String id;
  final String label;
  final String state;
  final bool canManage;
  final int tenancyCount;
  final int inspectionCount;
  final String? trashExpiresAt;
  factory PropertyEntry.fromJson(Map<String, dynamic> json) => PropertyEntry(
    id: json['id'] as String,
    label: json['label'] as String,
    state: json['state'] as String,
    canManage: json['canManage'] as bool,
    tenancyCount: json['tenancyCount'] as int,
    inspectionCount: json['inspectionCount'] as int,
    trashExpiresAt: json['trashExpiresAt'] as String?,
  );
}

class PropertySettings {
  const PropertySettings({
    required this.id,
    required this.label,
    required this.state,
    required this.canManage,
    required this.canDelete,
    required this.confirmationLabel,
    required this.counts,
    required this.tenancies,
    this.deleteBlockedReason,
    this.trashExpiresAt,
  });
  final String id;
  final String label;
  final String state;
  final bool canManage;
  final bool canDelete;
  final String confirmationLabel;
  final Map<String, dynamic> counts;
  final List<Map<String, dynamic>> tenancies;
  final String? deleteBlockedReason;
  final String? trashExpiresAt;
  factory PropertySettings.fromJson(Map<String, dynamic> json) =>
      PropertySettings(
        id: json['id'] as String,
        label: json['label'] as String,
        state: json['state'] as String,
        canManage: json['canManage'] as bool,
        canDelete: json['canDelete'] as bool,
        confirmationLabel: json['confirmationLabel'] as String,
        counts: json['counts'] as Map<String, dynamic>,
        tenancies: (json['tenancies'] as List<dynamic>)
            .cast<Map<String, dynamic>>(),
        deleteBlockedReason: json['deleteBlockedReason'] as String?,
        trashExpiresAt: json['trashExpiresAt'] as String?,
      );
}
