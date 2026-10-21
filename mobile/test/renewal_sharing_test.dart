import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/renewal_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _FakeApi extends Api {
  _FakeApi({this.collaborators = true}) : super(attachAuth: false);

  final bool collaborators;
  final requests = <Map<String, dynamic>>[];
  ApiFailure? failure;
  Completer<void>? saving;

  @override
  Future<Map<String, dynamic>> renewal(String tenancyId) async => {
    'id': tenancyId,
    'property': '12 Green Road',
    'tenant': 'Tenant',
    'endDate': '2026-11-01',
    'monthlyRent': '3000',
    'deposit': '6000',
    if (collaborators)
      'collaborators': [
        {
          'stakeholderId': 'nimin',
          'name': 'Nimin',
          'email': 'nimin@example.test',
        },
      ],
  };

  @override
  Future<String> createRenewal(
    String tenancyId,
    Map<String, dynamic> data,
  ) async {
    expect(tenancyId, 'tenancy-1');
    requests.add(data);
    if (saving != null) await saving!.future;
    if (failure != null) throw failure!;
    return 'new-inspection';
  }
}

void main() {
  Future<void> open(WidgetTester tester, _FakeApi api) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 1000);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (_) =>
                      RenewalScreen(tenancyId: 'tenancy-1', api: api),
                ),
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
  }

  for (final collaborators in [false, true]) {
    testWidgets(
      'renewal is private by default with existing collaborators: $collaborators',
      (tester) async {
        final api = _FakeApi(collaborators: collaborators);
        await open(tester, api);
        if (collaborators) {
          expect(
            find.text('Keep sharing this renewal with Nimin'),
            findsOneWidget,
          );
          expect(
            tester
                .widget<CheckboxListTile>(find.byType(CheckboxListTile))
                .value,
            isFalse,
          );
        } else {
          expect(find.byType(CheckboxListTile), findsNothing);
        }
        await tester.ensureVisible(find.text('Create renewal check-in'));
        await tester.tap(find.text('Create renewal check-in'));
        await tester.pumpAndSettle();
        expect(api.requests.single['keepCollaborators'], isFalse);
        expect(find.byType(RenewalScreen), findsNothing);
      },
    );
  }

  testWidgets(
    'renewal keeps sharing only after explicit selection and retains that choice on failure',
    (tester) async {
      final api = _FakeApi()..failure = ApiFailure.noConnection;
      await open(tester, api);
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pump();
      await tester.ensureVisible(find.text('Create renewal check-in'));
      await tester.tap(find.text('Create renewal check-in'));
      await tester.pumpAndSettle();
      expect(api.requests.single['keepCollaborators'], isTrue);
      expect(
        tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
        isTrue,
      );
      expect(find.text(ApiFailure.noConnection.message), findsOneWidget);

      api.failure = null;
      api.saving = Completer<void>();
      final submit = tester
          .widget<FilledButton>(
            find.widgetWithText(FilledButton, 'Create renewal check-in'),
          )
          .onPressed!;
      submit();
      submit();
      await tester.pump();
      expect(api.requests.length, 2);
      expect(
        tester
            .widget<CheckboxListTile>(find.byType(CheckboxListTile))
            .onChanged,
        isNull,
      );
      expect(
        tester.widget<TextFormField>(find.byType(TextFormField).first).enabled,
        isFalse,
      );
      api.saving!.complete();
      await tester.pumpAndSettle();
      expect(api.requests.last['keepCollaborators'], isTrue);
      expect(find.byType(RenewalScreen), findsNothing);
    },
  );
}
