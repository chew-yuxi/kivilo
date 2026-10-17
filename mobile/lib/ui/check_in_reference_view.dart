import 'package:flutter/material.dart';

import '../models/inspection.dart';
import '../screens/inspection_screen.dart';
import 'kivilo_theme.dart';
import 'marked_network_photo.dart';

/// The check-in's photos and lines for the room a check-out inspector is standing in,
/// so they can compare without leaving it. The room screen shows it inline and the
/// capture screen in a drawer. Reference only: nothing here writes a line.
class CheckInReferenceView extends StatelessWidget {
  const CheckInReferenceView({super.key, required this.reference});

  final CheckInReference reference;

  Future<void> _view(BuildContext context, CheckInPhoto photo) =>
      Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => Scaffold(
            appBar: AppBar(title: const Text('At check-in')),
            backgroundColor: Colors.black,
            body: Center(
              child: InteractiveViewer(
                minScale: 0.8,
                maxScale: 5,
                child: MarkedNetworkPhoto(
                  url: photo.url,
                  annotations: photo.annotations,
                  fit: BoxFit.contain,
                ),
              ),
            ),
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (reference.photos.isNotEmpty) ...[
          SizedBox(
            height: 110,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: reference.photos.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final photo = reference.photos[index];
                return Semantics(
                  button: true,
                  label: 'Open check-in photo ${index + 1}',
                  child: InkWell(
                    onTap: () => _view(context, photo),
                    borderRadius: BorderRadius.circular(8),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(
                        width: 140,
                        child: ColoredBox(
                          color: KiviloColors.canvas,
                          child: MarkedNetworkPhoto(
                            url: photo.url,
                            annotations: photo.annotations,
                            fit: BoxFit.contain,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (reference.lines.isEmpty)
          Text(
            'Nothing recorded in this room at check-in.',
            style: text.bodyMedium,
          ),
        for (final line in reference.lines)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  line.quantity > 1
                      ? '${line.name} ×${line.quantity}'
                      : line.name,
                  style: text.titleSmall,
                ),
                if (line.identifier != null)
                  Text(line.identifier!, style: text.bodySmall),
                Text(
                  [line.condition, ?line.meterReading, ?line.notes].join(' · '),
                  style: text.bodyMedium,
                ),
              ],
            ),
          ),
        const SizedBox(height: 6),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => Navigator.of(context).push<void>(
              MaterialPageRoute(
                builder: (_) => InspectionScreen(id: reference.baselineId),
              ),
            ),
            child: const Text('Open the full check-in'),
          ),
        ),
      ],
    );
  }
}
