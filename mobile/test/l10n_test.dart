import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/l10n/l10n.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/services/api_failure.dart';
import 'package:kivilo/ui/kivilo_components.dart';
import 'package:kivilo/ui/kivilo_format.dart';

Map<String, dynamic> _arb(String code) =>
    jsonDecode(File('lib/l10n/app_$code.arb').readAsStringSync())
        as Map<String, dynamic>;

Set<String> _messages(Map<String, dynamic> arb) =>
    arb.keys.where((key) => !key.startsWith('@')).toSet();

void main() {
  tearDown(() {
    AppLanguage.choice.value = null;
    AppLanguage.resolve(const [Locale('en')]);
  });

  test('follows the first phone language the app speaks', () {
    expect(
      AppLanguage.resolve(const [Locale('ja'), Locale('zh', 'SG')]),
      const Locale('zh'),
    );
    expect(t.landlord, '房东');
    expect(AppLanguage.resolve(const [Locale('th', 'TH')]), const Locale('th'));
    expect(t.landlord, 'ผู้ให้เช่า');
    expect(AppLanguage.resolve(const [Locale('ja')]), const Locale('en'));
    expect(t.landlord, 'Landlord');
  });

  test('a chosen language overrides the phone', () {
    AppLanguage.choice.value = 'th';
    expect(AppLanguage.resolve(const [Locale('zh')]), const Locale('th'));
    expect(t.tenant, 'ผู้เช่า');
  });

  test('every message is translated, with the same placeholders', () {
    final en = _arb('en');
    for (final code in ['zh', 'th']) {
      final translated = _arb(code);
      expect(_messages(translated), _messages(en), reason: code);
      for (final key in _messages(en)) {
        final placeholders =
            ((en['@$key'] as Map<String, dynamic>?)?['placeholders']
                    as Map<String, dynamic>?)
                ?.keys ??
            const <String>[];
        for (final name in placeholders) {
          expect(
            RegExp('\\{$name[},]').hasMatch(translated[key] as String),
            isTrue,
            reason: '$code $key is missing {$name}',
          );
        }
      }
    }
  });

  test('dates follow the chosen language', () {
    expect(shortDate('2026-10-12T04:00:00Z'), '12 Oct 2026');
    AppLanguage.resolve(const [Locale('zh')]);
    expect(shortDate('2026-10-12T04:00:00Z'), '2026年10月12日');
    expect(monthYear('2026-10-12T04:00:00Z'), '2026年10月');
  });

  testWidgets('status labels render in the chosen language', (tester) async {
    AppLanguage.resolve(const [Locale('th')]);
    await tester.pumpWidget(
      const MaterialApp(home: KiviloStatusPill(status: 'AWAITING_SIGNATURE')),
    );
    expect(find.text('รอลายเซ็น'), findsOneWidget);
  });

  test('team refusals the server explains in English are translated', () {
    ApiFailure refusal(String message) => ApiFailure.fromDio(
      DioException(
        requestOptions: RequestOptions(),
        response: Response(
          requestOptions: RequestOptions(),
          statusCode: 409,
          data: {'error': 'agency_conflict', 'message': message},
        ),
      ),
    );
    AppLanguage.resolve(const [Locale('zh')]);
    expect(refusal('Choose a responsible lead agent.').message, '请选择负责中介。');
    // A sentence the app has not learned yet is still shown, as the server wrote it.
    expect(refusal('Something new.').message, 'Something new.');
  });

  test('cost terms are described in the chosen language', () {
    AppLanguage.resolve(const [Locale('th')]);
    expect(
      describeProposal(arrangedBy: 'LANDLORD', payer: 'TENANT'),
      'ผู้เช่าจ่าย ผู้ให้เช่าเป็นผู้จัดการซ่อม',
    );
  });
}
