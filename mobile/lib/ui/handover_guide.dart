import 'package:flutter/material.dart';

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
                      Text(
                        'A handover, in three steps',
                        style: text.titleMedium,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Tap a step for a little guidance.',
                        style: text.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          for (final step in const [
            (
              '01',
              'Write what you see',
              'Start with the room inventory.',
              'Open a room and check its starter items. Add, edit or remove lines '
                  'to match what you see, and record each item’s condition. On '
                  'check-out, compare with the agreed check-in beside the inventory.',
              KiviloScene.inventory,
            ),
            (
              '02',
              'Capture the details',
              'Open an item. Photograph its condition.',
              'Open an inventory item to take photos of wear, damage, meter readings '
                  'and serial labels. Each photo opens for marking and attaches to '
                  'that item when you save it. Use Room media & walkthrough for room-wide '
                  'photos or video. Captures stay on your phone until uploaded. Check '
                  'every item, then review the room; if it has no items, confirm there '
                  'is nothing to record.',
              KiviloScene.capture,
            ),
            (
              '03',
              'Agree and sign',
              'A shared record for both parties.',
              'Let all captures finish uploading, then send for signature. Sending '
                  'freezes the inventory. The landlord and tenant can sign on your '
                  'phone or through their emailed link. Once both sign, the PDF is ready.',
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
