class TenancyAccess {
  const TenancyAccess({
    required this.tenancyId,
    required this.visibility,
    required this.canManageAccess,
    required this.leadAgent,
    required this.collaborators,
    this.scope = 'TENANCY',
    this.inspectionOnly = const [],
    this.agency,
    this.availableMembers = const [],
    this.canManageAssignment = false,
  });

  final Map<String, dynamic>? agency;
  final List<AccessAgent> availableMembers;
  final bool canManageAssignment;
  final String tenancyId;
  final String visibility;
  final bool canManageAccess;
  final AccessAgent? leadAgent;
  final List<TenancyCollaborator> collaborators;
  final String scope;
  final List<InspectionAccessPerson> inspectionOnly;

  factory TenancyAccess.fromJson(Map<String, dynamic> json) => TenancyAccess(
    tenancyId: json['tenancyId'] as String,
    agency: json['agency'] as Map<String, dynamic>?,
    canManageAssignment: json['canManageAssignment'] as bool? ?? false,
    availableMembers: (json['availableMembers'] as List<dynamic>? ?? const [])
        .map((value) {
          final person = value as Map<String, dynamic>;
          return AccessAgent(
            id: person['stakeholderId'] as String,
            name: person['name'] as String,
            email: person['email'] as String?,
          );
        })
        .toList(),
    visibility: json['visibility'] as String,
    canManageAccess: json['canManageAccess'] as bool,
    scope: json['scope'] as String? ?? 'TENANCY',
    leadAgent: json['leadAgent'] == null
        ? null
        : AccessAgent.fromJson(json['leadAgent'] as Map<String, dynamic>),
    collaborators: (json['collaborators'] as List<dynamic>)
        .map(
          (value) =>
              TenancyCollaborator.fromJson(value as Map<String, dynamic>),
        )
        .toList(),
    inspectionOnly: (json['inspectionOnly'] as List<dynamic>? ?? const [])
        .map(
          (value) =>
              InspectionAccessPerson.fromJson(value as Map<String, dynamic>),
        )
        .toList(),
  );

  String get label {
    if (scope == 'INSPECTION') return 'Access to previous reports';
    if (agency != null) return 'Team tenancy · ${agency!['name']}';
    if (visibility == 'PRIVATE') return 'Private';
    if (!canManageAccess) return 'Shared tenancy';
    if (collaborators.isNotEmpty) {
      return 'Shared with ${collaborators.map((person) => person.name).join(', ')}';
    }
    return 'Previous reports shared with ${inspectionOnly.map((person) => person.name).join(', ')}';
  }
}

class AccessAgent {
  const AccessAgent({
    required this.id,
    required this.name,
    required this.email,
  });

  final String id;
  final String name;
  final String? email;

  factory AccessAgent.fromJson(Map<String, dynamic> json) => AccessAgent(
    id: json['id'] as String,
    name: json['name'] as String,
    email: json['email'] as String?,
  );
}

class TenancyCollaborator {
  const TenancyCollaborator({
    required this.stakeholderId,
    required this.name,
    required this.email,
    required this.addedAt,
  });

  final String stakeholderId;
  final String name;
  final String? email;
  final String addedAt;

  factory TenancyCollaborator.fromJson(Map<String, dynamic> json) =>
      TenancyCollaborator(
        stakeholderId: json['stakeholderId'] as String,
        name: json['name'] as String,
        email: json['email'] as String?,
        addedAt: json['addedAt'] as String,
      );
}

class InspectionAccessPerson {
  const InspectionAccessPerson({
    required this.stakeholderId,
    required this.name,
    required this.email,
    required this.inspectionIds,
  });

  final String stakeholderId;
  final String name;
  final String? email;
  final List<String> inspectionIds;

  factory InspectionAccessPerson.fromJson(Map<String, dynamic> json) =>
      InspectionAccessPerson(
        stakeholderId: json['stakeholderId'] as String,
        name: json['name'] as String,
        email: json['email'] as String?,
        inspectionIds: (json['inspectionIds'] as List<dynamic>).cast<String>(),
      );
}
