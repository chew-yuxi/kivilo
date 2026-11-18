import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/home_tasks.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/property_work.dart';
import 'package:kivilo/models/renewal.dart';
import 'package:kivilo/screens/country_screen.dart';
import 'package:kivilo/screens/home_screen.dart';
import 'package:kivilo/screens/settings_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/secure_session_store.dart';
import 'package:kivilo/ui/kivilo_components.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Where an agent works is asked once, before Home, and kept from then on. Their new
/// properties are made there, and Singapore's agent tools are shown only to agents who
/// work in Singapore.

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

class _Api extends Api {
  _Api({
    this.country,
    this.contexts = const UserContexts(
      work: true,
      landlord: false,
      tenant: false,
    ),
    this.offline = false,
  }) : super(attachAuth: false);

  String? country;
  final UserContexts contexts;
  final bool offline;
  var failSaves = 0;
  final saves = <String>[];

  UserProfile get _profile => UserProfile(
    id: 'agent',
    name: 'Aminah Yusof',
    roles: const ['AGENT'],
    contexts: contexts,
    country: country,
  );

  @override
  Future<UserProfile> me() async {
    if (offline) throw const ApiFailure('No connection', null);
    if (readingSavedCopy) throw StateError('nothing saved');
    return _profile;
  }

  @override
  Future<UserProfile> saveCountry(String value) async {
    saves.add(value);
    if (failSaves > 0) {
      failSaves--;
      throw const ApiFailure('No connection', null);
    }
    country = value;
    return _profile;
  }

  @override
  Future<AgencyIndex> agencies() async =>
      const AgencyIndex(agencies: [], invitations: []);
  @override
  Future<String?> workspacePreference() async => null;
  @override
  Future<void> saveWorkspacePreference(String? value) async {}
  @override
  Future<HomeTasks> homeTasks({
    required String context,
    String? agencyId,
    bool personal = false,
  }) async {
    if (readingSavedCopy) throw StateError('nothing saved');
    return const HomeTasks(
      tasks: [],
      dueDiligence: true,
      dueDiligenceCounts: (needsYou: 0, waiting: 0, freeLeft: 3),
    );
  }

  @override
  Future<List<TenancySummary>> tenancyWork({
    String? agencyId,
    bool personal = false,
    String? party,
  }) async => [];
  @override
  Future<List<PropertyWorkItem>> propertyWork({
    String? agencyId,
    String? assigneeId,
    bool personal = false,
    String state = 'active',
  }) async => [];
  @override
  Future<List<RenewalReminder>> renewalWork({
    String? agencyId,
    bool personal = false,
  }) async => [];
  @override
  Future<AgentBranding?> branding() async => const AgentBranding(
    agencyName: 'Harbour Homes',
    ceaRegistration: '12345',
  );
  @override
  Future<WorkspacePlan> plan() async =>
      const WorkspacePlan(pro: false, activeProperties: 0, limit: 5, seats: 1);
  @override
  Future<Map<String, dynamic>> deletionRequest() async => {'request': null};
}

Future<void> _pump(WidgetTester tester, Widget home) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(theme: buildKiviloTheme(), home: home));
  await tester.pumpAndSettle();
}

String _chosen(WidgetTester tester) => tester
    .widget<KiviloSegmentedControl<String>>(
      find.byType(KiviloSegmentedControl<String>),
    )
    .value!;

void main() {
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

  testWidgets('the question starts on the phone’s region', (tester) async {
    addTearDown(tester.platformDispatcher.clearLocaleTestValue);
    tester.platformDispatcher.localeTestValue = const Locale('en', 'MY');
    await _pump(tester, CountryScreen(api: _Api(), onSaved: (_) {}));
    expect(_chosen(tester), 'MY');

    tester.platformDispatcher.localeTestValue = const Locale('en', 'GB');
    await _pump(
      tester,
      CountryScreen(key: UniqueKey(), api: _Api(), onSaved: (_) {}),
    );
    expect(_chosen(tester), 'SG');
  });

  testWidgets(
    'a new agent answers once before Home, and only a saved answer lets them in',
    (tester) async {
      final api = _Api()..failSaves = 1;
      await _pump(tester, HomeScreen(api: api));
      expect(find.text('Where do you work?'), findsOneWidget);
      expect(find.text('New check-in'), findsNothing);

      await tester.tap(find.text('Malaysia'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
      // Not saved: still asked, with the reason and a way to retry.
      expect(
        find.textContaining('Could not save where you work.'),
        findsOneWidget,
      );
      expect(find.text('New check-in'), findsNothing);
      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();

      expect(api.saves, ['MY', 'MY']);
      expect(find.text('Where do you work?'), findsNothing);
      expect(find.text('New check-in'), findsOneWidget);
      // Client checks are CEA due diligence, which a Malaysian agent is not offered.
      expect(find.text('Verify clients (KYC/CDD)'), findsNothing);
    },
  );

  testWidgets(
    'an agent who has answered goes straight to Home with Singapore’s tools',
    (tester) async {
      final api = _Api(country: 'SG');
      await _pump(tester, HomeScreen(api: api));
      expect(find.text('Where do you work?'), findsNothing);
      expect(find.text('Verify clients (KYC/CDD)'), findsOneWidget);
      expect(api.saves, isEmpty);
    },
  );

  testWidgets(
    'nobody is stopped by the question who is not an agent or cannot be read',
    (tester) async {
      await _pump(
        tester,
        HomeScreen(
          api: _Api(
            contexts: const UserContexts(
              work: false,
              landlord: false,
              tenant: true,
            ),
          ),
        ),
      );
      expect(find.text('Where do you work?'), findsNothing);

      await _pump(
        tester,
        HomeScreen(key: UniqueKey(), api: _Api(offline: true)),
      );
      expect(find.text('Where do you work?'), findsNothing);
    },
  );

  testWidgets(
    'Account changes where the agent works and names their register',
    (tester) async {
      final api = _Api(country: 'MY');
      UserProfile? changed;
      await _pump(
        tester,
        SettingsScreen(
          api: api,
          trackView: false,
          onCountryChanged: (profile) => changed = profile,
        ),
      );
      expect(
        find.text('Malaysia. New properties are made here.'),
        findsOneWidget,
      );
      expect(find.text('REN 12345'), findsOneWidget);

      await tester.tap(find.text('Where you work'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Singapore'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Save'));
      await tester.pumpAndSettle();

      expect(api.saves, ['SG']);
      expect(changed?.country, 'SG');
      expect(
        find.text('Singapore. New properties are made here.'),
        findsOneWidget,
      );
      // Singapore's wording, exactly as it always read.
      expect(find.text('CEA 12345'), findsOneWidget);
    },
  );
}
