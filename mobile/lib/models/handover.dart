/// A sign-in link, never the bearer URL of the shared report.
class TenantHandover {
  const TenantHandover({
    required this.tenancyId,
    required this.url,
    required this.windowDays,
    required this.modules,
    this.deadline,
  });

  final String tenancyId;
  final String url;
  final int windowDays;

  /// An inclusive Singapore calendar date, rather than the phone's time zone.
  final String? deadline;
  final List<List<bool>> modules;

  factory TenantHandover.fromJson(Map<String, dynamic> json) => TenantHandover(
    tenancyId: json['tenancyId'] as String,
    url: json['url'] as String,
    deadline: json['deadline'] as String?,
    windowDays: json['windowDays'] as int,
    modules: (json['modules'] as List<dynamic>)
        .map((row) => (row as List<dynamic>).cast<bool>())
        .toList(),
  );
}

class MoveInDefectWindow {
  const MoveInDefectWindow({
    required this.windowDays,
    required this.opensAt,
    required this.canSubmit,
    required this.canEditWindow,
    required this.targets,
    this.deadline,
    this.checkInId,
  });

  final int windowDays;
  final String opensAt;
  final String? deadline;
  final bool canSubmit;
  final bool canEditWindow;
  final String? checkInId;
  final List<MoveInDefectTarget> targets;

  factory MoveInDefectWindow.fromJson(Map<String, dynamic> json) =>
      MoveInDefectWindow(
        windowDays: json['windowDays'] as int,
        opensAt: json['opensAt'] as String,
        deadline: json['deadline'] as String?,
        canSubmit: json['canSubmit'] as bool,
        canEditWindow: json['canEditWindow'] as bool,
        checkInId: json['checkInId'] as String?,
        targets: (json['targets'] as List<dynamic>)
            .map(
              (target) =>
                  MoveInDefectTarget.fromJson(target as Map<String, dynamic>),
            )
            .toList(),
      );
}

class MoveInDefectTarget {
  const MoveInDefectTarget({
    required this.key,
    required this.roomName,
    required this.name,
    required this.category,
    required this.condition,
  });

  final String key;
  final String roomName;
  final String name;
  final String category;
  final String condition;

  factory MoveInDefectTarget.fromJson(Map<String, dynamic> json) =>
      MoveInDefectTarget(
        key: json['key'] as String,
        roomName: json['roomName'] as String,
        name: json['name'] as String,
        category: json['category'] as String,
        condition: json['condition'] as String,
      );
}
