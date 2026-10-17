class RenewalReminder {
  const RenewalReminder({
    required this.id,
    required this.property,
    required this.tenant,
    required this.endDate,
  });

  final String id;
  final String property;
  final String tenant;
  final String endDate;

  factory RenewalReminder.fromJson(Map<String, dynamic> json) =>
      RenewalReminder(
        id: json['id'] as String,
        property: json['property'] as String,
        tenant: json['tenant'] as String,
        endDate: json['endDate'] as String,
      );
}
