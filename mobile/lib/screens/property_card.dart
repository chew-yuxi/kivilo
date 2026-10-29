import 'package:flutter/material.dart';

import '../models/property_work.dart';
import '../services/photo_cache.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_theme.dart';
import 'property_screen.dart';

/// One property in the Properties tab: what it looks like, who lives there, how far
/// the lease has run, what is next, and what is waiting on someone.
class PropertyCard extends StatelessWidget {
  const PropertyCard({
    super.key,
    required this.property,
    required this.onTap,
    this.now,
  });

  final PropertyWorkItem property;
  final VoidCallback onTap;

  /// Fixed by tests.
  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final trashed = property.state == 'TRASHED';
    final step = trashed
        ? 'Recently deleted'
        : property.state == 'ARCHIVED'
        ? 'Archived · ${property.stageLabel}'
        : property.nextStep ?? property.stageLabel;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Cover(url: property.coverUrl),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(property.address, style: text.titleMedium),
                        const SizedBox(height: 4),
                        Text(
                          '${property.tenant} · ${property.agencyName ?? 'Personal'}',
                          style: text.bodyMedium,
                        ),
                        if (property.leadAgentName != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Responsible: ${property.leadAgentName}',
                            style: text.bodySmall,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: KiviloColors.subtle),
                ],
              ),
              if (!trashed &&
                  property.startDate != null &&
                  property.endDate != null) ...[
                const SizedBox(height: 14),
                _LeaseTimeline(
                  start: DateTime.parse(property.startDate!),
                  end: DateTime.parse(property.endDate!),
                  now: now ?? DateTime.now(),
                ),
              ],
              const SizedBox(height: 12),
              PropertyNextStep(
                stage: trashed ? 'ENDED' : property.stage,
                label: step,
                attention: property.attention,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A property's next step in its stage colour, then what is waiting on someone. Shared
/// by its card and its page, so the two always read the same.
class PropertyNextStep extends StatelessWidget {
  const PropertyNextStep({
    super.key,
    required this.stage,
    required this.label,
    required this.attention,
  });

  final String stage;
  final String label;
  final PropertyAttention attention;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final (color, _) = propertyStageColors(stage);
    final badges = [
      if (attention.openRepairs > 0)
        (
          Icons.build_outlined,
          attention.openRepairs == 1
              ? '1 open repair'
              : '${attention.openRepairs} open repairs',
        ),
      if (attention.pendingUpdates > 0)
        (
          Icons.description_outlined,
          attention.pendingUpdates == 1
              ? '1 update to acknowledge'
              : '${attention.pendingUpdates} updates to acknowledge',
        ),
      if (attention.depositAnswersMissing > 0)
        (
          Icons.handshake_outlined,
          attention.depositAnswersMissing == 1
              ? 'Deposit: 1 answer pending'
              : 'Deposit: ${attention.depositAnswersMissing} answers pending',
        ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: DecoratedBox(
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                child: const SizedBox.square(dimension: 8),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: text.bodyMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        if (badges.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 14,
            runSpacing: 6,
            children: [
              for (final (icon, badge) in badges)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, size: 16, color: KiviloColors.amber),
                    const SizedBox(width: 4),
                    Text(
                      badge,
                      style: text.bodySmall?.copyWith(
                        color: KiviloColors.amber,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _Cover extends StatelessWidget {
  const _Cover({required this.url});
  final String? url;

  static const _size = 72.0;

  @override
  Widget build(BuildContext context) {
    const placeholder = ColoredBox(
      color: KiviloColors.canvas,
      child: Center(
        child: Icon(Icons.home_outlined, color: KiviloColors.subtle),
      ),
    );
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox.square(
        dimension: _size,
        child: url == null
            ? placeholder
            : Image(
                image: ResizeImage.resizeIfNeeded(
                  (_size * MediaQuery.devicePixelRatioOf(context)).round(),
                  null,
                  StoredNetworkImage(url!),
                ),
                fit: BoxFit.cover,
                gaplessPlayback: true,
                errorBuilder: (_, _, _) => placeholder,
              ),
      ),
    );
  }
}

/// How far the lease has run, from its start to its end, and what that means in words.
class _LeaseTimeline extends StatelessWidget {
  const _LeaseTimeline({
    required this.start,
    required this.end,
    required this.now,
  });
  final DateTime start;
  final DateTime end;
  final DateTime now;

  String get _label {
    if (now.isBefore(start)) return 'Starts ${shortDate(start.toIso8601String())}';
    if (!now.isBefore(end)) return 'Ended ${shortDate(end.toIso8601String())}';
    final days = end.difference(now).inDays;
    if (days == 0) return 'Ends today';
    if (days < 60) return days == 1 ? '1 day left' : '$days days left';
    final months = days ~/ 30;
    return '$months months left';
  }

  @override
  Widget build(BuildContext context) {
    final total = end.difference(start).inSeconds;
    final run = now.difference(start).inSeconds;
    final value = total <= 0 ? 1.0 : (run / total).clamp(0.0, 1.0);
    final ended = !now.isBefore(end);
    return Row(
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: value,
              minHeight: 6,
              color: ended ? KiviloColors.subtle : KiviloColors.pink,
              backgroundColor: KiviloColors.disabled,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Text(_label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
