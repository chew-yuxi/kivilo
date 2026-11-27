import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

void main() {
  test('handovers use legible brand pink actions in every enabled state', () {
    final style = buildKiviloTheme().filledButtonTheme.style!;
    expect(style.backgroundColor!.resolve({}), KiviloColors.pink);
    for (final states in <Set<WidgetState>>[
      {},
      {WidgetState.hovered},
      {WidgetState.focused},
      {WidgetState.pressed},
    ]) {
      final fill = Color.alphaBlend(
        style.overlayColor!.resolve(states) ?? Colors.transparent,
        style.backgroundColor!.resolve(states)!,
      );
      final ink = style.foregroundColor!.resolve(states)!;
      expect(
        (fill.computeLuminance() + 0.05) / (ink.computeLuminance() + 0.05),
        greaterThanOrEqualTo(4.5),
        reason: states.toString(),
      );
    }
    expect(style.minimumSize!.resolve({})!.height, greaterThanOrEqualTo(50));
    expect(
      style.backgroundColor!.resolve({WidgetState.disabled}),
      KiviloColors.disabled,
    );
  });
}
