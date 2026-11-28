import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import 'kivilo_illustration.dart';
import 'kivilo_theme.dart';

/// Small, available-on-demand lessons beside the inspector's work.
class HandoverGuide extends StatefulWidget {
  const HandoverGuide({super.key});

  @override
  State<HandoverGuide> createState() => _HandoverGuideState();
}

class _HandoverGuideState extends State<HandoverGuide> {
  final _expanded = <String>{};

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.help_outline, color: KiviloColors.ink),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(t.guideTitle, style: text.titleMedium),
                      const SizedBox(height: 4),
                      Text(t.guideDetail, style: text.bodySmall),
                    ],
                  ),
                ),
              ],
            ),
          ),
          for (final step in [
            (
              '01',
              t.guideStep1,
              t.guideStep1Short,
              t.guideStep1Body,
              KiviloScene.inventory,
            ),
            (
              '02',
              t.guideStep2,
              t.guideStep2Short,
              'Open an inventory item to take photos of wear, damage, meter readings '
                  'and serial labels. Each photo opens for marking and attaches to '
                  'that item when you save it. Use Room photos for room-wide photos. '
                  'Photos stay on your phone until uploaded. Check '
                  'every item, then review the room; if it has no items, confirm there '
                  'is nothing to record.',
              KiviloScene.capture,
            ),
            (
              '03',
              t.guideStep3,
              t.guideStep3Short,
              t.guideStep3Body,
              KiviloScene.sign,
            ),
          ]) ...[
            Semantics(
              expanded: _expanded.contains(step.$1),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 4,
                ),
                onTap: () => setState(() {
                  if (!_expanded.add(step.$1)) _expanded.remove(step.$1);
                }),
                leading: KiviloIllustration(
                  scene: step.$5,
                  width: 56,
                  height: 56,
                ),
                trailing: AnimatedRotation(
                  turns: _expanded.contains(step.$1) ? 0.5 : 0,
                  duration: const Duration(milliseconds: 200),
                  child: const Icon(Icons.arrow_drop_down),
                ),
                title: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      step.$1,
                      style: text.bodySmall?.copyWith(
                        color: KiviloColors.pinkDark,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(step.$2, style: text.titleMedium),
                  ],
                ),
                subtitle: Text(step.$3, style: text.bodySmall),
              ),
            ),
            AnimatedSize(
              duration: const Duration(milliseconds: 200),
              alignment: Alignment.topCenter,
              child: _expanded.contains(step.$1)
                  ? Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                      child: Column(
                        children: [
                          KiviloIllustration(
                            scene: step.$5,
                            width: 240,
                            height: 144,
                          ),
                          const SizedBox(height: 12),
                          Text(step.$4, style: text.bodyMedium),
                        ],
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ],
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
