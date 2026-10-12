import 'package:flutter/material.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_theme.dart';
import 'inspection_screen.dart';
import 'maintenance_case_screen.dart';

/// Everything settled at one address, newest first. The server decides which tenancies
/// this viewer may see; the screen only lays them out.
class PropertyTimelineScreen extends StatefulWidget {
  const PropertyTimelineScreen({super.key, required this.propertyId, this.api});
  final String propertyId;
  final Api? api;

  @override
  State<PropertyTimelineScreen> createState() => _PropertyTimelineScreenState();
}

class _PropertyTimelineScreenState extends State<PropertyTimelineScreen> {
  late final _api = widget.api ?? Api();
  late Future<PropertyTimeline> _future = _api.propertyTimeline(
    widget.propertyId,
  );

  Future<void> _refresh() async {
    final next = _api.propertyTimeline(widget.propertyId);
    setState(() => _future = next);
    await next;
  }

  Future<void> _open(TimelineEvent event) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => event.linkType == 'inspection'
            ? InspectionScreen(id: event.linkId!)
            : MaintenanceCaseScreen(caseId: event.linkId!),
      ),
    );
    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Timeline')),
    body: FutureBuilder<PropertyTimeline>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) return Center(child: Text('${snapshot.error}'));
        final timeline = snapshot.data!;
        final text = Theme.of(context).textTheme;
        final months = <String, List<TimelineEvent>>{};
        for (final event in timeline.events) {
          months.putIfAbsent(monthYear(event.at), () => []).add(event);
        }
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              const Text(
                'PROPERTY TIMELINE',
                style: TextStyle(
                  color: KiviloColors.pinkDark,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 4),
              Text(timeline.property, style: text.headlineMedium),
              const SizedBox(height: 6),
              Text(
                'Signed reports, repairs and agreed costs, newest first.',
                style: text.bodyMedium,
              ),
              if (timeline.events.isEmpty) ...[
                const SizedBox(height: 24),
                Card(
                  color: KiviloColors.canvas,
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      'Nothing has been settled here yet. Signed reports and '
                      'repairs will appear as they happen.',
                      textAlign: TextAlign.center,
                      style: text.bodyMedium,
                    ),
                  ),
                ),
              ],
              for (final MapEntry(key: month, value: events)
                  in months.entries) ...[
                const SizedBox(height: 24),
                Text(month, style: text.titleMedium),
                const SizedBox(height: 10),
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    children: [
                      for (var index = 0; index < events.length; index++) ...[
                        if (index > 0) const Divider(height: 1, indent: 60),
                        _EventRow(
                          event: events[index],
                          onTap: events[index].linkId == null
                              ? null
                              : () => _open(events[index]),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        );
      },
    ),
  );
}

class _EventRow extends StatelessWidget {
  const _EventRow({required this.event, required this.onTap});
  final TimelineEvent event;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final (icon, color, background) = switch (event.kind) {
      'TENANCY_STARTED' => (
        Icons.meeting_room_outlined,
        KiviloColors.pinkDark,
        KiviloColors.pinkSoft,
      ),
      'TENANCY_ENDED' => (
        Icons.door_back_door_outlined,
        KiviloColors.muted,
        KiviloColors.canvas,
      ),
      'CHECK_IN_SIGNED' || 'CHECK_OUT_SIGNED' => (
        Icons.assignment_turned_in_outlined,
        KiviloColors.green,
        KiviloColors.greenSoft,
      ),
      'ASSESSMENT_PUBLISHED' => (
        Icons.fact_check_outlined,
        KiviloColors.green,
        KiviloColors.greenSoft,
      ),
      'PROBLEM_REPORTED' => (
        Icons.flag_outlined,
        KiviloColors.amber,
        KiviloColors.amberSoft,
      ),
      'REPAIRED' => (
        Icons.build_outlined,
        KiviloColors.pinkDark,
        KiviloColors.pinkSoft,
      ),
      'CONFIRMED_FIXED' => (
        Icons.check_circle_outline,
        KiviloColors.green,
        KiviloColors.greenSoft,
      ),
      'NOT_FIXED' => (Icons.replay, KiviloColors.red, KiviloColors.redSoft),
      'COST_AGREED' => (
        Icons.handshake_outlined,
        KiviloColors.pinkDark,
        KiviloColors.pinkSoft,
      ),
      _ => (
        Icons.do_not_disturb_on_outlined,
        KiviloColors.muted,
        KiviloColors.canvas,
      ),
    };
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: background,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 16, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(event.title, style: text.titleSmall),
                  if (event.detail != null) ...[
                    const SizedBox(height: 2),
                    Text(event.detail!, style: text.bodyMedium),
                  ],
                  const SizedBox(height: 2),
                  Text(shortDate(event.at), style: text.bodySmall),
                ],
              ),
            ),
            if (onTap != null)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Icon(Icons.chevron_right, color: KiviloColors.subtle),
              ),
          ],
        ),
      ),
    );
  }
}
