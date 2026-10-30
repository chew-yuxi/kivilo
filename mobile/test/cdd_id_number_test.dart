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

  group('particularsProblem matches the server', () {
    final today = DateTime(2026, 10, 31);
    ParticularsProblem? check({
      String legalName = 'Tan Wei Ling',
      String idType = 'NRIC',
      String idNumber = 'S1234567D',
      String? nationality = 'Singapore',
      DateTime? born,
      bool noBirthday = false,
      String address = 'Blk 231 Bishan Street 23, #10-120, Singapore 570231',
      bool pepDeclared = false,
      String? pepDetails,
    }) => particularsProblem(
      legalName: legalName,
      idType: idType,
      idNumber: idNumber,
      nationality: nationality,
      dateOfBirth: noBirthday ? null : born ?? DateTime(1985, 4, 12),
      address: address,
      pepDeclared: pepDeclared,
      pepDetails: pepDetails,
      today: today,
    );

    test('accepts real particulars and the punctuation names carry', () {
      expect(check(), isNull);
      for (final name in ['Siti Nurhaliza binte Ahmad', 'Rajesh s/o Kumar', 'Tan Ah Kow @ Tan Kow', "Mary-Anne O'Brien", '陈伟玲']) {
        expect(check(legalName: name), isNull, reason: name);
      }
      expect(check(idNumber: 'T0712345G', born: DateTime(2007, 3, 19)), isNull);
      expect(check(idType: 'FIN', idNumber: 'G1234567X', nationality: 'Malaysia'), isNull);
      expect(check(born: DateTime(2008, 10, 31), idNumber: 'T0812345J'), isNull);
    });

    test('refuses whatever cannot be right, on the field to fix', () {
      for (final name in ['', 'T', 'Tan 123', '- -']) {
        expect(check(legalName: name)?.field, 'legalName', reason: name);
      }
      expect(check(noBirthday: true)?.field, 'dateOfBirth');
      expect(check(born: DateTime(2027))?.message, 'The date of birth cannot be in the future');
      expect(check(born: DateTime(2008, 11, 1), idNumber: 'T0812345J')?.message, 'A party to a tenancy must be at least 18');
      expect(check(born: DateTime(1890))?.message, 'Check the year of birth');
      for (final nationality in ['Singaporean', 'sg', null]) {
        expect(check(nationality: nationality)?.field, 'nationality');
      }
      expect(check(address: 'Bishan')?.field, 'address');
      expect(check(born: DateTime(2003, 5, 1))?.message, startsWith('An NRIC starting with S is for someone born before 2000'));
      expect(check(idNumber: 'T0712345G', born: DateTime(1999, 12, 31))?.message, startsWith('An NRIC starting with T'));
      expect(check(idType: 'FIN', idNumber: 'G1234567X')?.message, 'A FIN is issued to foreigners. A Singapore citizen uses their NRIC');
      expect(check(pepDeclared: true, pepDetails: ' ')?.field, 'pepDetails');
    });
  });
}
