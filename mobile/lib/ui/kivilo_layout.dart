import 'package:flutter/material.dart';

// Use the window width, so Split View and Stage Manager can use the phone layout.
const kiviloTabletBreakpoint = 720.0;

/// Keeps reading and editing comfortable without constraining the app's chrome.
class KiviloContent extends StatelessWidget {
  const KiviloContent({
    super.key,
    required this.child,
    this.maxWidth = 840,
  });

  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    bottom: false,
    child: Align(
      alignment: Alignment.topCenter,
      heightFactor: 1,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: child,
      ),
    ),
  );
}
