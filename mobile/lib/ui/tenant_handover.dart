import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/handover.dart';
import '../services/api.dart';
import 'kivilo_format.dart';

/// Shown after the tenant signs, and available again from the report.
Future<void> showTenantHandover(
  BuildContext context, {
  required String inspectionId,
  required Api api,
}) => showDialog<void>(
  context: context,
  builder: (context) => Dialog(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 440),
      child: TenantHandoverView(inspectionId: inspectionId, api: api),
    ),
  ),
);

class TenantHandoverView extends StatefulWidget {
  const TenantHandoverView({
    super.key,
    required this.inspectionId,
    required this.api,
  });
  final String inspectionId;
  final Api api;

  @override
  State<TenantHandoverView> createState() => _TenantHandoverViewState();
}

class _TenantHandoverViewState extends State<TenantHandoverView> {
  late Future<TenantHandover?> _future = widget.api.handover(
    widget.inspectionId,
  );

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.all(24),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Your tenancy in Kivilo',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        FutureBuilder<TenantHandover?>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            if (snapshot.hasError) {
              return Column(
                children: [
                  Text(
                    'Could not load the handover. ${plainError(snapshot.error!)}',
                  ),
                  TextButton(
                    onPressed: () => setState(() {
                      _future = widget.api.handover(widget.inspectionId);
                    }),
                    child: const Text('Retry'),
                  ),
                ],
              );
            }
            final handover = snapshot.data;
            if (handover == null) {
              return const Text(
                'The tenant handover is available after the tenant signs the check-in.',
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Scan with your phone and sign in as yourself to see your tenancy and report a problem.',
                ),
                const SizedBox(height: 20),
                Center(
                  child: SizedBox.square(
                    dimension: 240,
                    child: Semantics(
                      label: 'QR code for the tenant sign-in link',
                      image: true,
                      child: CustomPaint(painter: _QrPainter(handover.modules)),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  handover.deadline == null
                      ? 'A move-in defect period has not been enabled for this tenancy. You can still report repairs.'
                      : 'Flag anything that was already present when you moved in by ${calendarDate(handover.deadline!)} (Singapore time).',
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: handover.url));
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Tenant sign-in link copied'),
                        ),
                      );
                    }
                  },
                  child: const Text('Copy sign-in link'),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Done'),
        ),
      ],
    ),
  );
}

class _QrPainter extends CustomPainter {
  const _QrPainter(this.modules);
  final List<List<bool>> modules;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawColor(Colors.white, BlendMode.src);
    // Four white modules on each side are the QR quiet zone.
    final scale = size.shortestSide / (modules.length + 8);
    final paint = Paint()..color = Colors.black;
    for (var y = 0; y < modules.length; y++) {
      for (var x = 0; x < modules[y].length; x++) {
        if (modules[y][x]) {
          canvas.drawRect(
            Rect.fromLTWH((x + 4) * scale, (y + 4) * scale, scale, scale),
            paint,
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(_QrPainter oldDelegate) => oldDelegate.modules != modules;
}
