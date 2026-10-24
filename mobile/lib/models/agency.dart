import 'maintenance.dart';

class AgencySummary {
  const AgencySummary({
    required this.id,
    required this.name,
    required this.role,
    required this.memberCount,
  });
  final String id;
  final String name;
  final String role;
  final int memberCount;
  factory AgencySummary.fromJson(Map<String, dynamic> json) => AgencySummary(
    id: json['id'] as String,
    name: json['name'] as String,
    role: json['role'] as String,
    memberCount: json['memberCount'] as int,
  );
}

class AgencyInvitation {
  const AgencyInvitation({
    required this.id,
    required this.agencyId,
    required this.agencyName,
    required this.role,
    required this.expiresAt,
  });
  final String id;
  final String agencyId;
  final String agencyName;
  final String role;
  final String expiresAt;
  factory AgencyInvitation.fromJson(Map<String, dynamic> json) =>
      AgencyInvitation(
        id: json['id'] as String,
        agencyId: json['agencyId'] as String,
        agencyName: json['agencyName'] as String,
        role: json['role'] as String,
        expiresAt: json['expiresAt'] as String,
      );
}

class AgencyIndex {
  const AgencyIndex({required this.agencies, required this.invitations});
  final List<AgencySummary> agencies;
  final List<AgencyInvitation> invitations;
  factory AgencyIndex.fromJson(Map<String, dynamic> json) => AgencyIndex(
    agencies: (json['agencies'] as List<dynamic>)
        .map((v) => AgencySummary.fromJson(v as Map<String, dynamic>))
        .toList(),
    invitations: (json['invitations'] as List<dynamic>)
        .map((v) => AgencyInvitation.fromJson(v as Map<String, dynamic>))
        .toList(),
  );
}

class AgencyMember {
  const AgencyMember({
    required this.id,
    required this.stakeholderId,
    required this.name,
    required this.email,
    required this.role,
    required this.status,
    required this.assignedTenancies,
    this.expiresAt,
  });
  final String id;
  final String stakeholderId;
  final String name;
  final String? email;
  final String role;
  final String status;
  final int assignedTenancies;
  final String? expiresAt;
  bool get active => status == 'ACTIVE';
  factory AgencyMember.fromJson(Map<String, dynamic> json) => AgencyMember(
    id: json['id'] as String,
    stakeholderId: json['stakeholderId'] as String,
    name: json['name'] as String,
    email: json['email'] as String?,
    role: json['role'] as String,
    status: json['status'] as String,
    assignedTenancies: json['assignedTenancies'] as int,
    expiresAt: json['expiresAt'] as String?,
  );
}

class AgencyDetail {
  const AgencyDetail({
    required this.id,
    required this.name,
    required this.role,
    required this.canManage,
    required this.members,
    required this.tenancies,
    required this.activity,
    this.branding = const AgentBranding(agencyName: ''),
  });
  final String id;
  final String name;
  final String role;
  final bool canManage;
  final List<AgencyMember> members;
  final List<Map<String, dynamic>> tenancies;
  final List<Map<String, dynamic>> activity;
  final AgentBranding branding;
  factory AgencyDetail.fromJson(Map<String, dynamic> json) => AgencyDetail(
    id: json['id'] as String,
    name: json['name'] as String,
    role: json['role'] as String,
    canManage: json['canManage'] as bool,
    members: (json['members'] as List<dynamic>)
        .map((v) => AgencyMember.fromJson(v as Map<String, dynamic>))
        .toList(),
    tenancies: (json['tenancies'] as List<dynamic>)
        .cast<Map<String, dynamic>>(),
    activity: (json['activity'] as List<dynamic>).cast<Map<String, dynamic>>(),
    branding: AgentBranding.fromResponse({'branding': json['branding']})!,
  );
}

String agencyRoleLabel(String role) => switch (role) {
  'OWNER' => 'Owner',
  'MANAGER' => 'Manager',
  _ => 'Agent',
};
