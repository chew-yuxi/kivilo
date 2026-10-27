import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/ui/check_in_reference_view.dart';
import 'package:kivilo/ui/marked_network_photo.dart';

Widget _host(CheckInReference reference) => MaterialApp(
  home: Scaffold(body: CheckInReferenceView(reference: reference)),
);

void main() {
  testWidgets('lists each check-in line with its condition and notes', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        const CheckInReference(
          baselineId: 'check-in-1',
          conductedAt: null,
          lines: [
            CheckInLine(
              key: 'item:hob',
              name: 'Hob',
              condition: 'GOOD',
              quantity: 2,
              notes: 'Light scratches',
            ),
          ],
          photos: [
            CheckInPhoto(
              id: 'photo-1',
              url: 'https://example.test/before.jpg',
              caption: 'Before: cracked basin',
              update: true,
            ),
          ],
        ),
      ),
    );

    expect(find.text('Update · Before: cracked basin'), findsOneWidget);
    expect(find.text('Hob ×2'), findsOneWidget);
    expect(find.text('GOOD · Light scratches'), findsOneWidget);
    expect(find.text('Open the full check-in'), findsOneWidget);
  });

  testWidgets('captions a photo with its marks, and grows with the text size', (
    tester,
  ) async {
    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(textScaler: TextScaler.linear(2)),
        child: _host(
          const CheckInReference(
            baselineId: 'check-in-1',
            conductedAt: null,
            lines: [],
            photos: [
              CheckInPhoto(
                id: 'photo-1',
                url: 'https://example.test/basin.jpg',
                caption: 'Basin',
                update: true,
                annotations: {
                  'v': 1,
                  'w': 640,
                  'h': 480,
                  'marks': [
                    {
                      'shape': 'ring',
                      'cx': .5,
                      'cy': .5,
                      'rx': .1,
                      'ry': .1,
                      'note': 'chip in enamel',
                    },
                  ],
                },
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('Update · Basin\n1. chip in enamel'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('draws the small copy in the tile and opens the original', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        const CheckInReference(
          baselineId: 'check-in-1',
          conductedAt: null,
          lines: [],
          photos: [
            CheckInPhoto(
              id: 'photo-1',
              url: 'https://example.test/original.jpg',
              posterUrl: 'https://example.test/poster.jpg',
              caption: 'Basin',
            ),
          ],
        ),
      ),
    );

    String drawn() => tester
        .widget<MarkedNetworkPhoto>(find.byType(MarkedNetworkPhoto).last)
        .url;
    expect(drawn(), 'https://example.test/poster.jpg');
    await tester.tap(find.byType(MarkedNetworkPhoto));
    await tester.pumpAndSettle();
    expect(drawn(), 'https://example.test/original.jpg');
  });
}
