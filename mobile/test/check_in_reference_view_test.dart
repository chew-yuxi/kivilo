import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/ui/check_in_reference_view.dart';

Widget _host(CheckInReference reference) => MaterialApp(
  home: Scaffold(
    body: CheckInReferenceView(reference: reference, roomName: 'Galley'),
  ),
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
          matched: true,
          lines: [
            CheckInLine(
              key: 'item:hob',
              name: 'Hob',
              condition: 'GOOD',
              quantity: 2,
              notes: 'Light scratches',
            ),
          ],
          photos: [],
        ),
      ),
    );

    expect(find.text('Hob ×2'), findsOneWidget);
    expect(find.text('GOOD · Light scratches'), findsOneWidget);
    expect(find.text('Open the full check-in'), findsOneWidget);
  });

  testWidgets('says so when no check-in room has this name', (tester) async {
    await tester.pumpWidget(
      _host(
        const CheckInReference(
          baselineId: 'check-in-1',
          conductedAt: null,
          matched: false,
          lines: [],
          photos: [],
        ),
      ),
    );

    expect(find.text('No room called Galley at check-in.'), findsOneWidget);
  });
}
