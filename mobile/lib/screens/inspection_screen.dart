import 'package:flutter/material.dart';

import '../models/inspection.dart';
import '../services/api.dart';

/// The rooms of one inspection, in walk order. Read only for now: capture, review and
/// signing still happen in the web app, which is why the two clients deliberately share
/// one backend and one vocabulary.
class InspectionScreen extends StatefulWidget {
  const InspectionScreen({super.key, required this.id});

  final String id;

  @override
  State<InspectionScreen> createState() => _InspectionScreenState();
}

class _InspectionScreenState extends State<InspectionScreen> {
  final _api = Api();
  late Future<InspectionDetail> _future = _api.inspection(widget.id);

  Future<void> _refresh() async {
    final next = _api.inspection(widget.id);
    setState(() => _future = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rooms')),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<InspectionDetail>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ListView(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text('Could not load this inspection.\n\n${snapshot.error}'),
                  ),
                ],
              );
            }
            final inspection = snapshot.data!;
            return ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        inspection.kind == 'CHECK_IN' ? 'Check-in' : 'Check-out',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 4),
                      Text(inspection.property),
                      Text(
                        '${inspection.landlord} and ${inspection.tenant}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      if (inspection.summary != null) ...[
                        const SizedBox(height: 12),
                        Text(inspection.summary!),
                      ],
                    ],
                  ),
                ),
                const Divider(height: 1),
                for (final room in inspection.rooms)
                  ListTile(
                    title: Text(room.name),
                    subtitle: Text(
                      room.newSinceDraft > 0
                          ? '${room.countsLabel} · ${room.newSinceDraft} new since the draft'
                          : room.countsLabel,
                    ),
                    trailing: Text(room.statusLabel),
                  ),
                if (inspection.rooms.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(32),
                    child: Text('No rooms yet.'),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
