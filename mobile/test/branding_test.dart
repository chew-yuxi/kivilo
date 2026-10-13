import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/branding.dart';

void main() {
  test('reads branding with only the agency name set', () {
    final branding = AgentBranding.fromJson({
      'agencyName': 'Example Realty',
      'agencyLicence': null,
      'ceaRegistration': null,
      'phone': null,
      'logoUrl': null,
    });
    expect(branding.agencyName, 'Example Realty');
    expect(branding.logoUrl, isNull);
  });

  test('reads every field the server sends', () {
    final branding = AgentBranding.fromJson({
      'agencyName': 'Example Realty',
      'agencyLicence': 'L1234567A',
      'ceaRegistration': 'R123456B',
      'phone': '+65 6000 0000',
      'logoUrl': 'https://example.com/logo',
    });
    expect(branding.ceaRegistration, 'R123456B');
    expect(branding.logoUrl, 'https://example.com/logo');
  });
}
