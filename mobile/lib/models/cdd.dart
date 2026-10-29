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
  });

  final String id;
  final String status;
  final String clientRole;
  final String clientName;
  final String? property;
  final int openMatches;
  final bool screened;

  factory CddCaseSummary.fromJson(Map<String, dynamic> json) => CddCaseSummary(
    id: json['id'] as String,
    status: json['status'] as String,
    clientRole: json['clientRole'] as String,
    clientName: json['clientName'] as String,
    property: json['property'] as String?,
    openMatches: (json['openMatches'] as num?)?.toInt() ?? 0,
    screened: json['screened'] as bool? ?? false,
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
  });

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
        [
          (version as Map)['source'],
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
  });

  final String id;
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
    return CddCase(
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
