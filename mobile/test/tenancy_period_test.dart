import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/ui/tenancy_period.dart';

void main() {
  test('year-long terms include the start day and handle leap years', () {
    expect(tenancyEndDate(DateTime(2026, 11, 19), 2), DateTime(2028, 11, 18));
    expect(tenancyEndDate(DateTime(2028, 2, 29), 1), DateTime(2029, 2, 28));
    expect(tenancyEndDate(DateTime(2027, 3, 1), 1), DateTime(2028, 2, 29));
    expect(matchingTenancyYears(DateTime(2026, 11, 19), DateTime(2028, 11, 18)), 2);
    expect(matchingTenancyYears(DateTime(2026, 11, 19), DateTime(2028, 11, 19)), 0);
  });
}
