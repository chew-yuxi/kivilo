import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

// Material's dropdown and popup menus measure the field once and open in their
// own overlay. Inside a drawer the keyboard closes as the field is tapped, the
// drawer slides down, and the menu is left floating, unstyled and full width
// where the field used to be. Choices use KiviloSegmentedControl (a few
// options) or KiviloSelectField (a list in Kivilo's own sheet) instead.
const _banned = [
  'DropdownButton',
  'DropdownMenu',
  'PopupMenuButton',
  'showMenu(',
];

void main() {
  test('the app never opens a Material dropdown or popup menu', () {
    final offenders = <String>[];
    for (final file in Directory('lib').listSync(recursive: true)) {
      if (file is! File || !file.path.endsWith('.dart')) continue;
      final lines = file.readAsLinesSync();
      for (var i = 0; i < lines.length; i++) {
        final code = lines[i].split('//').first;
        for (final name in _banned) {
          if (code.contains(name)) offenders.add('${file.path}:${i + 1} $name');
        }
      }
    }
    expect(
      offenders,
      isEmpty,
      reason:
          'Use KiviloSegmentedControl or KiviloSelectField from '
          'lib/ui/kivilo_components.dart.',
    );
  });
}
