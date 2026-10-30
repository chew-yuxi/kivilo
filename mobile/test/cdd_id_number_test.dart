import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/cdd.dart';

void main() {
  test('accepts valid NRIC and FIN numbers in every series, as the server does', () {
    for (final (type, id) in [
      ('NRIC', 'S1234567D'),
      ('NRIC', 'T1234567J'),
      ('NRIC', 't0712345g'),
      ('NRIC', 's 1234567-d'),
      ('FIN', 'F1234567N'),
      ('FIN', 'G1234567X'),
      ('FIN', 'M1234567K'),
    ]) {
      expect(idNumberProblem(type, id), isNull, reason: id);
    }
  });

  test('refuses a wrong check letter, the wrong type and the wrong shape', () {
    expect(idNumberProblem('NRIC', 'S1234567A'), 'This NRIC number is not valid. Check it against the card');
    expect(idNumberProblem('FIN', 'M1234567X'), 'This FIN number is not valid. Check it against the card');
    expect(idNumberProblem('NRIC', 'G1234567X'), 'This is a FIN number. Choose FIN as the ID type');
    expect(idNumberProblem('FIN', 'S1234567D'), 'This is an NRIC number. Choose NRIC as the ID type');
    expect(idNumberProblem('NRIC', 'S123456D'), startsWith('An NRIC is a letter, seven digits and a letter'));
    expect(idNumberProblem('PASSPORT', 'E12-34567X'), isNull);
    expect(idNumberProblem('PASSPORT', 'A1#'), 'Check the passport number: letters and digits only');
  });
}
