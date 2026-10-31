import 'countries.dart';

/// CEA customer due diligence for one client of one deal (plans/compliance-pack.md).
class CddCaseSummary {
  const CddCaseSummary({
    required this.id,
    required this.status,
    required this.clientRole,
    required this.clientName,
    required this.property,
    required this.openMatches,
    required this.screened,
    this.particularsIn = false,
    this.idSighted = false,
    this.riskAssessed = false,
    this.needsCorrection = false,
  });

  final String id;
  final String status;
  final String clientRole;
  final String clientName;
  final String? property;
  final int openMatches;
  final bool screened;
  final bool particularsIn;
  final bool idSighted;
  final bool riskAssessed;

  /// The stored particulars fail a rule and must be sent again.
  final bool needsCorrection;

  /// The five review steps done, the same rule the case screen draws.
  int get stepsDone => needsCorrection
      ? 0
      : [
          particularsIn,
          idSighted,
          screened && openMatches == 0 && status != 'ESCALATED',
          riskAssessed,
          status == 'COMPLETE',
        ].where((done) => done).length;

  factory CddCaseSummary.fromJson(Map<String, dynamic> json) => CddCaseSummary(
    id: json['id'] as String,
    status: json['status'] as String,
    clientRole: json['clientRole'] as String,
    clientName: json['clientName'] as String,
    property: json['property'] as String?,
    openMatches: (json['openMatches'] as num?)?.toInt() ?? 0,
    screened: json['screened'] as bool? ?? false,
    particularsIn: json['particularsIn'] as bool? ?? false,
    idSighted: json['idSighted'] as bool? ?? false,
    riskAssessed: json['riskAssessed'] as bool? ?? false,
    needsCorrection: json['needsCorrection'] as bool? ?? false,
  );
}

class CddParticulars {
  const CddParticulars({
    required this.legalName,
    required this.idType,
    required this.idNumber,
    required this.nationality,
    required this.dateOfBirth,
    required this.address,
    required this.pepDeclared,
    required this.pepDetails,
    required this.submittedInPerson,
    required this.idSighted,
    this.submittedAt,
    this.idSightedAt,
  });

  final String legalName;
  final String idType;

  /// Always masked by the server: only the last four characters are ever sent.
  final String idNumber;
  final String nationality;
  final String? dateOfBirth;
  final String address;
  final bool pepDeclared;
  final String? pepDetails;
  final bool submittedInPerson;
  final bool idSighted;
  final DateTime? submittedAt;
  final DateTime? idSightedAt;

  factory CddParticulars.fromJson(Map<String, dynamic> json) => CddParticulars(
    legalName: json['legalName'] as String,
    idType: json['idType'] as String,
    idNumber: json['idNumber'] as String,
    nationality: json['nationality'] as String,
    dateOfBirth: json['dateOfBirth'] as String?,
    address: json['address'] as String,
    pepDeclared: json['pepDeclared'] as bool? ?? false,
    pepDetails: json['pepDetails'] as String?,
    submittedInPerson: json['submittedInPerson'] as bool? ?? false,
    idSighted: json['idSighted'] as bool? ?? false,
    submittedAt: DateTime.tryParse(json['submittedAt'] as String? ?? ''),
    idSightedAt: DateTime.tryParse(json['idSightedAt'] as String? ?? ''),
  );
}

/// A listed person or entity close enough to the client for the agent to decide on.
class CddMatch {
  const CddMatch({
    required this.id,
    required this.source,
    required this.reference,
    required this.matchedName,
    required this.score,
    required this.listedNames,
    required this.birthYears,
    required this.nationalities,
    required this.decision,
    required this.reason,
    this.positions = const [],
  });

  /// For a politically exposed person: the positions they hold or held.
  final List<String> positions;

  bool get pep => source == 'PEP';

  final String id;
  final String source;
  final String reference;
  final String matchedName;
  final double score;
  final List<String> listedNames;
  final List<int> birthYears;
  final List<String> nationalities;
  final String? decision;
  final String? reason;

  factory CddMatch.fromJson(Map<String, dynamic> json) {
    final details = (json['details'] as Map?)?.cast<String, dynamic>() ?? const {};
    return CddMatch(
      id: json['id'] as String,
      source: json['source'] as String,
      reference: json['reference'] as String,
      matchedName: json['matchedName'] as String,
      score: (json['score'] as num).toDouble(),
      listedNames: [for (final name in details['names'] as List? ?? const []) name as String],
      birthYears: [for (final year in details['birthYears'] as List? ?? const []) (year as num).toInt()],
      nationalities: [for (final country in details['nationalities'] as List? ?? const []) country as String],
      decision: json['decision'] as String?,
      reason: json['reason'] as String?,
      positions: [for (final position in details['positions'] as List? ?? const []) position as String],
    );
  }
}

class CddScreeningRun {
  const CddScreeningRun({required this.ranAt, required this.lists, required this.matches});

  final DateTime ranAt;

  /// The source and publication date of every list checked, e.g. "UN 2026-10-28".
  final List<String> lists;
  final List<CddMatch> matches;

  factory CddScreeningRun.fromJson(Map<String, dynamic> json) => CddScreeningRun(
    ranAt: DateTime.parse(json['ranAt'] as String),
    lists: [
      for (final version in json['listVersions'] as List? ?? const [])
        if ((version as Map)['source'] == 'PEP')
          'PEP check'
        else
          [
            version['source'],
            if (version['publishedAt'] != null) (version['publishedAt'] as String).substring(0, 10),
          ].join(' '),
    ],
    matches: [
      for (final match in json['candidates'] as List? ?? const [])
        CddMatch.fromJson((match as Map).cast<String, dynamic>()),
    ],
  );
}

class CddCase {
  const CddCase({
    required this.id,
    required this.status,
    required this.clientRole,
    required this.clientName,
    required this.clientEmail,
    required this.particulars,
    required this.runs,
    this.reference = '',
    this.riskLevel,
    this.riskAssessedAt,
    this.riskAnswers = const {},
    this.riskQuestions = const [],
    this.completedAt,
    this.contentHash,
    this.requestedAt,
    this.particularsProblem,
  });

  /// What is wrong with the stored particulars under today's rules, if anything.
  final ParticularsProblem? particularsProblem;

  /// When the form was last emailed to the client.
  final DateTime? requestedAt;

  final String id;
  final String reference;

  /// STANDARD or HIGHER once the risk checklist is answered.
  final String? riskLevel;
  final DateTime? riskAssessedAt;
  final Map<String, Object?> riskAnswers;

  /// The checklist the server asks today, in order.
  final List<CddRiskQuestion> riskQuestions;
  final DateTime? completedAt;

  /// SHA-256 of the locked record, set at completion.
  final String? contentHash;
  final String status;
  final String clientRole;
  final String clientName;
  final String? clientEmail;
  final CddParticulars? particulars;

  /// Newest first.
  final List<CddScreeningRun> runs;

  List<CddMatch> get openMatches =>
      runs.isEmpty ? const [] : runs.first.matches.where((match) => match.decision == null).toList();

  factory CddCase.fromJson(Map<String, dynamic> json) {
    final client = (json['client'] as Map).cast<String, dynamic>();
    final particulars = json['particulars'] as Map?;
    final risk = (json['riskAssessment'] as Map?)?.cast<String, dynamic>();
    return CddCase(
      reference: json['reference'] as String? ?? '',
      riskLevel: risk?['level'] as String?,
      riskAssessedAt: DateTime.tryParse(risk?['assessedAt'] as String? ?? ''),
      riskAnswers: (risk?['answers'] as Map?)?.cast<String, Object?>() ?? const {},
      riskQuestions: [
        for (final question in json['riskQuestions'] as List? ?? const [])
          CddRiskQuestion.fromJson((question as Map).cast<String, dynamic>()),
      ],
      completedAt: DateTime.tryParse(json['completedAt'] as String? ?? ''),
      contentHash: json['contentHash'] as String?,
      requestedAt: DateTime.tryParse(json['requestedAt'] as String? ?? ''),
      particularsProblem: switch (json['particularsProblem']) {
        {'field': final String field, 'message': final String message} => (field: field, message: message),
        _ => null,
      },
      id: json['id'] as String,
      status: json['status'] as String,
      clientRole: json['clientRole'] as String,
      clientName: particulars?['legalName'] as String? ?? client['name'] as String,
      clientEmail: client['email'] as String?,
      particulars: particulars == null ? null : CddParticulars.fromJson(particulars.cast<String, dynamic>()),
      runs: [
        for (final run in json['screeningRuns'] as List? ?? const [])
          CddScreeningRun.fromJson((run as Map).cast<String, dynamic>()),
      ],
    );
  }
}

class CddRiskQuestion {
  const CddRiskQuestion({required this.key, required this.text, this.help});

  final String key;
  final String text;
  final String? help;

  factory CddRiskQuestion.fromJson(Map<String, dynamic> json) => CddRiskQuestion(
    key: json['key'] as String,
    text: json['text'] as String,
    help: json['help'] as String?,
  );
}

const _idWeights = [2, 7, 6, 5, 4, 3, 2];
const _idOffsets = {'S': 0, 'T': 4, 'F': 0, 'G': 4, 'M': 3};
const _idLetters = {
  'S': 'JZIHGFEDCBA',
  'T': 'JZIHGFEDCBA',
  'F': 'XWUTRQPNMLK',
  'G': 'XWUTRQPNMLK',
  'M': 'XWUTRQPNJLK',
};

/// As printed on the document: upper case, no spaces or dashes.
String normalizeIdNumber(String idNumber) => idNumber.toUpperCase().replaceAll(RegExp(r'[\s-]'), '');

/// Why this ID number cannot be right for its type, or null when it can be. The same rule
/// as the server's `idNumberProblem` (src/lib/cdd/id-number.ts), which stays the authority:
/// NRIC and FIN numbers end in a check letter computed from the rest.
String? idNumberProblem(String idType, String idNumber) {
  final id = normalizeIdNumber(idNumber);
  if (idType == 'PASSPORT') {
    return RegExp(r'^[A-Z0-9]{5,20}$').hasMatch(id) ? null : 'Check the passport number: letters and digits only';
  }
  final parts = RegExp(r'^([STFGM])(\d{7})([A-Z])$').firstMatch(id);
  if (parts == null) {
    return 'An $idType is a letter, seven digits and a letter, like ${idType == 'NRIC' ? 'S1234567D' : 'G1234567X'}';
  }
  final prefix = parts.group(1)!;
  final digits = parts.group(2)!;
  final nric = prefix == 'S' || prefix == 'T';
  if (idType == 'NRIC' && !nric) return 'This is a FIN number. Choose FIN as the ID type';
  if (idType == 'FIN' && nric) return 'This is an NRIC number. Choose NRIC as the ID type';
  var sum = _idOffsets[prefix]!;
  for (var i = 0; i < 7; i++) {
    sum += int.parse(digits[i]) * _idWeights[i];
  }
  if (_idLetters[prefix]![sum % 11] != parts.group(3)) return 'This $idType number is not valid. Check it against the card';
  return null;
}

/// Which field a particulars problem belongs to, and what to fix.
typedef ParticularsProblem = ({String field, String message});

final _nameShape = RegExp(r"^[\p{L}\p{M}][\p{L}\p{M} .,'’@/()-]*$", unicode: true);
final _letter = RegExp(r'\p{L}', unicode: true);

/// The first problem with these particulars, field by field in the order the form asks,
/// or null. The same rules as the server's `particularsProblem`
/// (src/lib/cdd/particulars-rules.ts), which stays the authority.
ParticularsProblem? particularsProblem({
  required String legalName,
  required String idType,
  required String idNumber,
  required String? nationality,
  required DateTime? dateOfBirth,
  required String address,
  required bool pepDeclared,
  String? pepDetails,
  DateTime? today,
}) {
  final now = today ?? DateTime.now();
  final name = legalName.trim();
  if (name.length < 2 || _letter.allMatches(name).length < 2) {
    return (field: 'legalName', message: 'Enter the full name as it appears on the ID');
  }
  if (!_nameShape.hasMatch(name) || name.length > 120) {
    return (field: 'legalName', message: 'The name can only have letters, spaces and . , \' - @ / ( )');
  }

  final born = dateOfBirth;
  if (born == null) return (field: 'dateOfBirth', message: 'Enter the date of birth as it appears on the ID');
  if (born.isAfter(now)) return (field: 'dateOfBirth', message: 'The date of birth cannot be in the future');
  var age = now.year - born.year;
  if (now.month < born.month || (now.month == born.month && now.day < born.day)) age--;
  if (age < 18) return (field: 'dateOfBirth', message: 'A party to a tenancy must be at least 18');
  if (age > 120) return (field: 'dateOfBirth', message: 'Check the year of birth');

  if (nationality == null || !countries.contains(nationality)) {
    return (field: 'nationality', message: 'Choose the nationality from the list');
  }

  final place = address.trim();
  if (place.length < 10 || !_letter.hasMatch(place) || !RegExp(r'\d').hasMatch(place)) {
    return (field: 'address', message: 'Enter the full residential address, with the block or house number and postal code');
  }

  if (idNumberProblem(idType, idNumber) case final problem?) return (field: 'idNumber', message: problem);
  final id = normalizeIdNumber(idNumber);
  // S and T record the century of birth, for citizens and permanent residents alike.
  if (idType == 'NRIC' && id.startsWith('S') && born.year >= 2000) {
    return (
      field: 'idNumber',
      message: 'An NRIC starting with S is for someone born before 2000. Check the NRIC and date of birth against the card',
    );
  }
  if (idType == 'NRIC' && id.startsWith('T') && born.year < 2000) {
    return (
      field: 'idNumber',
      message: 'An NRIC starting with T is for someone born in 2000 or later. Check the NRIC and date of birth against the card',
    );
  }
  if (idType == 'FIN' && nationality == 'Singapore') {
    return (field: 'idNumber', message: 'A FIN is issued to foreigners. A Singapore citizen uses their NRIC');
  }

  if (pepDeclared && (pepDetails?.trim().length ?? 0) < 5) {
    return (field: 'pepDetails', message: 'Say which public position is held, and by whom');
  }
  return null;
}

/// One party's CEA due diligence on a tenancy: the newest case for them.
class PartyCheck {
  const PartyCheck({
    required this.caseId,
    required this.status,
    this.needsCorrection = false,
    this.requestedAt,
    this.completedAt,
  });

  final String caseId;
  final String status;
  final bool needsCorrection;
  final DateTime? requestedAt;
  final DateTime? completedAt;

  bool get verified => status == 'COMPLETE';

  factory PartyCheck.fromJson(Map<String, dynamic> json) => PartyCheck(
    caseId: json['caseId'] as String,
    status: json['status'] as String,
    needsCorrection: json['needsCorrection'] as bool? ?? false,
    requestedAt: DateTime.tryParse(json['requestedAt'] as String? ?? ''),
    completedAt: DateTime.tryParse(json['completedAt'] as String? ?? ''),
  );
}

class TenancyVerification {
  const TenancyVerification({this.landlord, this.tenant});

  final PartyCheck? landlord;
  final PartyCheck? tenant;

  bool get bothVerified => (landlord?.verified ?? false) && (tenant?.verified ?? false);

  static PartyCheck? _party(Object? json) =>
      json == null ? null : PartyCheck.fromJson((json as Map).cast<String, dynamic>());

  factory TenancyVerification.fromJson(Map<String, dynamic> json) =>
      TenancyVerification(landlord: _party(json['landlord']), tenant: _party(json['tenant']));
}
