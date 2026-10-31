import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/property_work.dart';
import 'package:kivilo/screens/new_inspection_screen.dart';
import 'package:kivilo/screens/property_picker_screen.dart';
import 'package:kivilo/screens/renewal_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _Api extends Api {
  _Api() : super(attachAuth: false);
  final checkIns = <Map<String, dynamic>>[];
  final renewalRequests = <Map<String, dynamic>>[];

  @override
  Future<List<StartableProperty>> startableProperties() async {
    if (readingSavedCopy) throw StateError('nothing saved');
    return const [
      StartableProperty(
        id: 'property-1',
        address: '8 Jalan Kayu #04-11, 799487',
        propertyType: 'HDB',
        lastTenant: 'Priya Nair',
        lastEndDate: '2026-10-31',
        agencyId: 'team',
        agencyName: 'Harbour Homes',
        furnishingLevel: 'PARTIALLY_FURNISHED',
        rooms: ['Living room', 'Kitchen', 'Bedroom'],
        lastLandlordName: 'Lee Landlord',
        lastLandlordEmail: 'lee@example.test',
      ),
      StartableProperty(
        id: 'property-2',
        address: '231 Bishan Street 23 #10-120, 570231',
        propertyType: 'HDB',
        lastTenant: 'Marcus Lee',
        lastEndDate: '2026-11-14',
      ),
    ];
  }

  @override
  Future<List<Contact>> contacts() async {
    if (readingSavedCopy) throw StateError('nothing saved');
    return const [
      Contact(name: 'Lee Landlord', email: 'lee@example.test', roles: ['LANDLORD']),
      Contact(name: 'Priya Nair', email: 'priya@example.test', roles: ['TENANT']),
    ];
  }

  @override
  Future<String> createInspection(Map<String, dynamic> body) async {
    checkIns.add(body);
    return 'inspection-1';
  }

  @override
  Future<Map<String, dynamic>> renewal(String tenancyId) async => {
    'id': tenancyId,
    'property': '12 Green Road',
    'tenant': 'Tenant',
    'endDate': '2026-11-01',
    'monthlyRent': '3000',
    'deposit': '6000',
    'rooms': ['Living room', 'Kitchen', 'Study'],
  };

  @override
  Future<String> createRenewal(
    String tenancyId,
    Map<String, dynamic> data,
  ) async {
    renewalRequests.add(data);
    return 'next-check-in';
  }
}

class _NoDraft extends ReadCache {
  @override
  Future<Object?> read(String key) async => null;
  @override
  Future<bool> write(String key, Object? value) async => true;
  @override
  Future<void> remove(String key) async {}
}

Future<void> _show(WidgetTester tester, Widget screen) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(400, 900);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: Builder(
        builder: (context) => Scaffold(
          body: TextButton(
            onPressed: () => Navigator.of(
              context,
            ).push<void>(MaterialPageRoute(builder: (_) => screen)),
            child: const Text('open'),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('open'));
  await tester.pumpAndSettle();
}

Future<void> _reveal(WidgetTester tester, Finder target) async {
  await tester.scrollUntilVisible(
    target,
    300,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.ensureVisible(target.first);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'a new tenancy at an existing property keeps its address, workspace and rooms',
    (tester) async {
      final api = _Api();
      await _show(tester, NewInspectionScreen(api: api, cache: _NoDraft()));
      await tester.tap(find.text('Existing property'));
      await tester.pumpAndSettle();
      expect(find.byType(PropertyPickerScreen), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'bishan');
      await tester.pumpAndSettle();
      expect(find.text('8 Jalan Kayu #04-11, 799487'), findsNothing);
      await tester.enterText(find.byType(TextField), 'priya');
      await tester.pumpAndSettle();
      await tester.tap(find.text('8 Jalan Kayu #04-11, 799487'));
      await tester.pumpAndSettle();

      expect(find.text('Workspace: Harbour Homes'), findsOneWidget);
      expect(find.widgetWithText(TextFormField, 'Address (required)'), findsNothing);
      await _reveal(tester, find.text('Start with the rooms from the last check-in'));
      expect(find.text('3 rooms to set up'), findsOneWidget);
      expect(find.text('Bedrooms'), findsNothing);
      await tester.tap(
        find.descendant(
          of: find.widgetWithText(InputChip, 'Bedroom'),
          matching: find.byIcon(Icons.close),
        ),
      );
      await tester.pumpAndSettle();
      await _reveal(tester, find.text('Same landlord as last time'));
      expect(find.text('Lee Landlord · lee@example.test'), findsOneWidget);
      expect(find.widgetWithText(TextFormField, 'Landlord name (required)'), findsNothing);
      final tenant = find.widgetWithText(TextFormField, 'Tenant name (required)');
      await _reveal(tester, tenant);
      await tester.enterText(tenant, 'New Tenant');
      await tester.tap(find.text('Create check-in'));
      await tester.pumpAndSettle();

      final body = api.checkIns.single;
      expect(body['propertyId'], 'property-1');
      expect(body['agencyId'], 'team');
      expect(body.containsKey('line1'), isFalse);
      // The property's last furnishing is offered and kept unless changed.
      expect(body['furnishingLevel'], 'PARTIALLY_FURNISHED');
      expect(body['rooms'], ['Living room', 'Kitchen']);
      // The server links last term's landlord itself; no name or email is sent.
      expect(body['sameLandlord'], isTrue);
      expect(body.containsKey('landlordName'), isFalse);
      expect(body.containsKey('verifyParties'), isFalse, reason: 'outside the preview nothing is offered');
    },
  );

  testWidgets('verifying both parties is offered with the check-in, on unless turned off', (tester) async {
    final api = _Api();
    await _show(tester, NewInspectionScreen(api: api, cache: _NoDraft(), offerVerification: true));
    await tester.tap(find.text('Existing property'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('8 Jalan Kayu #04-11, 799487'));
    await tester.pumpAndSettle();
    final tenant = find.widgetWithText(TextFormField, 'Tenant name (required)');
    await _reveal(tester, tenant);
    await tester.enterText(tenant, 'New Tenant');
    final verify = find.widgetWithText(SwitchListTile, 'Verify both parties (CEA)');
    await _reveal(tester, verify);
    expect(tester.widget<SwitchListTile>(verify).value, isTrue);
    await tester.tap(verify);
    await tester.pumpAndSettle();
    await _reveal(tester, find.text('Create check-in'));
    await tester.tap(find.text('Create check-in'));
    await tester.pumpAndSettle();
    expect(api.checkIns.single['verifyParties'], isFalse);
  });

  testWidgets('a contact fills the tenant, and the fields stay editable', (
    tester,
  ) async {
    final api = _Api();
    await _show(tester, NewInspectionScreen(api: api, cache: _NoDraft()));
    // The tenant's button follows the tenant's email field.
    await _reveal(tester, find.widgetWithText(TextFormField, 'Tenant email (optional)'));
    final choose = find.text('Choose from your contacts').last;
    await tester.ensureVisible(choose);
    await tester.pumpAndSettle();
    await tester.tap(choose);
    await tester.pumpAndSettle();
    expect(find.text('Choose the tenant'), findsOneWidget);
    // People seen as tenants first.
    expect(
      tester.getTopLeft(find.text('Priya Nair')).dy,
      lessThan(tester.getTopLeft(find.text('Lee Landlord')).dy),
    );
    await tester.tap(find.text('Priya Nair'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(TextFormField, 'Priya Nair'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'priya@example.test'), findsOneWidget);
  });

  testWidgets('a renewal starts with the rooms kept from the last check-in', (
    tester,
  ) async {
    final api = _Api();
    await _show(tester, RenewalScreen(tenancyId: 'tenancy-1', api: api));
    expect(find.text('Start with the rooms from the last check-in'), findsOneWidget);
    await tester.tap(
      find.descendant(
        of: find.widgetWithText(InputChip, 'Study'),
        matching: find.byIcon(Icons.close),
      ),
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Create renewal check-in'));
    await tester.tap(find.text('Create renewal check-in'));
    await tester.pumpAndSettle();
    expect(api.renewalRequests.single['rooms'], ['Living room', 'Kitchen']);
  });
}
