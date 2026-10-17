import 'package:flutter/material.dart';

import '../models/inspection.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import 'inspection_screen.dart';
import 'new_inspection_screen.dart';
import 'renewal_reminders.dart';

class InspectionsScreen extends StatefulWidget {
  const InspectionsScreen({super.key, this.api});
  final Api? api;

  @override
  State<InspectionsScreen> createState() => _InspectionsScreenState();
}

class _InspectionsScreenState extends State<InspectionsScreen> {
  late final _api = widget.api ?? Api();
  late Future<List<InspectionSummary>> _future = _api.inspections();
  int _renewalsVersion = 0;

  Future<void> _refresh() async {
    final next = _api.inspections();
    setState(() {
      _future = next;
      _renewalsVersion += 1;
    });
    await next;
  }

  Future<void> _create() async {
    final id = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const NewInspectionScreen()),
    );
    if (!mounted || id == null) return;
    await Navigator.of(
      context,
    ).push<void>(MaterialPageRoute(builder: (_) => InspectionScreen(id: id)));
    if (mounted) await _refresh();
  }

  Future<void> _openInspection(String id) async {
    await Navigator.of(
      context,
    ).push<void>(MaterialPageRoute(builder: (_) => InspectionScreen(id: id)));
    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Inspections')),
    floatingActionButton: FloatingActionButton.extended(
      onPressed: _create,
      backgroundColor: KiviloColors.pink,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.add),
      label: const Text('New check-in'),
    ),
    body: KiviloContent(
      maxWidth: 1200,
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<InspectionSummary>>(
          future: _future,
          builder: (context, snapshot) {
            if (!snapshot.hasData && !snapshot.hasError) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _message(
                icon: Icons.cloud_off_outlined,
                title: 'Could not load inspections',
                body: plainError(snapshot.error!),
                action: OutlinedButton(
                  onPressed: _refresh,
                  child: const Text('Try again'),
                ),
              );
            }

            final inspections = snapshot.data!;
            final active = inspections
                .where((inspection) => inspection.status != 'COMPLETED')
                .toList();
            final completed = inspections
                .where((inspection) => inspection.status == 'COMPLETED')
                .toList();
            return LayoutBuilder(
              builder: (context, constraints) {
                final available = constraints.maxWidth - 32;
                final columns = available >= 680 ? 2 : 1;
                final cardWidth = (available - (columns - 1) * 16) / columns;
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 112),
                  children: [
                    Text(
                      'Property handovers',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Capture each room, write its inventory, then sign.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    RenewalReminders(
                      key: ValueKey(_renewalsVersion),
                      api: _api,
                      onRenewed: _refresh,
                    ),
                    if (_api.offlineCopy) ...[
                      const SizedBox(height: 18),
                      Card(
                        color: KiviloColors.amberSoft,
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.cloud_off_outlined,
                                color: KiviloColors.amber,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Offline. Showing what was last loaded; you can keep taking photos.',
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 28),
                    if (inspections.isEmpty)
                      _messageCard()
                    else ...[
                      if (active.isNotEmpty) ...[
                        KiviloSectionHeading(
                          title: 'In progress',
                          subtitle:
                              '${active.length} ${active.length == 1 ? 'handover' : 'handovers'}',
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 16,
                          runSpacing: 12,
                          children: [
                            for (final inspection in active)
                              SizedBox(
                                width: cardWidth,
                                child: _inspectionCard(inspection),
                              ),
                          ],
                        ),
                      ],
                      if (completed.isNotEmpty) ...[
                        if (active.isNotEmpty) const SizedBox(height: 18),
                        KiviloSectionHeading(
                          title: 'Completed',
                          subtitle:
                              '${completed.length} signed ${completed.length == 1 ? 'report' : 'reports'}',
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 16,
                          runSpacing: 12,
                          children: [
                            for (final inspection in completed)
                              SizedBox(
                                width: cardWidth,
                                child: _inspectionCard(inspection),
                              ),
                          ],
                        ),
                      ],
                    ],
                  ],
                );
              },
            );
          },
        ),
      ),
    ),
  );

  Widget _inspectionCard(InspectionSummary inspection) => Card(
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => _openInspection(inspection.id),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: KiviloColors.pinkSoft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.fact_check_outlined,
                color: KiviloColors.pinkDark,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    inspection.property,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${inspection.kindLabel} · ${inspection.tenant}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      KiviloStatusPill(status: inspection.status),
                      Text(
                        '${inspection.rooms} ${inspection.rooms == 1 ? 'room' : 'rooms'}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(top: 10),
              child: Icon(Icons.chevron_right, color: KiviloColors.subtle),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _messageCard() => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Icon(
            Icons.fact_check_outlined,
            size: 36,
            color: KiviloColors.subtle,
          ),
          const SizedBox(height: 14),
          Text(
            'No inspections yet',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            _api.offlineCopy
                ? 'Connect to create a new check-in.'
                : 'Start a check-in when you next hand over a unit.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          if (!_api.offlineCopy) ...[
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: _create,
              icon: const Icon(Icons.add),
              label: const Text('Start check-in'),
            ),
          ],
        ],
      ),
    ),
  );

  Widget _message({
    required IconData icon,
    required String title,
    required String body,
    required Widget action,
  }) => ListView(
    children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(32, 80, 32, 32),
        child: Column(
          children: [
            Icon(icon, size: 36, color: KiviloColors.subtle),
            const SizedBox(height: 14),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(body, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            action,
          ],
        ),
      ),
    ],
  );
}
