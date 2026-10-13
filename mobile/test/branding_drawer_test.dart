import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/screens/branding_drawer.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_components.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _FakeApi extends Api {
  _FakeApi() : super(attachAuth: false, cache: ReadCache());
  final calls = <String>[];
  Map<String, dynamic>? saved;

  @override
  Future<AgentBranding?> saveBranding(Map<String, dynamic> body) async {
    calls.add('save');
    saved = body;
    return AgentBranding(agencyName: body['agencyName'] as String);
  }

  @override
  Future<AgentBranding?> uploadBrandingLogo(Uint8List bytes) async {
    calls.add('logo');
    return null;
  }

  @override
  Future<AgentBranding?> removeBrandingLogo() async {
    calls.add('remove');
    return null;
  }
}

void main() {
  testWidgets('saves the agency in a drawer and needs a name to do it', (
    tester,
  ) async {
    final api = _FakeApi();
    AgentBranding? result;
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () async => result = await showKiviloDrawer(
                context: context,
                builder: (_) => BrandingDrawer(api: api),
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    expect(find.byType(BottomSheet), findsOneWidget);

    final save = find.widgetWithText(FilledButton, 'Save');
    expect(tester.widget<FilledButton>(save).onPressed, isNull);

    await tester.enterText(
      find.widgetWithText(TextField, 'Agency name'),
      'Harbourline Realty Pte Ltd',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Your CEA registration (optional)'),
      'R061234B',
    );
    await tester.pump();
    await tester.ensureVisible(save);
    await tester.tap(save);
    await tester.pumpAndSettle();

    expect(api.calls, ['save']);
    expect(api.saved, {
      'agencyName': 'Harbourline Realty Pte Ltd',
      'agencyLicence': '',
      'ceaRegistration': 'R061234B',
      'phone': '',
    });
    expect(result?.agencyName, 'Harbourline Realty Pte Ltd');
    expect(find.byType(BottomSheet), findsNothing);
  });
}
