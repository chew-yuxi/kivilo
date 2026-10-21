import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/inspection_screen.dart';
import 'package:kivilo/screens/signature_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/services/saved_signature.dart';

/// A real PNG, standing in for a signature someone saved on an earlier report.
const _savedPng =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const _dataUrl = 'data:image/png;base64,';

class _FakeApi extends Api {
  _FakeApi() : super(attachAuth: false, cache: ReadCache());

  /// Every image sent as a signature on the signer's own report.
  final sent = <String>[];

  /// The server's answer, held until the test gives it.
  final answer = Completer<void>();

  @override
  Future<void> signOwnReport(String inspectionId, String imageData) {
    sent.add(imageData);
    return answer.future;
  }

  @override
  Future<InspectionDetail> inspection(String id) async =>
      InspectionDetail.fromJson({
        'id': id,
        'tenancyRecordId': 'tenancy-1',
        'kind': 'CHECK_IN',
        'status': 'AWAITING_SIGNATURE',
        'property': '2 Marina Boulevard',
        'landlord': 'Lena Landlord',
        'landlordId': 'landlord-1',
        'tenant': 'Taylor Tenant',
        'tenantId': 'tenant-1',
        'summary': null,
        'baselineId': null,
        'checkOutId': null,
        'shareToken': null,
        'shareUrl': null,
        'checkOutItems': <Map<String, dynamic>>[],
        'checkInItems': <Map<String, dynamic>>[],
        'latestAssessment': null,
        'assessmentDraftChanged': false,
        'signatures': <Map<String, dynamic>>[],
        'findings': <Map<String, dynamic>>[],
        'rooms': <Map<String, dynamic>>[],
        'maintenanceHistory': <Map<String, dynamic>>[],
      });
}

void main() {
  /// What this phone holds in secure storage.
  late Map<String, String> phone;
  setUp(() {
    phone = {};
    FlutterSecureStorage.setMockInitialValues(phone);
  });

  final padFinder = find.byWidgetPredicate(
    (widget) =>
        widget is RawGestureDetector &&
        widget.gestures.containsKey(EagerGestureRecognizer),
  );

  Future<Finder> showSignatureScreen(WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: SignatureScreen(
          inspectionId: 'inspection-1',
          stakeholderId: 'stakeholder-1',
          name: 'Test signer',
          role: 'Tenant',
        ),
      ),
    );
    return padFinder;
  }

  /// Opens the landlord's own signature screen for [userId], from a page it returns to.
  Future<(_FakeApi, List<bool?>)> signOwn(
    WidgetTester tester, {
    String userId = 'user-a',
  }) async {
    final api = _FakeApi();
    final results = <bool?>[];
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () async => results.add(
              await Navigator.of(context).push<bool>(
                MaterialPageRoute(
                  builder: (_) => SignatureScreen.own(
                    inspectionId: 'inspection-1',
                    name: 'Tan Wei Ming',
                    role: 'Landlord',
                    savedSignature: SavedSignature(userId),
                    api: api,
                  ),
                ),
              ),
            ),
            child: const Text('Open'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    return (api, results);
  }

  Future<void> drawAndConfirm(WidgetTester tester, _FakeApi api) async {
    final bounds = tester.getRect(padFinder);
    await tester.dragFrom(
      bounds.center - const Offset(20, 45),
      const Offset(40, 90),
    );
    await tester.tap(find.text('Confirm signature'));
    // The engine encodes the pad as a PNG off the test's clock.
    for (var i = 0; api.sent.isEmpty && i < 100; i++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 10)),
      );
      await tester.pump();
    }
    expect(api.sent, hasLength(1));
  }

  testWidgets('a landlord signing on their own phone is spoken to directly', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: SignatureScreen.own(
          inspectionId: 'inspection-1',
          name: 'Tan Wei Ming',
          role: 'Landlord',
          savedSignature: SavedSignature('user-a'),
        ),
      ),
    );
    expect(find.text('Landlord signature'), findsOneWidget);
    expect(find.textContaining('the report you just read'), findsOneWidget);
  });

  testWidgets('vertical-dominant stroke inside the signature pad is recorded', (
    tester,
  ) async {
    final pad = await showSignatureScreen(tester);
    final bounds = tester.getRect(pad);
    await tester.dragFrom(
      bounds.center - const Offset(20, 45),
      const Offset(40, 90),
    );
    await tester.pump();

    await tester.tap(find.text('Confirm signature'));
    await tester.pumpAndSettle();
    expect(find.text('Draw a signature first.'), findsNothing);
  });

  testWidgets('a second horizontal stroke works after clearing the first', (
    tester,
  ) async {
    final pad = await showSignatureScreen(tester);
    final bounds = tester.getRect(pad);
    await tester.dragFrom(
      bounds.center - const Offset(20, 45),
      const Offset(40, 90),
    );
    await tester.tap(find.text('Clear signature'));
    await tester.dragFrom(
      bounds.center - const Offset(70, 20),
      const Offset(130, 25),
    );
    await tester.tap(find.text('Confirm signature'));
    await tester.pumpAndSettle();
    expect(find.text('Draw a signature first.'), findsNothing);
  });

  testWidgets('a tap without a drawn stroke is not a signature', (
    tester,
  ) async {
    final pad = await showSignatureScreen(tester);
    await tester.tapAt(tester.getRect(pad).center);
    await tester.tap(find.text('Confirm signature'));
    await tester.pumpAndSettle();
    expect(find.text('Draw a signature first.'), findsOneWidget);
  });

  testWidgets('dragging outside the pad still scrolls the page', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(400, 320);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final pad = await showSignatureScreen(tester);
    await tester.ensureVisible(pad);
    await tester.pumpAndSettle();
    final scrollable = tester.state<ScrollableState>(find.byType(Scrollable));
    final before = scrollable.position.pixels;
    expect(before, greaterThan(0));

    final bounds = tester.getRect(pad);
    await tester.dragFrom(
      bounds.center - const Offset(10, 35),
      const Offset(20, 70),
    );
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, before);

    await tester.dragFrom(const Offset(8, 180), const Offset(0, 100));
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, lessThan(before));
  });

  testWidgets('a drawn signature is saved once the report accepts it', (
    tester,
  ) async {
    final (api, results) = await signOwn(tester);
    expect(
      tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
      isTrue,
    );
    await drawAndConfirm(tester, api);
    await tester.pumpAndSettle();
    expect(phone, isEmpty);

    api.answer.complete();
    await tester.pumpAndSettle();
    expect(results, [true]);
    expect(phone, {
      'kivilo.signature.user-a': api.sent.single.substring(_dataUrl.length),
    });
  });

  testWidgets('a refused signature is not saved', (tester) async {
    final (api, results) = await signOwn(tester);
    await drawAndConfirm(tester, api);
    api.answer.completeError(
      const ApiFailure('This report is not waiting for signatures.', null),
    );
    await tester.pumpAndSettle();
    expect(
      find.text('This report is not waiting for signatures.'),
      findsOneWidget,
    );
    expect(results, isEmpty);
    expect(phone, isEmpty);
  });

  testWidgets('a saved signature is offered and sent exactly as saved', (
    tester,
  ) async {
    phone['kivilo.signature.user-a'] = _savedPng;
    final (api, results) = await signOwn(tester);
    expect(find.text('Draw a new one'), findsOneWidget);
    expect(padFinder, findsNothing);
    expect(find.text('Confirm signature'), findsNothing);

    await tester.tap(find.text('Use this signature'));
    await tester.pump();
    expect(api.sent, ['$_dataUrl$_savedPng']);
    api.answer.complete();
    await tester.pumpAndSettle();
    expect(results, [true]);
    expect(phone, {'kivilo.signature.user-a': _savedPng});
  });

  testWidgets('drawing a new one replaces the saved signature', (tester) async {
    phone['kivilo.signature.user-a'] = _savedPng;
    final (api, _) = await signOwn(tester);
    await tester.tap(find.text('Draw a new one'));
    await tester.pumpAndSettle();
    await drawAndConfirm(tester, api);
    api.answer.complete();
    await tester.pumpAndSettle();
    expect(api.sent.single, isNot('$_dataUrl$_savedPng'));
    expect(phone, {
      'kivilo.signature.user-a': api.sent.single.substring(_dataUrl.length),
    });
  });

  testWidgets('without Save for next time the phone keeps no signature', (
    tester,
  ) async {
    phone['kivilo.signature.user-a'] = _savedPng;
    final (api, _) = await signOwn(tester);
    await tester.tap(find.text('Draw a new one'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Save for next time'));
    await tester.pump();
    await drawAndConfirm(tester, api);
    api.answer.complete();
    await tester.pumpAndSettle();
    expect(phone, isEmpty);
  });

  testWidgets('another account on the same phone never sees it', (
    tester,
  ) async {
    phone['kivilo.signature.user-a'] = _savedPng;
    final (api, _) = await signOwn(tester, userId: 'user-b');
    expect(find.text('Use this signature'), findsNothing);
    expect(padFinder, findsOneWidget);

    await drawAndConfirm(tester, api);
    api.answer.complete();
    await tester.pumpAndSettle();
    expect(phone, {
      'kivilo.signature.user-a': _savedPng,
      'kivilo.signature.user-b': api.sent.single.substring(_dataUrl.length),
    });
  });

  testWidgets("the agent's phone never offers a saved signature or keeps one", (
    tester,
  ) async {
    // The agent's own, saved from a report they signed as somebody's landlord.
    phone['kivilo.signature.agent-1'] = _savedPng;
    await tester.pumpWidget(
      MaterialApp(
        home: InspectionScreen(id: 'inspection-1', api: _FakeApi()),
      ),
    );
    await tester.pumpAndSettle();
    final tenant = find.text('Tenant · Awaiting signature');
    await tester.scrollUntilVisible(tenant, 300);
    await tester.pumpAndSettle();
    await tester.tap(tenant);
    await tester.pumpAndSettle();

    // What the agent hands the tenant holds no saved signature to show or replace.
    final screen = tester.widget<SignatureScreen>(find.byType(SignatureScreen));
    expect(screen.stakeholderId, 'tenant-1');
    expect(screen.savedSignature, isNull);
    expect(find.text('Use this signature'), findsNothing);
    expect(find.text('Save for next time'), findsNothing);
    expect(padFinder, findsOneWidget);
    expect(phone, {'kivilo.signature.agent-1': _savedPng});
  });
}
