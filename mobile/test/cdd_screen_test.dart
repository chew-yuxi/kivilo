import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/cdd.dart';
import 'package:kivilo/screens/cdd_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/report_pdf_file.dart';
import 'package:kivilo/ui/kivilo_components.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

const _questions = [
  {'key': 'pep', 'text': 'Is the client a politically exposed person?', 'help': null},
  {'key': 'cash', 'text': 'Will any deposit or rent be paid in cash?', 'help': null},
];

Map<String, dynamic> _case({
  String status = 'WAITING_FOR_CLIENT',
  bool submitted = false,
  String? decision,
  bool idSighted = false,
  String? risk,
  Map<String, String>? problem,
}) => {
  'particularsProblem': problem,
  'id': 'case-1',
  'reference': 'DD-1A2B3C4D',
  'riskQuestions': _questions,
  'riskAssessment': risk == null ? null : {'level': risk, 'answers': {'pep': false, 'cash': false}, 'assessedAt': '2026-10-31T03:00:00.000Z'},
  'completedAt': status == 'COMPLETE' ? '2026-10-31T03:05:00.000Z' : null,
  'contentHash': status == 'COMPLETE' ? 'ab12cd34ef56${'0' * 48}9f9f' : null,
  'status': status,
  'clientRole': 'TENANT',
  'client': {'id': 'client-1', 'name': 'Wei Ling', 'email': 'wei@example.com'},
  'particulars': submitted
      ? {
          'kind': 'INDIVIDUAL',
          'legalName': 'Tan Wei Ling',
          'idType': 'NRIC',
          'idNumber': '*****567A',
          'nationality': 'Singaporean',
          'dateOfBirth': '1990-04-02',
          'address': '8 Jalan Kayu #04-11',
          'pepDeclared': false,
          'pepDetails': null,
          'submittedInPerson': false,
          'submittedAt': '2026-10-30T06:14:00.000Z',
          'idSighted': idSighted,
        }
      : null,
  'screeningRuns': submitted
      ? [
          {
            'ranAt': '2026-10-29T02:00:00.000Z',
            'listVersions': [
              {'source': 'UN', 'publishedAt': '2026-10-28T00:00:00.000Z'},
              {'source': 'SG', 'publishedAt': '2026-08-26'},
            ],
            'candidates': [
              {
                'id': 'match-1',
                'source': 'UN',
                'reference': 'QDi.001',
                'matchedName': 'TAN WEI LING',
                'score': 0.93,
                'details': {
                  'names': ['TAN WEI LING', 'WEI LING TAN'],
                  'birthYears': [1961],
                  'nationalities': ['Indonesia'],
                },
                'decision': decision,
                'reason': decision == null ? null : 'Born 1961, different nationality',
              },
            ],
          },
        ]
      : [],
};

class _Api extends Api {
  _Api(this.json) : super(attachAuth: false);

  Map<String, dynamic> json;
  final started = <Map<String, Object?>>[];
  final decisions = <({String id, bool confirmed, String reason})>[];
  final inPerson = <Map<String, dynamic>>[];

  @override
  Future<List<CddCaseSummary>> cddCases() async => [
    CddCaseSummary.fromJson({
      'id': 'case-1',
      'status': json['status'],
      'clientRole': 'TENANT',
      'clientName': 'Wei Ling',
      'property': '8 Jalan Kayu #04-11',
      'openMatches': 0,
      'screened': false,
    }),
  ];

  @override
  Future<CddCase> cddCase(String id) async => CddCase.fromJson(json);

  @override
  Future<String> startDeal({required String clientName, String? clientEmail, required String clientRole}) async {
    started.add({'name': clientName, 'email': clientEmail, 'role': clientRole});
    return 'case-1';
  }

  @override
  Future<void> decideMatch(String matchId, {required bool confirmed, required String reason}) async {
    decisions.add((id: matchId, confirmed: confirmed, reason: reason));
    json = _case(status: confirmed ? 'ESCALATED' : 'NEEDS_REVIEW', submitted: true, decision: confirmed ? 'CONFIRMED_MATCH' : 'NOT_A_MATCH');
  }

  final risks = <Map<String, bool>>[];
  int records = 0;

  @override
  Future<String> cddRecord(String id) async {
    records++;
    return 'https://storage.example/record.pdf';
  }

  final corrections = <String?>[];
  int emailed = 0;

  @override
  Future<void> requestCorrection(String id, {String? reason}) async {
    corrections.add(reason);
    json = _case();
  }

  @override
  Future<({String url, bool emailed})> requestParticulars(String id) async {
    emailed++;
    return (url: 'https://my.kivilo.app/cdd/case-1', emailed: true);
  }

  int completions = 0;

  @override
  Future<void> confirmIdSighted(String id) async {
    json = _case(status: 'NEEDS_REVIEW', submitted: true, decision: 'NOT_A_MATCH', idSighted: true);
  }

  @override
  Future<void> assessRisk(String id, Map<String, bool> answers, {String? sourceOfFunds}) async {
    risks.add(answers);
    json = _case(status: 'NEEDS_REVIEW', submitted: true, decision: 'NOT_A_MATCH', idSighted: true, risk: 'STANDARD');
  }

  @override
  Future<void> completeCase(String id) async {
    completions++;
    json = _case(status: 'COMPLETE', submitted: true, decision: 'NOT_A_MATCH', idSighted: true, risk: 'STANDARD');
  }

  @override
  Future<void> submitParticularsInPerson(String id, Map<String, dynamic> particulars) async {
    inPerson.add(particulars);
    json = _case(status: 'NEEDS_REVIEW', submitted: true);
  }
}

Future<void> _show(WidgetTester tester, Widget screen) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(400, 900);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(theme: buildKiviloTheme(), home: screen));
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, Finder target) async {
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  await tester.tap(target);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('starting a deal records the client and opens their case', (tester) async {
    final api = _Api(_case());
    await _show(tester, CddListScreen(api: api));
    expect(find.text('Waiting for client'), findsOneWidget);

    await _tap(tester, find.text('Start a deal'));
    await tester.tap(find.text('Tenant').last);
    await tester.enterText(find.widgetWithText(TextField, 'Client’s name'), ' Wei Ling ');
    await tester.enterText(find.widgetWithText(TextField, 'Client’s email'), 'wei@example.com');
    await _tap(tester, find.widgetWithText(FilledButton, 'Start'));

    expect(api.started.single, {'name': 'Wei Ling', 'email': 'wei@example.com', 'role': 'TENANT'});
    expect(find.byType(CddCaseScreen), findsOneWidget);
    expect(find.text('Email the form'), findsOneWidget);
    expect(find.text('Share the link'), findsOneWidget);
    expect(find.text('Fill in together'), findsOneWidget);
  });

  testWidgets('a match needs a decision and a reason, and a confirmed one escalates', (tester) async {
    final api = _Api(_case(status: 'NEEDS_REVIEW', submitted: true));
    await _show(tester, CddCaseScreen(id: 'case-1', api: api));
    expect(find.text('1 possible match to decide'), findsOneWidget);
    expect(find.text('Born 1961 · Indonesia'), findsOneWidget);

    await _tap(tester, find.widgetWithText(FilledButton, 'Decide'));
    final record = find.widgetWithText(FilledButton, 'Record');
    expect(tester.widget<FilledButton>(record).onPressed, isNull);
    expect(find.text('Your client'), findsOneWidget);
    expect(find.text('Born 2 Apr 1990'), findsOneWidget);
    expect(find.text('UN list'), findsOneWidget);
    await tester.tap(find.text('Yes'));
    await tester.pump();
    expect(find.textContaining('This stops the deal'), findsOneWidget);
    expect(tester.widget<FilledButton>(record).onPressed, isNull, reason: 'a reason is required');
    await tester.enterText(find.widgetWithText(TextField, 'Reason'), 'Same name and passport photo');
    await _tap(tester, record);

    expect(api.decisions.single, (id: 'match-1', confirmed: true, reason: 'Same name and passport photo'));
    await tester.drag(find.byType(Scrollable).first, const Offset(0, 2000));
    await tester.pumpAndSettle();
    expect(find.textContaining('do not tell them'), findsOneWidget);
    expect(find.text('Confirmed match'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Decide'), findsNothing);
    expect(find.text('CONFIRMED MATCH'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('*****567A'), 200, scrollable: find.byType(Scrollable).first);
  });

  testWidgets('particulars taken in person are sent with the date of birth', (tester) async {
    final api = _Api(_case());
    await _show(tester, CddCaseScreen(id: 'case-1', api: api));
    await _tap(tester, find.text('Fill in together'));

    expect(find.widgetWithText(TextField, 'Full name, as on the ID'), findsOneWidget);
    final save = find.widgetWithText(FilledButton, 'Save particulars');
    await tester.scrollUntilVisible(save, 200, scrollable: find.byType(Scrollable).first);
    expect(tester.widget<FilledButton>(save).onPressed, isNull, reason: 'the original ID must be in front of the agent');
    await _tap(tester, find.textContaining('original ID is in front of me'));
    await _tap(tester, save);
    expect(find.text('Enter the date of birth as it appears on the ID'), findsWidgets);
    await tester.enterText(find.widgetWithText(TextField, 'ID number'), 's1234567a');
    await tester.pump();
    expect(find.text('This NRIC number is not valid. Check it against the card'), findsOneWidget);
    expect(api.inPerson, isEmpty);

    await tester.enterText(find.widgetWithText(TextField, 'Full name, as on the ID'), 'Tan Wei Ling');
    await tester.enterText(find.widgetWithText(TextField, 'ID number'), 's1234567d');
    await tester.pump();
    expect(find.byIcon(Icons.check_rounded), findsOneWidget);
    await _tap(tester, find.widgetWithText(TextField, 'Date of birth'));
    await tester.tap(find.byIcon(Icons.edit_outlined));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '04/02/1990');
    await _tap(tester, find.text('OK'));
    await _tap(tester, find.widgetWithText(TextField, 'Nationality'));
    await tester.enterText(find.widgetWithText(TextField, 'Search countries'), 'singa');
    await tester.pumpAndSettle();
    await _tap(tester, find.text('Singapore'));
    await tester.enterText(find.widgetWithText(TextField, 'Residential address'), 'Jalan Kayu');
    await _tap(tester, find.text('Save particulars'));
    expect(find.textContaining('Enter the full residential address'), findsWidgets);
    expect(api.inPerson, isEmpty);
    await tester.enterText(find.widgetWithText(TextField, 'Residential address'), '8 Jalan Kayu #04-11');
    await _tap(tester, find.text('Save particulars'));

    expect(api.inPerson.single, {
      'legalName': 'Tan Wei Ling',
      'idType': 'NRIC',
      'idNumber': 'S1234567D',
      'nationality': 'Singapore',
      'dateOfBirth': '1990-04-02',
      'address': '8 Jalan Kayu #04-11',
      'pepDeclared': false,
      'pepDetails': null,
    });
    expect(find.byType(CddCaseScreen), findsOneWidget);
    expect(find.text('Sent by the client · 30 Oct 2026, 2:14 pm'), findsOneWidget);
  });

  testWidgets('the agent checks the ID, assesses the risk and completes a locked record', (tester) async {
    final api = _Api(_case(status: 'NEEDS_REVIEW', submitted: true, decision: 'NOT_A_MATCH'));
    await _show(tester, CddCaseScreen(id: 'case-1', api: api));
    expect(find.text('2 of 5 steps done'), findsOneWidget);
    expect(find.text('1 possible match ruled out · UN 2026-10-28, SG 2026-08-26'), findsOneWidget);
    expect(find.text('Assess risk'), findsNothing, reason: 'the ID check comes first');

    await _tap(tester, find.text('I’ve seen the original ID'));
    expect(find.text('ends 567A'), findsOneWidget);
    await _tap(tester, find.text('It matches'));
    await _tap(tester, find.text('Assess risk'));
    expect(find.byType(CddRiskScreen), findsOneWidget);
    final save = find.widgetWithText(FilledButton, 'Save assessment');
    expect(tester.widget<FilledButton>(save).onPressed, isNull, reason: 'every question needs an answer');
    for (final no in find.text('No').evaluate().toList()) {
      await tester.tap(find.byWidget(no.widget));
    }
    await tester.pumpAndSettle();
    expect(find.text('Standard risk'), findsOneWidget);
    await _tap(tester, save);
    expect(api.risks.single, {'pep': false, 'cash': false});

    expect(find.text('Standard risk'), findsOneWidget);
    await _tap(tester, find.text('Complete due diligence'));
    await _tap(tester, find.widgetWithText(FilledButton, 'Complete'));
    expect(api.completions, 1);
    expect(find.text('Due diligence complete'), findsOneWidget);
    expect(find.text('ab12cd34…9f9f'), findsOneWidget);
    expect(find.text('DD-1A2B3C4D'), findsOneWidget);

    await _tap(tester, find.text('Done'));
    expect(find.text('View record'), findsOneWidget);
    await tester.drag(find.byType(Scrollable).first, const Offset(0, 2000));
    await tester.pumpAndSettle();
    expect(find.text('All 5 steps done'), findsOneWidget);
    expect(find.text('Complete due diligence'), findsNothing);
  });

  testWidgets('particulars that fail a newer rule are sent back to the client to correct', (tester) async {
    final api = _Api(_case(status: 'NEEDS_REVIEW', submitted: true, decision: 'NOT_A_MATCH', problem: {
      'field': 'nationality',
      'message': 'Choose the nationality from the list',
    }));
    await _show(tester, CddCaseScreen(id: 'case-1', api: api));
    expect(find.text('Needs correcting: Choose the nationality from the list'), findsOneWidget);
    expect(find.text('I’ve seen the original ID'), findsNothing, reason: 'nothing after the particulars can be relied on');
    expect(find.text('0 of 5 steps done'), findsOneWidget);

    await _tap(tester, find.text('Ask for corrected details'));
    await _tap(tester, find.text('Ask again'));
    expect(api.corrections, [null], reason: 'the rule is the reason');
    expect(api.emailed, 1);
    expect(find.textContaining('Waiting for Wei Ling'), findsOneWidget);
  });

  testWidgets('an agent sends back particulars that do not match the original ID, with a reason', (tester) async {
    final api = _Api(_case(status: 'NEEDS_REVIEW', submitted: true, decision: 'NOT_A_MATCH'));
    await _show(tester, CddCaseScreen(id: 'case-1', api: api));
    await _tap(tester, find.text('I’ve seen the original ID'));
    await _tap(tester, find.text('It doesn’t match the ID'));
    await tester.enterText(find.widgetWithText(TextField, 'Reason'), 'Date of birth on the card is 1991');
    await _tap(tester, find.widgetWithText(FilledButton, 'Continue'));
    await _tap(tester, find.text('Ask again'));
    expect(api.corrections, ['Date of birth on the card is 1991']);
    expect(api.emailed, 1);
  });

  testWidgets('a politically exposed person is shown as one, and confirming them raises the risk', (tester) async {
    final json = _case(status: 'NEEDS_REVIEW', submitted: true, idSighted: true);
    final run = (json['screeningRuns'] as List).first as Map<String, dynamic>;
    run['candidates'] = [
      {
        'id': 'pep-1',
        'source': 'PEP',
        'reference': 'Dilisense abc',
        'matchedName': 'Tan Wei Ling',
        'score': 0.98,
        'details': {'names': ['Tan Wei Ling'], 'birthYears': [1990], 'nationalities': ['SG'], 'positions': ['Member of Parliament']},
        'decision': null,
        'reason': null,
      },
    ];
    final api = _Api(json);
    await _show(tester, CddCaseScreen(id: 'case-1', api: api));
    expect(find.text('Sanctions and PEP screening'), findsOneWidget);
    expect(find.text('POSSIBLE PEP · 98%'), findsOneWidget);
    expect(find.text('Member of Parliament'), findsOneWidget);
    await _tap(tester, find.widgetWithText(FilledButton, 'Decide'));
    expect(find.text('PEP record'), findsOneWidget);
    await tester.tap(find.text('Yes'));
    await tester.pump();
    expect(find.textContaining('The client is then higher risk'), findsOneWidget);
    expect(find.textContaining('This stops the deal'), findsNothing);

    (run['candidates'] as List).first['decision'] = 'CONFIRMED_MATCH';
    await tester.pumpWidget(MaterialApp(theme: buildKiviloTheme(), home: CddRiskScreen(item: CddCase.fromJson(json), api: api)));
    await tester.pumpAndSettle();
    final pepAnswer = tester.widgetList<KiviloSegmentedControl<bool>>(find.byType(KiviloSegmentedControl<bool>)).first;
    expect(pepAnswer.value, isTrue, reason: 'a confirmed PEP answers the PEP question');
  });

  testWidgets('a completed case downloads its record for CEA', (tester) async {
    final api = _Api(_case(status: 'COMPLETE', submitted: true, decision: 'NOT_A_MATCH', idSighted: true, risk: 'STANDARD'));
    final pdf = _PdfFile(File('${Directory.systemTemp.path}/record.pdf'));
    await _show(tester, CddCompletedScreen(item: CddCase.fromJson(api.json), api: api, pdf: pdf));
    await _tap(tester, find.text('Download record for CEA'));
    expect(api.records, 1);
    expect(pdf.requested, ('https://storage.example/record.pdf', 'Kivilo due diligence DD-1A2B3C4D'));
  });
}

class _PdfFile extends ReportPdfFile {
  _PdfFile(this.file);
  final File file;
  (String, String)? requested;

  @override
  Future<File> download(String url, String name) async {
    requested = (url, name);
    return file;
  }
}
