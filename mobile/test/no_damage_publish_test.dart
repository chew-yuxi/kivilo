import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/inspection_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class _EmptyAuthStorage extends GotrueAsyncStorage {
  @override
  Future<String?> getItem({required String key}) async => null;
  @override
  Future<void> setItem({required String key, required String value}) async {}
  @override
  Future<void> removeItem({required String key}) async {}
}

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

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    await Supabase.initialize(
      url: 'https://kivilo.test',
      publishableKey: 'publishable',
      authOptions: FlutterAuthClientOptions(
        localStorage: const EmptyLocalStorage(),
        pkceAsyncStorage: _EmptyAuthStorage(),
        detectSessionInUri: false,
        autoRefreshToken: false,
      ),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());

  testWidgets(
    'publishing with no findings is an explicit no-damage statement',
    (tester) async {
      final api = _FakeApi();
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: InspectionScreen(id: 'check-out-1', api: api),
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
      await tester.tap(find.text('Publish no damage'));
      await tester.pumpAndSettle();
      expect(api.published, [true]);
    },
  );
}
