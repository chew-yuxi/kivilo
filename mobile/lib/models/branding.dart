/// How an agent's reports are headed. Everything but the agency name is optional.
class AgentBranding {
  const AgentBranding({
    required this.agencyName,
    this.agencyLicence,
    this.ceaRegistration,
    this.phone,
    this.logoUrl,
  });
  final String agencyName;
  final String? agencyLicence;
  final String? ceaRegistration;
  final String? phone;
  final String? logoUrl;

  factory AgentBranding.fromJson(Map<String, dynamic> json) => AgentBranding(
    agencyName: json['agencyName'] as String,
    agencyLicence: json['agencyLicence'] as String?,
    ceaRegistration: json['ceaRegistration'] as String?,
    phone: json['phone'] as String?,
    logoUrl: json['logoUrl'] as String?,
  );
}
