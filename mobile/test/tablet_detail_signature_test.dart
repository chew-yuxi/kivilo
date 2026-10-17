import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

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
import 'package:kivilo/ui/kivilo_theme.dart';

class _TabletApi extends Api {
  _TabletApi() : super(attachAuth: false, cache: ReadCache());

  final signatures = <String>[];
  final signed = Completer<void>();

  @override
  Future<void> signOwnReport(String inspectionId, String imageData) {
    signatures.add(imageData);
    return signed.future;
  }

  @override
  Future<InspectionDetail> inspection(String id) async =>
      InspectionDetail.fromJson({
        'id': id,
        'kind': 'CHECK_IN',
        'status': 'DRAFT',
        'property': '42 Cairnhill Rise',
        'landlord': 'Landlord',
        'tenant': 'Tenant',
        'landlordId': 'landlord-1',
        'tenantId': 'tenant-1',
        'summary': null,
        'baselineId': null,
        'checkOutId': null,
        'shareToken': null,
        'shareUrl': null,
        'rooms': [
          for (final name in ['Kitchen', 'Bathroom', 'Bedroom', 'Living room'])
            {
              'id': name,
              'name': name,
              'status': 'REVIEW',
              'items': 2,
              'photos': 0,
              'videos': 0,
            },
        ],
        'signatures': [],
        'findings': [],
        'maintenanceHistory': [],
        'checkOutItems': [],
        'checkInItems': [],
        'latestAssessment': null,
        'assessmentDraftChanged': false,
      });
}

final _pad = find.byWidgetPredicate(
  (widget) =>
      widget is RawGestureDetector &&
      widget.gestures.containsKey(EagerGestureRecognizer),
);

void _resize(WidgetTester tester, Size size) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = size;
}

Future<void> _showSignature(WidgetTester tester, _TabletApi api) async {
  FlutterSecureStorage.setMockInitialValues({});
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: SignatureScreen.own(
        inspectionId: 'inspection-1',
        name: 'Taylor Tenant',
        role: 'Tenant',
        savedSignature: const SavedSignature('tenant-1'),
        api: api,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

bool _hasInk(ByteData pixels, int imageWidth, Rect region) {
  for (var y = region.top.toInt(); y < region.bottom; y++) {
    for (var x = region.left.toInt(); x < region.right; x++) {
      final index = (y * imageWidth + x) * 4;
      if (pixels.getUint8(index) < 80 &&
          pixels.getUint8(index + 1) < 80 &&
          pixels.getUint8(index + 2) < 80 &&
          pixels.getUint8(index + 3) > 200) {
        return true;
      }
    }
  }
  return false;
}

void main() {
  testWidgets('inspection rooms use two columns then stack in Split View', (
    tester,
  ) async {
    _resize(tester, const Size(1366, 1024));
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: InspectionScreen(id: 'inspection-1', api: _TabletApi()),
      ),
    );
    await tester.pumpAndSettle();

    Rect room(String name) => tester.getRect(
      find.ancestor(of: find.text(name), matching: find.byType(Card)),
    );
    final kitchen = room('Kitchen');
    final bathroom = room('Bathroom');
    expect(kitchen.top, bathroom.top);
    expect(bathroom.left, greaterThan(kitchen.right));
    expect(kitchen.width, greaterThan(500));
    expect(kitchen.left, greaterThan(100));
    expect(room('Bedroom').top, greaterThan(kitchen.bottom));

    _resize(tester, const Size(390, 1200));
    await tester.pumpAndSettle();
    expect(room('Kitchen').left, room('Bathroom').left);
    expect(room('Bathroom').top, greaterThan(room('Kitchen').bottom));
    expect(tester.takeException(), isNull);
  });

  testWidgets('signature pad grows on iPad and fits narrow windows', (
    tester,
  ) async {
    _resize(tester, const Size(1024, 1366));
    addTearDown(tester.view.reset);
    await _showSignature(tester, _TabletApi());
    final tablet = tester.getRect(_pad);
    expect(tablet.width, closeTo(556.5, 1));
    expect(tablet.height, greaterThan(300));

    _resize(tester, const Size(800, 600));
    await tester.pumpAndSettle();
    expect(tester.getRect(_pad).width, closeTo(318, 1));

    _resize(tester, const Size(390, 844));
    await tester.pumpAndSettle();
    expect(tester.getRect(_pad).width, closeTo(318, 1));

    _resize(tester, const Size(300, 844));
    await tester.pumpAndSettle();
    final narrow = tester.getRect(_pad);
    expect(narrow.left, greaterThanOrEqualTo(16));
    expect(narrow.right, lessThanOrEqualTo(284));
    expect(narrow.width, lessThan(268));
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'signature keeps strokes drawn before and after resizing in PNG',
    (tester) async {
      _resize(tester, const Size(1024, 1366));
      addTearDown(tester.view.reset);
      final api = _TabletApi();
      await _showSignature(tester, api);
      var bounds = tester.getRect(_pad);
      await tester.dragFrom(
        bounds.topLeft + Offset(bounds.width * .15, bounds.height * .25),
        Offset(bounds.width * .2, 0),
      );

      _resize(tester, const Size(300, 844));
      await tester.pumpAndSettle();
      bounds = tester.getRect(_pad);
      await tester.dragFrom(
        bounds.topLeft + Offset(bounds.width * .65, bounds.height * .75),
        Offset(bounds.width * .2, 0),
      );
      await tester.tap(find.text('Confirm signature'));
      for (var i = 0; api.signatures.isEmpty && i < 100; i++) {
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 10)),
        );
        await tester.pump();
      }
      expect(api.signatures, hasLength(1));
      final bytes = base64Decode(api.signatures.single.split(',').last);
      final decoded = await tester.runAsync(() async {
        final codec = await ui.instantiateImageCodec(bytes);
        final frame = await codec.getNextFrame();
        final image = frame.image;
        final pixels = await image.toByteData(
          format: ui.ImageByteFormat.rawRgba,
        );
        final result = (image.width, image.height, pixels!);
        image.dispose();
        codec.dispose();
        return result;
      });
      expect(decoded!.$1, 640);
      expect(decoded.$2, 360);
      expect(
        _hasInk(decoded.$3, 640, const Rect.fromLTRB(80, 75, 240, 105)),
        isTrue,
      );
      expect(
        _hasInk(decoded.$3, 640, const Rect.fromLTRB(400, 250, 555, 285)),
        isTrue,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
