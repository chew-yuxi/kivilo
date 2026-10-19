import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/report.dart';
import 'package:kivilo/screens/report_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

import 'report_test.dart' show reportJson;

Map<String, dynamic> _checkOut({
  String? answerAs,
  List<Map<String, dynamic>> answerInPerson = const [],
  String? tenantAnswer,
  String? landlordAnswer,
}) => {
  ...reportJson(status: 'COMPLETED'),
  'kind': 'CHECK_OUT',
  'assessment': {
    'version': 2,
    'publishedAt': '2026-10-19T02:00:00.000Z',
    'summary': null,
    'findings': [
      {
        'id': 'finding-1',
        'itemLabel': 'Kitchen, Worktop',
        'verdict': 'TENANT_LIABLE',
        'estimatedCost': '450',
        'rationale': 'Burn mark',
        'maintenanceTitle': null,
        'evidence': <dynamic>[],
      },
    ],
    'statement': {
      'deposit': 14400,
      'deductions': 450,
      'toReturn': 13950,
      'deductedCount': 1,
      'responses': [
        {
          'name': 'Tan Wei Ming',
          'role': 'LANDLORD',
          'answer': landlordAnswer,
          'reason': null,
          'inPerson': landlordAnswer != null,
          'respondedAt': landlordAnswer == null
              ? null
              : '2026-10-19T03:00:00.000Z',
        },
        {
          'name': 'Priya Raman',
          'role': 'TENANT',
          'answer': tenantAnswer,
          'reason': tenantAnswer == 'DISPUTED' ? 'It was there before' : null,
          'inPerson': false,
          'respondedAt': tenantAnswer == null
              ? null
              : '2026-10-19T03:00:00.000Z',
        },
      ],
      'answerAs': answerAs,
      'answerInPerson': answerInPerson,
    },
  },
};

class _FakeApi extends Api {
  _FakeApi(this.agent) : super(attachAuth: false, cache: ReadCache());
  final bool agent;
  final answers = <String>[];

  @override
  Future<SignedReport> report(String inspectionId) async {
    if (agent) {
      return SignedReport.fromJson(
        _checkOut(
          landlordAnswer: answers.isEmpty ? null : 'AGREED',
          answerInPerson: answers.isEmpty
              ? [
                  {
                    'stakeholderId': 'landlord-1',
                    'name': 'Tan Wei Ming',
                    'role': 'LANDLORD',
                  },
                ]
              : const [],
        ),
      );
    }
    return SignedReport.fromJson(
      _checkOut(
        answerAs: answers.isEmpty ? 'TENANT' : null,
        tenantAnswer: answers.isEmpty ? null : 'DISPUTED',
      ),
    );
  }

  @override
  Future<void> answerDepositStatement(
    String inspectionId, {
    required int version,
    required bool agreed,
    String? reason,
    String? stakeholderId,
  }) async => answers.add(
    '$version ${agreed ? 'AGREED' : 'DISPUTED'} ${reason ?? '-'} ${stakeholderId ?? 'own'}',
  );
}

Future<void> _open(WidgetTester tester, Api api) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: ReportScreen(id: 'inspection-1', api: api),
    ),
  );
  await tester.pumpAndSettle();
  await tester.scrollUntilVisible(
    find.text('Deposit statement'),
    300,
    scrollable: find.byType(Scrollable).first,
  );
}

void main() {
  test('a report from a server without deposit statements still parses', () {
    final report = SignedReport.fromJson({
      ...reportJson(status: 'COMPLETED'),
      'assessment': {
        'version': 1,
        'publishedAt': '2026-10-19T02:00:00.000Z',
        'summary': null,
        'findings': <dynamic>[],
      },
    });
    expect(report.assessment!.statement, isNull);
  });

  testWidgets('the tenant disputes the deductions with a reason', (
    tester,
  ) async {
    final api = _FakeApi(false);
    await _open(tester, api);
    expect(find.text('S\$14400.00'), findsOneWidget);
    expect(find.text('S\$13950.00'), findsOneWidget);
    expect(find.text('Priya Raman (tenant): not answered yet'), findsOneWidget);

    final dispute = find.widgetWithText(OutlinedButton, 'Dispute');
    await tester.ensureVisible(dispute);
    await tester.pumpAndSettle();
    await tester.tap(dispute);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'It was there before');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Record dispute'));
    await tester.pumpAndSettle();

    expect(api.answers, ['2 DISPUTED It was there before own']);
    expect(find.text('I agree to the deductions'), findsNothing);
    expect(
      find.textContaining('Priya Raman (tenant): disputed'),
      findsOneWidget,
    );
  });

  testWidgets('the agent records the landlord agreeing in person', (
    tester,
  ) async {
    final api = _FakeApi(true);
    await _open(tester, api);
    expect(find.text('I agree to the deductions'), findsNothing);

    final agrees = find.text('Agrees');
    await tester.ensureVisible(agrees);
    await tester.pumpAndSettle();
    await tester.tap(agrees);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Agree to the deductions'));
    await tester.pumpAndSettle();

    expect(api.answers, ['2 AGREED - landlord-1']);
    expect(find.text('Agrees'), findsNothing);
    expect(
      find.textContaining('Tan Wei Ming (landlord): agreed in person'),
      findsOneWidget,
    );
  });
}
