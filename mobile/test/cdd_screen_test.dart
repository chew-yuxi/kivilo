import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/cdd.dart';
import 'package:kivilo/screens/cdd_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

Map<String, dynamic> _case({String status = 'WAITING_FOR_CLIENT', bool submitted = false, String? decision}) => {
  'id': 'case-1',
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
          'idSighted': false,
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
    expect(find.text('*****567A'), findsOneWidget);
    expect(find.text('Born 1961 · Indonesia'), findsOneWidget);
    expect(find.text('Checked 29 Oct 2026 against UN 2026-10-28, SG 2026-08-26.'), findsOneWidget);

    await _tap(tester, find.widgetWithText(FilledButton, 'Decide'));
    final record = find.widgetWithText(FilledButton, 'Record');
    expect(tester.widget<FilledButton>(record).onPressed, isNull);
    await tester.tap(find.text('Yes'));
    await tester.pump();
    expect(tester.widget<FilledButton>(record).onPressed, isNull, reason: 'a reason is required');
    await tester.enterText(find.widgetWithText(TextField, 'Reason'), 'Same name and passport photo');
    await _tap(tester, record);

    expect(api.decisions.single, (id: 'match-1', confirmed: true, reason: 'Same name and passport photo'));
    expect(find.textContaining('do not tell them'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Decide'), findsNothing);
    expect(find.text('CONFIRMED MATCH'), findsOneWidget);
  });

  testWidgets('particulars taken in person are sent with the date of birth', (tester) async {
    final api = _Api(_case());
    await _show(tester, CddCaseScreen(id: 'case-1', api: api));
    await _tap(tester, find.text('Fill in together'));

    expect(find.widgetWithText(TextField, 'Full name, as on the ID'), findsOneWidget);
    await _tap(tester, find.text('Save particulars'));
    expect(find.text('Enter the date of birth as it appears on the ID'), findsOneWidget);
    expect(api.inPerson, isEmpty);

    await tester.enterText(find.widgetWithText(TextField, 'Full name, as on the ID'), 'Tan Wei Ling');
    await tester.enterText(find.widgetWithText(TextField, 'ID number'), 's1234567a');
    await tester.enterText(find.widgetWithText(TextField, 'Nationality'), 'Singaporean');
    await tester.enterText(find.widgetWithText(TextField, 'Residential address'), '8 Jalan Kayu #04-11');
    await _tap(tester, find.widgetWithText(TextField, 'Date of birth'));
    await tester.tap(find.byIcon(Icons.edit_outlined));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '04/02/1990');
    await _tap(tester, find.text('OK'));
    await _tap(tester, find.text('Save particulars'));

    expect(api.inPerson.single, {
      'legalName': 'Tan Wei Ling',
      'idType': 'NRIC',
      'idNumber': 's1234567a',
      'nationality': 'Singaporean',
      'dateOfBirth': '1990-04-02',
      'address': '8 Jalan Kayu #04-11',
      'pepDeclared': false,
      'pepDetails': null,
    });
    expect(find.byType(CddCaseScreen), findsOneWidget);
    expect(find.text('Particulars'), findsOneWidget);
  });
}
