// Native StoreKit simulator fixture, launched only by AppleStoreKitTests.
// Uses the shipped screen/service/plugin and a fake API. It never contacts Kivilo.
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:in_app_purchase_storekit/store_kit_2_wrappers.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/billing.dart';
import 'package:kivilo/screens/billing_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/apple_billing.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

const personalToken = 'a7ef9d30-25ca-40b0-b8df-263dcb6f4d28';
const teamToken = 'b7ef9d30-25ca-40b0-b8df-263dcb6f4d28';
final catalog = [
  const StorePlanProduct(productId: 'kivilo_pro_monthly', seats: 1),
  for (var seats = 1; seats <= 20; seats++)
    StorePlanProduct(
      productId: 'kivilo_pro_team_${seats}_monthly',
      seats: seats,
    ),
];

class StoreKitTestApi extends Api {
  StoreKitTestApi() : super(attachAuth: false);
  String owner = 'storekit-alice';
  String workspace = 'personal';
  String verification = 'success';
  int attempts = 0;
  int verified = 0;
  String? lastSignedTransaction;
  final paid = <String, String>{};
  @override
  String? get currentOwnerId => owner;
  @override
  Future<String?> workspacePreference() async => workspace;
  @override
  Future<AgencyIndex> agencies() async => const AgencyIndex(
    agencies: [
      AgencySummary(
        id: 'team',
        name: 'Amber Property Team',
        role: 'OWNER',
        memberCount: 1,
      ),
    ],
    invitations: [],
  );
  @override
  Future<StoreBillingStatus> appleBillingStatus(String agencyId) async {
    final product = paid[agencyId];
    final seats = product == null
        ? 1
        : catalog.singleWhere((p) => p.productId == product).seats;
    return StoreBillingStatus(
      products: catalog
          .where(
            (p) =>
                p.productId.startsWith('kivilo_pro_team_') ==
                (agencyId == 'team'),
          )
          .toList(),
      canPurchase: true,
      canManageBilling: true,
      seats: seats,
      seatsNeeded: 1,
      activeProperties: 2,
      limit: product == null ? 5 : seats * 25,
      pro: product != null,
      provider: product == null ? null : 'apple',
      currentProductId: product,
    );
  }

  @override
  Future<Map<String, dynamic>> applePurchaseContext({
    required String agencyId,
    required String productId,
    required String expectedOwnerId,
  }) async => {
    'appAccountToken': agencyId == 'personal' ? personalToken : teamToken,
  };
  @override
  Future<bool> verifyApplePurchase({
    required String signedTransaction,
    required String expectedOwnerId,
  }) async {
    attempts++;
    lastSignedTransaction = signedTransaction;
    if (verification == 'offline') {
      throw const ApiFailure('Verification offline', 503);
    }
    if (verification == 'rejected') {
      throw const ApiFailure('Purchase belongs to another account', 404);
    }
    final payload =
        jsonDecode(
              utf8.decode(
                base64Url.decode(
                  base64Url.normalize(signedTransaction.split('.')[1]),
                ),
              ),
            )
            as Map<String, dynamic>;
    if (payload['environment'] != 'Xcode' ||
        payload['bundleId'] != 'one.kivilo.kivilo') {
      throw StateError(
        'The simulator fixture accepts only local Xcode transactions.',
      );
    }
    final product = payload['productId'] as String;
    final team = product.startsWith('kivilo_pro_team_');
    if ((payload['appAccountToken'] as String).toLowerCase() !=
        (team ? teamToken : personalToken)) {
      throw StateError('StoreKit lost the workspace account token.');
    }
    paid[team ? 'team' : 'personal'] = product;
    verified++;
    return true;
  }
}

Future<void> main() async {
  if (!kDebugMode) {
    throw StateError('StoreKit simulator fixture requires a debug build.');
  }
  WidgetsFlutterBinding.ensureInitialized();
  var api = StoreKitTestApi();
  AppleBilling.install(api);
  var billing = AppleBilling.current!;
  var generation = 0;
  void showScreen() => runApp(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: BillingScreen(
        key: ValueKey(generation++),
        api: api,
        billing: billing,
      ),
    ),
  );
  showScreen();
  final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 9776);
  await for (final request in server) {
    try {
      final data =
          jsonDecode(await utf8.decoder.bind(request).join())
              as Map<String, dynamic>;
      Object result = {'ok': true};
      switch (request.uri.path) {
        case '/reset':
          billing.dispose();
          AppleBilling.current = null;
          api = StoreKitTestApi();
          api.workspace = data['workspace'] as String? ?? 'personal';
          api.verification = data['verification'] as String? ?? 'success';
          AppleBilling.install(api);
          billing = AppleBilling.current!;
          showScreen();
        case '/configure':
          if (data['verification'] case final String value) {
            api.verification = value;
          }
          if (data['workspace'] case final String value) {
            api.workspace = value;
            showScreen();
          }
          if (data['forgetPlan'] == true) api.paid.clear();
        case '/catalog':
          result = {
            'products': [
              for (final product in await billing.products(catalog))
                {
                  'id': product.id,
                  'price': product.price,
                  'rawPrice': product.rawPrice,
                  'currency': product.currencyCode,
                },
            ],
          };
        case '/purchase':
          final product = (await billing.products(
            catalog,
          )).singleWhere((p) => p.id == data['productId']);
          await billing.purchase(
            agencyId: product.id.startsWith('kivilo_pro_team_')
                ? 'team'
                : 'personal',
            product: product,
          );
        case '/restore':
          await billing.restore();
        case '/resume':
          await billing.resume();
        case '/signed-transaction':
          result = {'signedTransaction': api.lastSignedTransaction};
        case '/state':
          final texts = <String>[];
          void visit(Element element) {
            if (element.widget case Text(data: final String text)) {
              texts.add(text);
            }
            element.visitChildren(visit);
          }
          WidgetsBinding.instance.rootElement?.visitChildren(visit);
          result = {
            'attempts': api.attempts,
            'verified': api.verified,
            'paid': api.paid,
            'busy': billing.busy,
            'message': billing.message,
            'error': billing.errorMessage,
            'texts': texts,
            'unfinished': [
              for (final t in await SK2Transaction.unfinishedTransactions())
                t.productId,
            ],
          };
        default:
          throw StateError('Unknown test command');
      }
      request.response.headers.contentType = ContentType.json;
      request.response.write(jsonEncode(result));
    } catch (error) {
      request.response.statusCode = 500;
      request.response.write(jsonEncode({'error': error.toString()}));
    } finally {
      await request.response.close();
    }
  }
}
