/// One row on Home: a concrete thing waiting on someone, from `GET /api/v1/home`.
class HomeTask {
  const HomeTask({
    required this.id,
    required this.group,
    required this.kind,
    required this.capacity,
    required this.propertyId,
    required this.property,
    required this.tenancyId,
    required this.title,
    required this.href,
    this.person,
    this.date,
    this.dateKind,
    this.overdue = false,
  });

  final String id;

  /// `ACTION`, `WAITING` or `COMING_UP`.
  final String group;
  final String kind;
  final String capacity;
  final String propertyId;
  final String property;
  final String tenancyId;
  final String title;
  final String? person;

  /// A calendar date for `DEADLINE` and `ENDS`, a timestamp otherwise.
  final String? date;
  final String? dateKind;

  /// Only a real deadline that has passed. Nothing else is ever overdue.
  final bool overdue;

  /// The same paths notifications carry; `notificationScreen` opens them.
  final String href;

  factory HomeTask.fromJson(Map<String, dynamic> json) => HomeTask(
    id: json['id'] as String,
    group: json['group'] as String,
    kind: json['kind'] as String,
    capacity: json['capacity'] as String,
    propertyId: json['propertyId'] as String,
    property: json['property'] as String,
    tenancyId: json['tenancyId'] as String,
    title: json['title'] as String,
    person: json['person'] as String?,
    date: json['date'] as String?,
    dateKind: json['dateKind'] as String?,
    overdue: json['overdue'] as bool? ?? false,
    href: json['href'] as String,
  );
}

class HomeTasks {
  const HomeTasks({
    required this.tasks,
    this.truncated = false,
    this.dueDiligence = false,
    this.dueDiligenceCounts,
  });
  final List<HomeTask> tasks;

  /// Whether Home offers Due diligence. False from a server that predates it.
  final bool dueDiligence;

  /// Client checks needing the agent, and waiting on clients, when the preview is on.
  final ({int needsYou, int waiting})? dueDiligenceCounts;

  /// A source reached the server's bound: counts are "at least", never the whole.
  final bool truncated;

  List<HomeTask> group(String group) =>
      tasks.where((task) => task.group == group).toList();

  factory HomeTasks.fromJson(Map<String, dynamic> json) => HomeTasks(
    tasks: (json['tasks'] as List<dynamic>)
        .map((row) => HomeTask.fromJson(row as Map<String, dynamic>))
        .toList(),
    truncated: json['truncated'] as bool? ?? false,
    dueDiligence: json['dueDiligence'] as bool? ?? false,
    dueDiligenceCounts: switch (json['dueDiligenceCounts']) {
      {'needsYou': final int needsYou, 'waiting': final int waiting} => (needsYou: needsYou, waiting: waiting),
      _ => null,
    },
  );
}
