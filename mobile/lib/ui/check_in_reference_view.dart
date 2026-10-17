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
            appBar: AppBar(title: Text(photo.caption ?? 'At check-in')),
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

  Widget _photo(BuildContext context, int index, CheckInPhoto photo) {
    final caption = [
      [if (photo.update) 'Update', ?photo.caption].join(' · '),
      // Numbered as the report numbers them, so a ring says what it points at.
      for (final (number, mark)
          in ((photo.annotations?['marks'] as List<dynamic>?) ?? const [])
              .indexed)
        if ((mark as Map<String, dynamic>)['note'] case final String note
            when note.isNotEmpty)
          '${number + 1}. $note',
    ].where((line) => line.isNotEmpty).join('\n');
    return Semantics(
      button: true,
      label: 'Open check-in photo ${index + 1}',
      child: InkWell(
        onTap: () => _view(context, photo),
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: 140,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  height: 110,
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
              if (caption.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(caption, style: Theme.of(context).textTheme.bodySmall),
              ],
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (reference.photos.isNotEmpty) ...[
          // A row at its natural height rather than a fixed-height list, so captions
          // under a larger system text size grow the strip instead of overflowing it.
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final (index, photo) in reference.photos.indexed) ...[
                  if (index > 0) const SizedBox(width: 8),
                  _photo(context, index, photo),
                ],
              ],
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
                  [
                    line.quantity > 1
                        ? '${line.name} ×${line.quantity}'
                        : line.name,
                    if (line.update) 'Update',
                  ].join(' · '),
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
