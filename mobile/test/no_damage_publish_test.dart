import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/inspection_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _FakeApi extends Api {
  _FakeApi() : super(attachAuth: false, cache: ReadCache());
  final published = <bool>[];

  @override
  Future<InspectionDetail> inspection(String id) async =>
      InspectionDetail.fromJson({
        'id': id,
        'tenancyRecordId': 'tenancy-1',
        'kind': 'CHECK_OUT',
        'status': 'COMPLETED',
        'property': '2 Marina Boulevard',
        'landlord': 'Lena Landlord',
        'landlordId': 'landlord-1',
        'tenant': 'Taylor Tenant',
        'tenantId': 'tenant-1',
        'summary': null,
        'baselineId': 'check-in-1',
        'checkOutId': null,
        'shareToken': null,
        'shareUrl': null,
        'checkOutItems': <Map<String, dynamic>>[],
        'checkInItems': <Map<String, dynamic>>[],
        'latestAssessment': null,
        'assessmentDraftChanged': true,
        'signatures': [
          {'stakeholderId': 'landlord-1', 'signedAt': '2026-10-12T08:00:00Z'},
          {'stakeholderId': 'tenant-1', 'signedAt': '2026-10-12T08:05:00Z'},
        ],
        'findings': <Map<String, dynamic>>[],
        'rooms': <Map<String, dynamic>>[],
        'maintenanceHistory': <Map<String, dynamic>>[],
      });

  @override
  Future<void> publishFindings(
    String inspectionId, {
    bool noFindings = false,
  }) async => published.add(noFindings);
}

Future<void> _settleIo(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 35)));
    await tester.pump(const Duration(milliseconds: 100));
  }
  await tester.pumpAndSettle();
}

void main() {
  late Directory root;
  setUp(() async {
    root = await Directory.systemTemp.createTemp('kivilo-finding-publish-');
  });
  tearDown(() async {
    await root.delete(recursive: true);
  });
  testWidgets(
    'publishing with no findings is an explicit no-damage statement',
    (tester) async {
      final api = _FakeApi();
      final queue = CaptureQueue(NativeDatabase.memory());
      addTearDown(queue.close);
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: InspectionScreen(
            id: 'check-out-1',
            api: api,
            evidenceQueue: queue,
            ownerId: 'account-a',
            supportDirectory: root,
          ),
        ),
      );
      await tester.pumpAndSettle();

      final publish = find.text('Publish: no damage found');
      await tester.scrollUntilVisible(publish, 300);
      await tester.ensureVisible(publish);
      await tester.pumpAndSettle();
      await tester.tap(publish);
      await tester.pumpAndSettle();

      expect(find.byType(BottomSheet), findsOneWidget);
      expect(find.text('Publish: no damage found?'), findsOneWidget);
      expect(find.textContaining('found no damage'), findsOneWidget);
      await tester.runAsync(() => tester.tap(find.text('Publish no damage')));
      await _settleIo(tester);
      expect(api.published, [true]);
    },
  );

  testWidgets('pending finding photos prevent assessment publication', (
    tester,
  ) async {
    final api = _FakeApi();
    final queue = CaptureQueue(NativeDatabase.memory());
    addTearDown(queue.close);
    await queue.enqueue(
      PendingCapturesCompanion.insert(
        ownerId: const Value('account-a'),
        inspectionId: 'finding:check-out-1',
        roomId: 'finding-1',
        kind: 'PHOTO',
        relativePath: 'captures/photo.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 10,
        awaitingMarkup: const Value(true),
        createdAt: DateTime.now(),
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: InspectionScreen(
          id: 'check-out-1',
          api: api,
          evidenceQueue: queue,
          ownerId: 'account-a',
          supportDirectory: root,
        ),
      ),
    );
    await tester.pumpAndSettle();
    final publish = find.text('Publish: no damage found');
    await tester.scrollUntilVisible(publish, 300);
    await tester.ensureVisible(publish);
    await tester.pumpAndSettle();
    await tester.tap(publish);
    await tester.pumpAndSettle();
    await tester.runAsync(() => tester.tap(find.text('Publish no damage')));
    await _settleIo(tester);
    expect(api.published, isEmpty);
    expect(
      (await queue.pendingForInspection(
        'finding:check-out-1',
        'account-a',
      )).captures,
      1,
    );
  });

  testWidgets('a picker interrupted before enqueue prevents publication', (
    tester,
  ) async {
    final api = _FakeApi();
    final queue = CaptureQueue(NativeDatabase.memory());
    addTearDown(queue.close);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: InspectionScreen(
          id: 'check-out-1',
          api: api,
          evidenceQueue: queue,
          ownerId: 'account-a',
          supportDirectory: root,
        ),
      ),
    );
    await tester.pumpAndSettle();
    final publish = find.text('Publish: no damage found');
    await tester.scrollUntilVisible(publish, 300);
    await tester.ensureVisible(publish);
    await tester.pumpAndSettle();
    await tester.tap(publish);
    await tester.pumpAndSettle();
    // The picker intent can outlive its route without ever reaching SQLite.
    await tester.runAsync(
      () => File('${root.path}/capture-picker.json').writeAsString(
        jsonEncode({
          'flow': 'evidence',
          'ownerId': 'account-a',
          'inspectionId': 'finding:check-out-1',
          'roomId': 'finding-1',
          'kind': 'PHOTO',
          'video': false,
        }),
      ),
    );
    await tester.runAsync(() => tester.tap(find.text('Publish no damage')));
    await _settleIo(tester);
    expect(api.published, isEmpty);
    final error = find.textContaining('Finish marking and uploading');
    await tester.scrollUntilVisible(error, -300);
    expect(error, findsOneWidget);
  });
}
