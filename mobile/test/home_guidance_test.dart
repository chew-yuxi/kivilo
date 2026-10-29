import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/ui/handover_guide.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

// Home itself is covered by home_command_centre_test.dart; the lessons now sit
// below a first-use Home and in Account.
void main() {
  testWidgets('guide steps expand independently and expose their state', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 1500);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: const Scaffold(
          body: SingleChildScrollView(child: HandoverGuide()),
        ),
      ),
    );
    final inventory = find.text('Write what you see');
    final capture = find.text('Capture the details');
    final inventoryDetails = find.textContaining(
      'Open a room and check its starter items.',
    );
    final captureDetails = find.textContaining(
      'Open an inventory item to take photos of wear, damage, meter readings',
    );
    expect(inventoryDetails, findsNothing);
    expect(captureDetails, findsNothing);
    expect(
      tester.getSemantics(inventory),
      isSemantics(
        hasExpandedState: true,
        isExpanded: false,
        hasTapAction: true,
      ),
    );
    await tester.tap(inventory);
    await tester.pumpAndSettle();
    expect(inventoryDetails, findsOneWidget);
    expect(
      tester.getSemantics(inventory),
      isSemantics(hasExpandedState: true, isExpanded: true),
    );
    await tester.tap(capture);
    await tester.pumpAndSettle();
    expect(inventoryDetails, findsOneWidget);
    expect(captureDetails, findsOneWidget);
    await tester.tap(inventory);
    await tester.pumpAndSettle();
    expect(inventoryDetails, findsNothing);
    expect(captureDetails, findsOneWidget);
    expect(
      tester.getSemantics(inventory),
      isSemantics(hasExpandedState: true, isExpanded: false),
    );
    expect(
      tester.getSemantics(capture),
      isSemantics(hasExpandedState: true, isExpanded: true),
    );
    expect(tester.takeException(), isNull);
    semantics.dispose();
  });

}
