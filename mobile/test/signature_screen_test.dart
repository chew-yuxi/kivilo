import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/signature_screen.dart';

void main() {
  Future<Finder> showSignatureScreen(WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: SignatureScreen(
          inspectionId: 'inspection-1',
          stakeholderId: 'stakeholder-1',
          name: 'Test signer',
          role: 'Tenant',
        ),
      ),
    );
    return find.byWidgetPredicate(
      (widget) =>
          widget is RawGestureDetector &&
          widget.gestures.containsKey(EagerGestureRecognizer),
    );
  }

  testWidgets('vertical-dominant stroke inside the signature pad is recorded', (
    tester,
  ) async {
    final pad = await showSignatureScreen(tester);
    final bounds = tester.getRect(pad);
    await tester.dragFrom(
      bounds.center - const Offset(20, 45),
      const Offset(40, 90),
    );
    await tester.pump();

    await tester.tap(find.text('Confirm signature'));
    await tester.pumpAndSettle();
    expect(find.text('Draw a signature first.'), findsNothing);
  });

  testWidgets('a second horizontal stroke works after clearing the first', (
    tester,
  ) async {
    final pad = await showSignatureScreen(tester);
    final bounds = tester.getRect(pad);
    await tester.dragFrom(
      bounds.center - const Offset(20, 45),
      const Offset(40, 90),
    );
    await tester.tap(find.text('Clear signature'));
    await tester.dragFrom(
      bounds.center - const Offset(70, 20),
      const Offset(130, 25),
    );
    await tester.tap(find.text('Confirm signature'));
    await tester.pumpAndSettle();
    expect(find.text('Draw a signature first.'), findsNothing);
  });

  testWidgets('a tap without a drawn stroke is not a signature', (tester) async {
    final pad = await showSignatureScreen(tester);
    await tester.tapAt(tester.getRect(pad).center);
    await tester.tap(find.text('Confirm signature'));
    await tester.pumpAndSettle();
    expect(find.text('Draw a signature first.'), findsOneWidget);
  });

  testWidgets('dragging outside the pad still scrolls the page', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(400, 320);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final pad = await showSignatureScreen(tester);
    await tester.ensureVisible(pad);
    await tester.pumpAndSettle();
    final scrollable = tester.state<ScrollableState>(find.byType(Scrollable));
    final before = scrollable.position.pixels;
    expect(before, greaterThan(0));

    final bounds = tester.getRect(pad);
    await tester.dragFrom(
      bounds.center - const Offset(10, 35),
      const Offset(20, 70),
    );
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, before);

    await tester.dragFrom(const Offset(8, 180), const Offset(0, 100));
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, lessThan(before));
  });
}
