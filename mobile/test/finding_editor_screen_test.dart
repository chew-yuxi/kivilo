import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/finding_editor_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:kivilo/ui/marked_network_photo.dart';

const _kitchenSerial = 'OVEN-KITCHEN-001';
const _studySerial = 'OVEN-STUDY-002';
const _lampSerial = 'LAMP-MISSING-003';

Map<String, dynamic> _item({
  required String id,
  required String room,
  required String name,
  required String serial,
  String condition = 'GOOD',
  int quantity = 1,
  String? notes,
  String? baselineKey,
  bool? includedAtStart,
  bool represented = false,
  Map<String, dynamic>? checkIn,
}) => {
  'id': id,
  'label': '$room · $name',
  'roomId': 'room-${room.toLowerCase()}',
  'roomName': room,
  'name': name,
  'category': 'APPLIANCE',
  'condition': condition,
  'quantity': quantity,
  'identifier': serial,
  'meterReading': null,
  'notes': notes,
  'baselineKey': baselineKey,
  'photos': <Map<String, dynamic>>[],
  'checkIn': checkIn,
  'representedAtCheckOut': represented,
  'representedByItemIds': represented ? ['out-kitchen'] : <String>[],
  'includedAtCheckOutStart': includedAtStart,
};

List<ComparableItem> _outItems() => ComparableItem.listFromJson([
  _item(
    id: 'out-kitchen',
    room: 'Kitchen',
    name: 'Oven',
    serial: _kitchenSerial,
    condition: 'DAMAGED',
    notes: 'Dent at the lower edge of the door.',
    baselineKey: 'item:in-kitchen',
    checkIn: {
      'key': 'item:in-kitchen',
      'name': 'Oven',
      'condition': 'GOOD',
      'quantity': 1,
      'identifier': _kitchenSerial,
      'meterReading': null,
      'notes': 'No dents at handover.',
      'update': false,
      'photos': <Map<String, dynamic>>[],
    },
  ),
  _item(
    id: 'out-study',
    room: 'Study',
    name: 'Oven',
    serial: _studySerial,
    condition: 'FAIR',
    quantity: 2,
    notes: 'Two portable ovens on the shelf.',
  ),
]);

List<ComparableItem> _inItems() => ComparableItem.listFromJson([
  _item(
    id: 'in-kitchen',
    room: 'Kitchen',
    name: 'Oven',
    serial: _kitchenSerial,
    includedAtStart: true,
    represented: true,
  ),
  _item(
    id: 'in-lamp',
    room: 'Bedroom',
    name: 'Floor lamp',
    serial: _lampSerial,
    includedAtStart: true,
  ),
  _item(
    id: 'in-later',
    room: 'Bedroom',
    name: 'Later-added toaster',
    serial: 'TOASTER-ADDED-LATER',
    includedAtStart: false,
  ),
]);

Finder _field(String label) => find.byWidgetPredicate(
  (widget) => widget is TextField && widget.decoration?.labelText == label,
);

Finder _button(String label) => find.ancestor(
  of: find.text(label),
  matching: find.byWidgetPredicate((widget) => widget is ButtonStyleButton),
);

Finder _chip(String label) =>
    find.ancestor(of: find.text(label), matching: find.byType(ChoiceChip));

Future<void> _tapButton(WidgetTester tester, String label) async {
  await _reveal(tester, _button(label), upward: label == 'Change item');
  await tester.pump();
  await tester.tap(_button(label));
  await tester.pumpAndSettle();
}

Future<void> _tapChip(WidgetTester tester, String label) async {
  await _reveal(
    tester,
    _chip(label),
    upward: label == 'Wear' || label == 'Fair wear',
  );
  await tester.pumpAndSettle();
  await tester.tap(_chip(label));
  await tester.pumpAndSettle();
}

Future<void> _reveal(
  WidgetTester tester,
  Finder target, {
  bool upward = false,
}) async {
  if (target.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      target,
      upward ? -200 : 200,
      scrollable: find
          .byWidgetPredicate(
            (widget) =>
                widget is Scrollable &&
                widget.axisDirection == AxisDirection.down,
          )
          .first,
      maxScrolls: 30,
    );
  }
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
}

Future<void> _enter(WidgetTester tester, String label, String value) async {
  await _reveal(tester, _field(label));
  await tester.enterText(_field(label), value);
  await tester.pumpAndSettle();
}

Future<void> _open(
  WidgetTester tester, {
  required Future<void> Function(Map<String, dynamic>) onSave,
  Finding? finding,
  List<ComparableItem>? checkOutItems,
  List<ComparableItem>? checkInItems,
  Future<void> Function()? onRemove,
  List<Map<String, dynamic>> maintenanceHistory = const [],
  double textScale = 1,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: Builder(
        builder: (context) => Scaffold(
          body: Column(
            children: [
              const Text('Assessment home'),
              FilledButton(
                onPressed: () => Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(
                    builder: (_) => FindingEditorScreen(
                      finding: finding,
                      maintenanceHistory: maintenanceHistory,
                      checkOutItems: checkOutItems ?? _outItems(),
                      checkInItems: checkInItems ?? _inItems(),
                      onSave: onSave,
                      onRemove: onRemove,
                    ),
                  ),
                ),
                child: const Text('Open finding editor'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Open finding editor'));
  await tester.pumpAndSettle();
}

Future<void> _chooseSerial(WidgetTester tester, String serial) async {
  final row = find.descendant(
    of: find.byType(Card),
    matching: find.textContaining(serial),
  );
  await _reveal(tester, row);
  await tester.tap(row);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'room and serial search distinguish two items with the same name',
    (tester) async {
      final saved = <Map<String, dynamic>>[];
      await _open(tester, onSave: (body) async => saved.add(body));

      final search = _field('Search items, rooms or serial numbers');
      await tester.enterText(search, 'Kitchen');
      await tester.pumpAndSettle();
      expect(find.textContaining(_kitchenSerial), findsWidgets);
      expect(find.textContaining(_studySerial), findsNothing);

      await tester.enterText(search, _studySerial.toLowerCase());
      await tester.pumpAndSettle();
      expect(find.textContaining(_studySerial), findsWidgets);
      expect(find.textContaining(_kitchenSerial), findsNothing);

      await tester.enterText(search, 'Oven');
      await tester.pumpAndSettle();
      await _tapChip(tester, 'Kitchen');
      expect(find.textContaining(_studySerial), findsNothing);
      await _chooseSerial(tester, _kitchenSerial);
      await _enter(tester, 'Rationale', 'The door was dented after handover.');
      await _tapButton(tester, 'Add finding');

      expect(saved, hasLength(1));
      expect(saved.single['itemId'], 'out-kitchen');
      expect(saved.single['baselineItemId'], isNull);
      expect(find.text('Assessment home'), findsOneWidget);
    },
  );

  testWidgets(
    'a missing item uses the frozen check-in line without deciding liability',
    (tester) async {
      final saved = <Map<String, dynamic>>[];
      await _open(tester, onSave: (body) async => saved.add(body));
      await tester.tap(find.text('At check-in').first);
      await tester.pumpAndSettle();
      expect(find.textContaining('Later-added toaster'), findsNothing);
      expect(find.textContaining('TOASTER-ADDED-LATER'), findsNothing);
      await _chooseSerial(tester, _lampSerial);

      expect(tester.widget<ChoiceChip>(_chip('Missing')).selected, true);
      expect(tester.widget<ChoiceChip>(_chip('Undecided')).selected, true);
      await _enter(
        tester,
        'Rationale',
        'The lamp from the signed check-in is absent.',
      );
      await _tapButton(tester, 'Add finding');

      expect(saved.single['itemId'], isNull);
      expect(saved.single['baselineItemId'], 'in-lamp');
      expect(saved.single['changeType'], 'MISSING');
      expect(saved.single['verdict'], 'UNDECIDED');
    },
  );

  testWidgets('changing the item preserves the draft and the chooser filters', (
    tester,
  ) async {
    final saved = <Map<String, dynamic>>[];
    await _open(tester, onSave: (body) async => saved.add(body));
    await _enter(tester, 'Search items, rooms or serial numbers', 'Oven');
    await tester.pumpAndSettle();
    await _tapChip(tester, 'Kitchen');
    await _chooseSerial(tester, _kitchenSerial);
    await _enter(
      tester,
      'Rationale',
      'Minor scuffing is consistent with normal use.',
    );
    await _enter(tester, 'Estimated cost (SGD)', '125.50');
    await _tapChip(tester, 'Wear');
    await _tapChip(tester, 'Fair wear');
    await _tapButton(tester, 'Change item');

    expect(
      tester
          .widget<TextField>(_field('Search items, rooms or serial numbers'))
          .controller!
          .text,
      'Oven',
    );
    expect(tester.widget<ChoiceChip>(_chip('Kitchen')).selected, true);
    await _enter(tester, 'Search items, rooms or serial numbers', '');
    await tester.tap(find.text('At check-in').first);
    await tester.pumpAndSettle();
    await _tapChip(tester, 'Bedroom');
    await _chooseSerial(tester, _lampSerial);

    await _reveal(tester, _chip('Wear'), upward: true);
    expect(tester.widget<ChoiceChip>(_chip('Wear')).selected, true);
    await _reveal(tester, _chip('Fair wear'));
    expect(tester.widget<ChoiceChip>(_chip('Fair wear')).selected, true);
    await _reveal(tester, _field('Rationale'));
    expect(
      tester.widget<TextField>(_field('Rationale')).controller!.text,
      'Minor scuffing is consistent with normal use.',
    );
    await _reveal(tester, _field('Estimated cost (SGD)'));
    expect(
      tester.widget<TextField>(_field('Estimated cost (SGD)')).controller!.text,
      '125.50',
    );
    await _tapButton(tester, 'Add finding');
    expect(saved.single['baselineItemId'], 'in-lamp');
    expect(saved.single['changeType'], 'WEAR');
    expect(saved.single['verdict'], 'FAIR_WEAR');
  });

  testWidgets(
    'failed saves preserve the finding and rapid taps submit only once',
    (tester) async {
      final first = Completer<void>();
      final saved = <Map<String, dynamic>>[];
      await _open(
        tester,
        onSave: (body) {
          saved.add(body);
          return saved.length == 1 ? first.future : Future.value();
        },
      );
      await _chooseSerial(tester, _studySerial);
      await _enter(tester, 'Rationale', 'A fresh dent is visible on the door.');
      await _enter(tester, 'Estimated cost (SGD)', '90');
      await tester.ensureVisible(_button('Add finding'));
      await tester.tap(_button('Add finding'));
      await tester.tap(_button('Add finding'));
      await tester.pump();
      expect(saved, hasLength(1));
      expect(find.text('Assessment home'), findsNothing);

      first.completeError(
        const ApiFailure(
          'A colleague updated the assessment. Retry after checking.',
          409,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('A colleague updated'), findsOneWidget);
      await _reveal(
        tester,
        find.textContaining(_studySerial).first,
        upward: true,
      );
      expect(find.textContaining(_studySerial), findsWidgets);
      await _reveal(tester, _field('Rationale'));
      expect(find.text('A fresh dent is visible on the door.'), findsOneWidget);
      expect(find.text('90'), findsOneWidget);

      await _tapButton(tester, 'Add finding');
      expect(saved, hasLength(2));
      expect(saved.last, saved.first);
      expect(find.text('Assessment home'), findsOneWidget);
    },
  );

  testWidgets('old cached item labels remain selectable', (tester) async {
    final saved = <Map<String, dynamic>>[];
    await _open(
      tester,
      checkOutItems: ComparableItem.listFromJson([
        {'id': 'legacy-out', 'label': 'Study · Portable heater'},
      ]),
      checkInItems: const [],
      onSave: (body) async => saved.add(body),
    );
    await tester.tap(find.textContaining('Portable heater').first);
    await tester.pumpAndSettle();
    await _enter(tester, 'Rationale', 'The heater casing is chipped.');
    await _tapButton(tester, 'Add finding');
    expect(saved.single['itemId'], 'legacy-out');
  });

  testWidgets('selected evidence keeps the correct source and original marks', (
    tester,
  ) async {
    const beforeUrl = 'https://storage.test/check-in-oven?token=before';
    const afterUrl = 'https://storage.test/check-out-oven?token=after';
    final marks = <String, dynamic>{
      'w': 1200,
      'h': 1600,
      'marks': [
        {'shape': 'ring', 'cx': 0.5, 'cy': 0.6, 'rx': 0.1, 'ry': 0.1},
      ],
    };
    final item =
        _item(
            id: 'out-kitchen',
            room: 'Kitchen',
            name: 'Oven',
            serial: _kitchenSerial,
            condition: 'DAMAGED',
            notes: 'Dent at the lower edge.',
            baselineKey: 'item:in-kitchen',
            checkIn: {
              'key': 'item:in-kitchen',
              'name': 'Oven',
              'condition': 'GOOD',
              'quantity': 1,
              'identifier': _kitchenSerial,
              'meterReading': null,
              'notes': 'No dents at handover.',
              'update': false,
              'photos': [
                {
                  'id': 'before',
                  'url': beforeUrl,
                  'note': 'Door at check-in',
                  'annotations': marks,
                },
              ],
            },
          )
          ..['photos'] = [
            {
              'id': 'after',
              'url': afterUrl,
              'note': 'Door at check-out',
              'annotations': null,
            },
          ];
    final saved = <Map<String, dynamic>>[];
    final accepted = Completer<void>();
    await _open(
      tester,
      checkOutItems: ComparableItem.listFromJson([item]),
      checkInItems: const [],
      onSave: (body) {
        saved.add(body);
        return accepted.future;
      },
    );
    await _chooseSerial(tester, _kitchenSerial);
    await _tapButton(tester, 'Show item details');
    expect(find.text('Check-in: good'), findsOneWidget);
    expect(find.text('Check-out: damaged'), findsOneWidget);
    await _enter(
      tester,
      'Rationale',
      'The original photos show the changed door.',
    );

    for (final evidence in [
      (
        source: 'At check-in',
        note: 'Door at check-in',
        url: beforeUrl,
        annotations: marks,
      ),
      (
        source: 'At check-out',
        note: 'Door at check-out',
        url: afterUrl,
        annotations: null,
      ),
    ]) {
      final openPhoto = find.bySemanticsLabel(
        RegExp('^Open ${evidence.source} photo: ${evidence.note}'),
      );
      await _reveal(tester, openPhoto, upward: true);
      await tester.tap(openPhoto);
      await tester.pumpAndSettle();
      expect(find.text(evidence.source), findsOneWidget);
      final image = tester.widget<MarkedNetworkPhoto>(
        find.byType(MarkedNetworkPhoto),
      );
      expect(image.url, evidence.url);
      expect(image.annotations, evidence.annotations);
      expect(image.fit, BoxFit.contain);
      await tester.pageBack();
      await tester.pumpAndSettle();
    }
    await _reveal(tester, _field('Rationale'));
    expect(
      find.text('The original photos show the changed door.'),
      findsOneWidget,
    );
    await tester.tap(_button('Add finding'));
    await tester.pump();
    final disabledPhoto = find.bySemanticsLabel(
      RegExp('^Open At check-in photo: Door at check-in'),
    );
    await _reveal(tester, disabledPhoto, upward: true);
    await tester.tap(disabledPhoto, warnIfMissed: false);
    await tester.pumpAndSettle();
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is AppBar &&
            widget.title is Text &&
            (widget.title! as Text).data == 'At check-in',
      ),
      findsNothing,
    );
    expect(find.byType(FindingEditorScreen), findsOneWidget);
    accepted.complete();
    await tester.pumpAndSettle();
    expect(saved.single['itemId'], 'out-kitchen');
    expect(saved.single.values, isNot(contains(beforeUrl)));
    expect(saved.single.values, isNot(contains(afterUrl)));
    expect(find.text('Assessment home'), findsOneWidget);
  });

  testWidgets(
    'reviewing an existing finding retains its decision and linked repair',
    (tester) async {
      final saved = <Map<String, dynamic>>[];
      final finding = Finding.fromJson({
        'id': 'finding-existing',
        'changeType': 'WEAR',
        'verdict': 'FAIR_WEAR',
        'rationale': 'Ordinary surface wear.',
        'estimatedCost': '25.50',
        'itemLabel': 'Study · Oven',
        'itemId': 'out-study',
        'baselineLabel': null,
        'editedByHuman': false,
        'maintenanceCaseId': 'repair-1',
        'maintenanceCaseTitle': 'Oven inspection',
      });
      await _open(
        tester,
        finding: finding,
        maintenanceHistory: const [
          {'id': 'repair-1', 'title': 'Oven inspection'},
        ],
        onSave: (body) async => saved.add(body),
      );
      expect(find.text('Review finding'), findsOneWidget);
      expect(find.textContaining(_studySerial), findsWidgets);
      expect(tester.widget<ChoiceChip>(_chip('Wear')).selected, true);
      expect(tester.widget<ChoiceChip>(_chip('Fair wear')).selected, true);
      await _enter(
        tester,
        'Rationale',
        'Reviewed against the agreed photos: ordinary surface wear.',
      );
      await _tapButton(tester, 'Save reviewed finding');
      expect(saved.single['changeType'], 'WEAR');
      expect(saved.single['verdict'], 'FAIR_WEAR');
      expect(saved.single['estimatedCost'], '25.50');
      expect(saved.single['maintenanceCaseId'], 'repair-1');
      expect(find.text('Assessment home'), findsOneWidget);
    },
  );

  testWidgets(
    'a failed removal keeps the original finding available for retry',
    (tester) async {
      var removed = 0;
      final finding = Finding.fromJson({
        'id': 'finding-existing',
        'changeType': 'DAMAGE',
        'verdict': 'UNDECIDED',
        'rationale': 'Check the chipped handle.',
        'estimatedCost': null,
        'itemLabel': 'Kitchen · Oven',
        'baselineLabel': null,
        'editedByHuman': false,
        'maintenanceCaseId': null,
        'maintenanceCaseTitle': null,
      });
      await _open(
        tester,
        finding: finding,
        onSave: (_) async {},
        onRemove: () async {
          removed++;
          if (removed == 1) {
            throw const ApiFailure(
              'Could not remove this finding. Try again.',
              409,
            );
          }
        },
      );
      await _tapButton(tester, 'Delete finding');
      expect(removed, 1);
      expect(find.text('Assessment home'), findsNothing);
      expect(find.text('Check the chipped handle.'), findsOneWidget);
      expect(
        find.textContaining('Could not remove this finding'),
        findsOneWidget,
      );
      await _tapButton(tester, 'Delete finding');
      expect(removed, 2);
      expect(find.text('Assessment home'), findsOneWidget);
    },
  );

  for (final scenario in const [
    (size: Size(320, 568), textScale: 1.5),
    (size: Size(1024, 768), textScale: 1.0),
  ]) {
    testWidgets(
      'chooser and finding form work at ${scenario.size} with text ${scenario.textScale}',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = scenario.size;
        addTearDown(tester.view.reset);
        final saved = <Map<String, dynamic>>[];
        await _open(
          tester,
          textScale: scenario.textScale,
          onSave: (body) async => saved.add(body),
        );
        expect(tester.takeException(), isNull);
        if (scenario.size.width == 320) {
          tester.view.viewInsets = const FakeViewPadding(bottom: 260);
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
        }
        await _enter(
          tester,
          'Search items, rooms or serial numbers',
          _kitchenSerial,
        );
        await tester.pumpAndSettle();
        await _chooseSerial(tester, _kitchenSerial);
        expect(tester.takeException(), isNull);
        await _enter(tester, 'Rationale', 'The lower edge is dented.');
        final saveBounds = tester.getRect(_button('Add finding'));
        expect(saveBounds.left, greaterThanOrEqualTo(0));
        expect(saveBounds.right, lessThanOrEqualTo(scenario.size.width));
        expect(
          saveBounds.bottom,
          lessThanOrEqualTo(
            scenario.size.height - (scenario.size.width == 320 ? 260 : 0),
          ),
        );
        await _tapButton(tester, 'Add finding');
        expect(saved.single['itemId'], 'out-kitchen');
        expect(find.text('Assessment home'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
