import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/home_tasks.dart';
import 'package:kivilo/models/property_work.dart';

void main() {
  test('a saved Home from before the pause does not offer client checks', () {
    final home = {'tasks': [], 'dueDiligence': true};
    expect(HomeTasks.fromJson(home).dueDiligence, isFalse);
    expect(HomeTasks.fromJson({...home, 'clientChecksEnabled': true}).dueDiligence, isTrue);
  });

  test('old cached party rows stay hidden without affecting the tenancy', () {
    final term = {
      'tenancyId': 't', 'startDate': '2026-11-01', 'endDate': '2027-10-31',
      'tenant': 'Tenant', 'landlord': 'Landlord', 'reports': [],
      'verification': {'landlord': null, 'tenant': null},
    };
    final saved = PropertyTerm.fromJson(term);
    expect(saved.verification, isNull);
    expect(saved.tenancyId, 't');
    expect(PropertyTerm.fromJson({
      ...term, 'verification': {'enabled': true, 'landlord': null, 'tenant': null},
    }).verification, isNotNull);
  });
}
