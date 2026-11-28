import 'package:drift/native.dart';
import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/move_out_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/read_cache.dart';

class _Cache extends ReadCache {
  final values = <String, Object?>{};
  @override
  String? get ownerId => 'jac';
  @override
  Future<Object?> readForOwner(String owner, String key) async => values[key];
  @override
  Future<bool> writeForOwner(String owner, String key, Object? value) async {
    values[key] = value;
    return true;
  }

  @override
  Future<void> deleteForOwner(String owner, String key) async {
    values.remove(key);
  }
}

class _Api extends Api {
  _Api() : super(attachAuth: false);
  @override
  Future<List<Map<String, dynamic>>> moveOutTargets(String? agencyId) async =>
      [];
}

void main() {
  test(
    'staged photos stay on the phone until the matching owner attaches the walkthrough',
    () async {
      final queue = CaptureQueue(NativeDatabase.memory());
      addTearDown(queue.close);
      const stage = 'move-out-draft:test';
      final id = await queue.enqueue(
        PendingCapturesCompanion.insert(
          ownerId: const Value('owner'),
          clientId: Value(newCaptureId()),
          inspectionId: stage,
          roomId: stage,
          itemId: const Value('remote'),
          kind: 'PHOTO',
          relativePath: 'evidence.jpg',
          filename: 'evidence.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1200,
          createdAt: DateTime.utc(2026, 11, 28),
        ),
      );
      expect(await queue.claimNext(DateTime.now(), ownerId: 'owner'), isNull);
      await queue.attachMoveOutPhotos('different-owner', stage, 'report');
      expect((await queue.byId(id))!.inspectionId, stage);
      await queue.attachMoveOutPhotos('owner', stage, 'report');
      await queue.attachMoveOutPhotos('owner', stage, 'report');
      final uploaded = await queue.claimNext(DateTime.now(), ownerId: 'owner');
      expect(uploaded!.id, id);
      expect(uploaded.roomId, 'walk-report');
      expect(uploaded.itemId, 'walk-report-remote');
    },
  );

  for (final width in [320.0, 390.0]) {
    testWidgets(
      'review brings the first invalid field into view at width $width',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = Size(width, 620);
        addTearDown(tester.view.reset);
        final cache = _Cache();
        final queue = CaptureQueue(NativeDatabase.memory());
        addTearDown(queue.close);
        await tester.pumpWidget(
          MaterialApp(
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: TextScaler.linear(1.3)),
              child: child!,
            ),
            home: MoveOutScreen(
              api: _Api(),
              country: 'SG',
              cache: cache,
              queue: queue,
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.enterText(find.byType(TextFormField), '18 Palm Walk');
        await tester.tap(find.text('Start walkthrough'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Finish with no issues'));
        await tester.pumpAndSettle();
        final submit = find.text('Create check-out report');
        await tester.dragUntilVisible(
          submit.hitTestable(),
          find.byType(ListView),
          const Offset(0, -240),
        );
        await tester.pumpAndSettle();
        await tester.tap(submit);
        await tester.pumpAndSettle();
        expect(find.text('Enter Postal code').hitTestable(), findsOneWidget);
        expect(
          find.text('No issues observed during this visit.'),
          findsOneWidget,
        );
        expect(find.text('Choose the tenancy start date'), findsOneWidget);
        final email = find.byKey(const ValueKey('details-tenantEmail'));
        await tester.ensureVisible(email);
        await tester.enterText(email, 'mistyped');
        await tester.pumpAndSettle();
        expect(find.text('Enter a valid email address'), findsOneWidget);
        await tester.enterText(email, 'tenant@example.com');
        await tester.pumpAndSettle();
        expect(find.text('Enter a valid email address'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'record an issue before entering tenancy details and resume after leaving',
    (tester) async {
      final cache = _Cache(),
          api = _Api(),
          queue = CaptureQueue(NativeDatabase.memory());
      addTearDown(queue.close);
      Future<void> open() async {
        await tester.pumpWidget(
          MaterialApp(
            home: MoveOutScreen(
              api: api,
              country: 'SG',
              cache: cache,
              queue: queue,
            ),
          ),
        );
        await tester.pumpAndSettle();
      }

      await open();
      await tester.enterText(find.byType(TextFormField), '18 Palm Walk');
      await tester.tap(find.text('Start walkthrough'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Record an issue'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextFormField).first,
        'Missing remote',
      );
      await tester.ensureVisible(find.text('Save issue'));
      await tester.tap(find.text('Save issue'));
      await tester.pumpAndSettle();
      expect(find.text('Missing remote'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      await open();
      expect(find.text('Missing remote'), findsOneWidget);
      expect(find.text('Damage'), findsOneWidget);
      expect(find.text('Walkthrough'), findsOneWidget);
      await tester.tap(find.text('Review visit'));
      await tester.pumpAndSettle();
      expect(find.text('Tenancy details for the report'), findsOneWidget);
    },
  );
}
