import 'package:flutter/material.dart';

import 'kivilo_theme.dart';

/// Keeps the current place and its parent visible after the page heading scrolls away.
class PageContextTitle extends StatelessWidget {
  const PageContextTitle({
    super.key,
    required this.title,
    required this.contextLabel,
  });

  final String title;
  final String contextLabel;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: KiviloColors.ink,
          fontSize: 17,
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 2),
      Text(
        contextLabel,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(color: KiviloColors.muted, fontSize: 12),
      ),
    ],
  );
}
