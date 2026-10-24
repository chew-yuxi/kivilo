import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/screens/settings_screen.dart';
import 'package:kivilo/screens/team_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/secure_session_store.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class _MemoryStorage extends GotrueAsyncStorage {
  final _items = <String, String>{};

  @override
  Future<String?> getItem({required String key}) async => _items[key];

  @override
  Future<void> setItem({required String key, required String value}) async =>
      _items[key] = value;

  @override
  Future<void> removeItem({required String key}) async => _items.remove(key);
}

class _AccountApi extends Api {
  _AccountApi() : super(attachAuth: false);

  @override
  Future<AgencyIndex> agencies() async => const AgencyIndex(
    agencies: [
      AgencySummary(
        id: 'green',
        name: 'Green Agency',
        role: 'OWNER',
        memberCount: 2,
      ),
    ],
    invitations: [],
  );

  @override
  Future<AgencyDetail> agency(String id) async => const AgencyDetail(
    id: 'green',
    name: 'Green Agency',
    role: 'OWNER',
    canManage: true,
    members: [],
    tenancies: [],
    activity: [],
  );

  @override
  Future<AgentBranding?> branding() async => null;

  @override
  Future<WorkspacePlan> plan() async =>
      const WorkspacePlan(pro: false, activeProperties: 0, limit: 5, seats: 1);

  @override
  Future<Map<String, dynamic>> deletionRequest() async => {'request': null};
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    FlutterSecureStorage.setMockInitialValues({});
    PackageInfo.setMockInitialValues(
      appName: 'Kivilo',
      packageName: 'one.kivilo.kivilo',
      version: '1.0.0',
      buildNumber: '24',
      buildSignature: '',
    );
    await Supabase.initialize(
      url: 'https://kivilo.test',
      publishableKey: 'publishable',
      authOptions: FlutterAuthClientOptions(
        localStorage: const SecureSessionStore(),
        pkceAsyncStorage: _MemoryStorage(),
        detectSessionInUri: false,
        autoRefreshToken: false,
      ),
    );
  });

  testWidgets('Account opens a specific team without the team directory hop', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(home: SettingsScreen(api: _AccountApi(), trackView: false)),
    );
    await tester.pumpAndSettle();

    expect(find.text('Green Agency'), findsOneWidget);
    expect(find.text('Owner · 2 members'), findsOneWidget);
    expect(find.text('Add another team'), findsOneWidget);

    await tester.tap(find.text('Green Agency'));
    await tester.pumpAndSettle();

    expect(find.byType(TeamDetailScreen), findsOneWidget);
    expect(find.text('Team'), findsOneWidget);
  });
}
