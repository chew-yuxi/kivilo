import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/room_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:kivilo/ui/marked_network_photo.dart';

String _signed(String name, DateTime expires) {
  String part(Object value) =>
      base64Url.encode(utf8.encode(jsonEncode(value))).replaceAll('=', '');
  final token = [
    part({'alg': 'HS256'}),
    part({'exp': expires.millisecondsSinceEpoch ~/ 1000}),
    'signature',
  ].join('.');
  return 'https://storage.test/object/sign/captures/$name?token=$token';
}

/// The phone's saved copy holds a link signed yesterday; the server signs a new one.
class _RestartedApi extends Api {
  _RestartedApi() : super(attachAuth: false, cache: ReadCache());

  final expired = _signed(
    'photo.jpg',
    DateTime.now().subtract(const Duration(hours: 15)),
  );
  final fresh = _signed(
    'photo.jpg',
    DateTime.now().add(const Duration(hours: 1)),
  );

  @override
  Future<RoomDetail> room(String inspectionId, String roomId) async =>
      RoomDetail(
        id: 'room-1',
        name: 'Kitchen',
        status: 'CAPTURING',
        items: const [
          InventoryItem(
            id: 'item-1',
            name: 'Walls',
            category: 'SURFACE',
            condition: 'GOOD',
            quantity: 1,
            evidenceCaptureIds: ['photo-1'],
          ),
        ],
        captures: [
          EvidenceCapture(
            id: 'photo-1',
            kind: 'PHOTO',
            url: readingSavedCopy ? expired : fresh,
          ),
        ],
      );
}

void main() {
  testWidgets(
    'a restart shows the server’s fresh photo link, not the saved expired one',
    (tester) async {
      tester.view.physicalSize = const Size(393, 1400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final api = _RestartedApi();
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: RoomScreen(
            inspectionId: 'inspection-1',
            roomId: 'room-1',
            editable: false,
            api: api,
          ),
        ),
      );
      await tester.pumpAndSettle();

      final urls = tester
          .widgetList<MarkedNetworkPhoto>(find.byType(MarkedNetworkPhoto))
          .map((photo) => photo.url);
      expect(urls, isNotEmpty);
      expect(urls, everyElement(api.fresh));
    },
  );
}
