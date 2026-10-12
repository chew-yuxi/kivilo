import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/screens/responsibility_card.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

Map<String, dynamic> proposalJson({
  String status = 'PENDING',
  String side = 'LANDLORD',
}) => {
  'id': 'proposal-1',
  'side': side,
  'proposedBy': {'id': 'agent-1', 'name': 'Avery Agent'},
  'arrangedBy': 'LANDLORD',
  'payer': 'SHARED',
  'tenantCap': '150',
  'basis': 'MINOR_REPAIR_CLAUSE',
  'reason': 'Minor repair under the agreement',
  'clauseRef': 'Clause 5(c)',
  'summary':
      'Tenant pays the first S\$150, landlord pays the rest. '
      'Landlord arranges the repair.',
  'status': status,
  'respondedBy': status == 'PENDING'
      ? null
      : {'id': 'tenant-1', 'name': 'Taylor Tenant'},
  'respondedAt': null,
  'responseNote': status == 'REJECTED' ? 'Crack was there at check-in' : null,
  'createdAt': '2026-10-12T10:00:00Z',
};

Responsibility responsibility({
  Map<String, dynamic>? pending,
  Map<String, dynamic>? agreement,
  List<Map<String, dynamic>> history = const [],
  Map<String, dynamic>? shares,
  bool canAnswer = false,
  bool canWithdraw = false,
}) => Responsibility.fromJson({
  'arrangedBy': 'LANDLORD',
  'minorRepairCap': '150',
  'agreement': agreement,
  'pending': pending,
  'history': history,
  'shares': shares,
  'canPropose': true,
  'canAnswer': canAnswer,
  'canWithdraw': canWithdraw,
});

void main() {
  test('the preview sentence matches the one the server sends', () {
    expect(
      describeProposal(
        arrangedBy: 'LANDLORD',
        payer: 'SHARED',
        tenantCap: '150',
      ),
      'Tenant pays the first S\$150, landlord pays the rest. '
      'Landlord arranges the repair.',
    );
    expect(
      describeProposal(arrangedBy: 'TENANT', payer: 'TENANT'),
      'Tenant pays. Tenant arranges the repair.',
    );
  });

  test('a rejection only shows while nothing has replaced it', () {
    final rejected = proposalJson(status: 'REJECTED');
    expect(
      responsibility(history: [rejected]).rejection?.responseNote,
      'Crack was there at check-in',
    );
    expect(
      responsibility(history: [rejected], pending: proposalJson()).rejection,
      isNull,
    );
  });

  Future<List<(String, String, String?)>> pumpCard(
    WidgetTester tester,
    Responsibility value, {
    String role = 'TENANT',
    List<Map<String, dynamic>>? proposed,
  }) async {
    final answers = <(String, String, String?)>[];
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: Scaffold(
          body: SingleChildScrollView(
            child: ResponsibilityCard(
              responsibility: value,
              role: role,
              busy: false,
              onPropose: (body) async => proposed?.add(body),
              onAnswer: (id, decision, note) async =>
                  answers.add((id, decision, note)),
            ),
          ),
        ),
      ),
    );
    return answers;
  }

  testWidgets('the answering side accepts through a confirmation drawer', (
    tester,
  ) async {
    final answers = await pumpCard(
      tester,
      responsibility(pending: proposalJson(), canAnswer: true),
    );
    expect(find.text('Your answer is needed'), findsOneWidget);
    expect(find.text('Landlord proposes'), findsOneWidget);
    expect(find.text('Minor repair clause · Clause 5(c)'), findsOneWidget);

    await tester.tap(find.text('Accept'));
    await tester.pumpAndSettle();
    expect(find.byType(BottomSheet), findsOneWidget);
    expect(find.byType(AlertDialog), findsNothing);
    expect(find.text('Accept this split?'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Accept').last);
    await tester.pumpAndSettle();
    expect(answers, [('proposal-1', 'ACCEPT', null)]);
  });

  testWidgets('rejecting requires a reason', (tester) async {
    final answers = await pumpCard(
      tester,
      responsibility(pending: proposalJson(), canAnswer: true),
    );
    await tester.tap(find.text('Reject'));
    await tester.pumpAndSettle();
    final reject = find.widgetWithText(FilledButton, 'Reject');
    expect(tester.widget<FilledButton>(reject).onPressed, isNull);

    await tester.enterText(find.byType(TextField), 'Crack was there');
    await tester.pump();
    await tester.tap(reject);
    await tester.pumpAndSettle();
    expect(answers, [('proposal-1', 'REJECT', 'Crack was there')]);
  });

  testWidgets('the proposing side can only wait or withdraw', (tester) async {
    final answers = await pumpCard(
      tester,
      responsibility(pending: proposalJson(), canWithdraw: true),
      role: 'AGENT',
    );
    expect(find.text('Waiting for the tenant'), findsOneWidget);
    expect(find.text('Accept'), findsNothing);
    await tester.tap(find.text('Withdraw proposal'));
    expect(answers, [('proposal-1', 'WITHDRAW', null)]);
  });

  testWidgets('an agreement shows each side\'s share of the recorded cost', (
    tester,
  ) async {
    await pumpCard(
      tester,
      responsibility(
        agreement: proposalJson(status: 'ACCEPTED'),
        shares: {'total': '420.00', 'tenant': '150.00', 'landlord': '270.00'},
      ),
    );
    expect(find.text('Agreed by both sides'), findsOneWidget);
    expect(
      find.text('Proposed by Avery Agent, accepted by Taylor Tenant'),
      findsOneWidget,
    );
    expect(find.text('S\$420.00'), findsOneWidget);
    expect(find.text('S\$150.00'), findsOneWidget);
    expect(find.text('S\$270.00'), findsOneWidget);
    expect(find.text('Propose a change'), findsOneWidget);
  });

  testWidgets('a proposal starts from the cap and sends only when complete', (
    tester,
  ) async {
    final proposed = <Map<String, dynamic>>[];
    await pumpCard(tester, responsibility(), proposed: proposed);
    await tester.tap(find.text('Propose who pays'));
    await tester.pumpAndSettle();

    expect(find.text('Propose who pays'), findsNWidgets(2));
    expect(find.text("From this tenancy's minor repair cap"), findsOneWidget);
    final send = find.widgetWithText(FilledButton, 'Send proposal');
    expect(tester.widget<FilledButton>(send).onPressed, isNull);

    await tester.enterText(
      find.widgetWithText(TextField, 'Explain in a sentence'),
      'Minor repair under the agreement',
    );
    await tester.pump();
    await tester.ensureVisible(send);
    await tester.tap(send);
    await tester.pumpAndSettle();
    expect(proposed, [
      {
        'arrangedBy': 'LANDLORD',
        'payer': 'SHARED',
        'tenantCap': '150',
        'basis': 'MINOR_REPAIR_CLAUSE',
        'reason': 'Minor repair under the agreement',
        'clauseRef': null,
      },
    ]);
  });
}
