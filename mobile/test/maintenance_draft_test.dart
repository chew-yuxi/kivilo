import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/new_maintenance_case_screen.dart';
import 'package:kivilo/services/read_cache.dart';

class _SlowCache extends ReadCache {
  final firstWrite = Completer<void>();
  final writes = <Map<String, dynamic>>[];

  @override
  Future<Object?> read(String key) async => null;

  @override
  Future<bool> write(String key, Object? value) async {
    writes.add(Map<String, dynamic>.from(value as Map));
    if (writes.length == 1) await firstWrite.future;
    return true;
  }
}

void main() {
  testWidgets('slow old draft cannot overwrite the latest typed text', (
    tester,
  ) async {
    final cache = _SlowCache();
    await tester.pumpWidget(
      MaterialApp(
        home: NewMaintenanceCaseScreen(
          tenancyId: 'tenancy-1',
          assets: const [],
          cache: cache,
        ),
      ),
    );

    final title = find.widgetWithText(TextField, 'Short title');
    await tester.enterText(title, 'Leaking');
    await tester.enterText(title, 'Leaking tap');
    expect(cache.writes, hasLength(1));

    cache.firstWrite.complete();
    await tester.pumpAndSettle();
    expect(cache.writes, hasLength(2));
    expect(cache.writes.last['title'], 'Leaking tap');
  });
}
