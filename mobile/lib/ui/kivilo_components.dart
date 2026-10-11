import 'package:flutter/material.dart';

import 'kivilo_theme.dart';

class KiviloMark extends StatelessWidget {
  const KiviloMark({super.key, this.size = 34});
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: KiviloColors.pink,
      borderRadius: BorderRadius.circular(size * 0.28),
    ),
    alignment: Alignment.center,
    child: Container(
      width: size * 0.36,
      height: size * 0.36,
      decoration: const BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
      ),
    ),
  );
}

class KiviloSectionHeading extends StatelessWidget {
  const KiviloSectionHeading({
    super.key,
    required this.title,
    this.subtitle,
    this.action,
  });

  final String title;
  final String? subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.center,
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium),
            ],
          ],
        ),
      ),
      ?action,
    ],
  );
}

class KiviloStatusPill extends StatelessWidget {
  const KiviloStatusPill({super.key, required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, foreground, background) = switch (status) {
      'COMPLETED' => ('Completed', KiviloColors.green, KiviloColors.greenSoft),
      'REVIEWED' => ('Reviewed', KiviloColors.green, KiviloColors.greenSoft),
      'AWAITING_SIGNATURE' => (
        'Awaiting signatures',
        KiviloColors.amber,
        KiviloColors.amberSoft,
      ),
      'REVIEW' => ('Needs review', KiviloColors.amber, KiviloColors.amberSoft),
      'FAILED' => ('Needs attention', KiviloColors.red, KiviloColors.redSoft),
      'PROCESSING' => (
        'Drafting',
        KiviloColors.pinkDark,
        KiviloColors.pinkSoft,
      ),
      'CAPTURING' => (
        'Capturing',
        KiviloColors.pinkDark,
        KiviloColors.pinkSoft,
      ),
      'PENDING' => ('Not started', KiviloColors.muted, KiviloColors.canvas),
      _ => ('Draft', KiviloColors.muted, KiviloColors.canvas),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
