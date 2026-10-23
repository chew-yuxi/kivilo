import 'package:flutter/material.dart';

import '../models/property_history.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/page_context_title.dart';

/// Every change and deletion at one address, with who made it. Deleted rooms, lines,
/// photos and findings stay restorable for 30 days; the server decides what this viewer
/// may see and restore, and the screen only lays it out.
class PropertyHistoryScreen extends StatefulWidget {
  const PropertyHistoryScreen({super.key, required this.propertyId, this.api});
  final String propertyId;
  final Api? api;

  @override
  State<PropertyHistoryScreen> createState() => _PropertyHistoryScreenState();
}

class _PropertyHistoryScreenState extends State<PropertyHistoryScreen> {
  late final _api = widget.api ?? Api();
  bool _deletions = false;
  late Future<PropertyHistory> _future = _load();
  String? _restoring;

  Future<PropertyHistory> _load() =>
      _api.propertyHistory(widget.propertyId, deletions: _deletions);

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _future = next;
    });
    await next;
  }

  Future<void> _restore(HistoryEvent event) async {
    setState(() => _restoring = event.bin!.id);
    try {
      await _api.restoreFromBin(event.bin!.id);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Restored.')));
      await _refresh();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    } finally {
      if (mounted) setState(() => _restoring = null);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      centerTitle: false,
      toolbarHeight: 72,
      title: FutureBuilder<PropertyHistory>(
        future: _future,
        builder: (context, snapshot) => PageContextTitle(
          title: 'History',
          contextLabel: snapshot.data?.address ?? 'Property',
        ),
      ),
    ),
    body: KiviloContent(
      maxWidth: 840,
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<PropertyHistory>(
          future: _future,
          builder: (context, snapshot) {
            final text = Theme.of(context).textTheme;
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                Text(
                  'Every change and deletion, with who made it. Deleted rooms, '
                  'lines, photos and findings can be restored for 30 days.',
                  style: text.bodyMedium,
                ),
                const SizedBox(height: 16),
                KiviloSegmentedControl<bool>(
                  value: _deletions,
                  options: const [
                    KiviloSegmentOption(value: false, label: 'All changes'),
                    KiviloSegmentOption(value: true, label: 'Deletions'),
                  ],
                  onChanged: (value) {
                    _deletions = value!;
                    _refresh();
                  },
                ),
                if (_api.offlineCopy) ...[
                  const SizedBox(height: 12),
                  const Text('Offline. Showing previously loaded history.'),
                ],
                ..._body(context, snapshot),
                const SizedBox(height: 24),
                Text(
                  'History is recorded from 23 October 2026.',
                  textAlign: TextAlign.center,
                  style: text.bodySmall,
                ),
              ],
            );
          },
        ),
      ),
    ),
  );

  List<Widget> _body(
    BuildContext context,
    AsyncSnapshot<PropertyHistory> snapshot,
  ) {
    final text = Theme.of(context).textTheme;
    if (snapshot.connectionState == ConnectionState.waiting) {
      return const [
        SizedBox(height: 48),
        Center(child: CircularProgressIndicator()),
      ];
    }
    if (snapshot.hasError) {
      return [
        const SizedBox(height: 24),
        Text(plainError(snapshot.error!), textAlign: TextAlign.center),
      ];
    }
    final events = snapshot.data!.events;
    if (events.isEmpty) {
      return [
        const SizedBox(height: 24),
        Card(
          color: KiviloColors.canvas,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              _deletions
                  ? 'Nothing has been deleted.'
                  : 'No changes recorded yet.',
              textAlign: TextAlign.center,
              style: text.bodyMedium,
            ),
          ),
        ),
      ];
    }
    final days = <String, List<HistoryEvent>>{};
    for (final event in events) {
      days
          .putIfAbsent(shortDate(event.at.toIso8601String()), () => [])
          .add(event);
    }
    return [
      for (final MapEntry(key: day, value: dayEvents) in days.entries) ...[
        const SizedBox(height: 24),
        Text(day, style: text.titleMedium),
        const SizedBox(height: 10),
        Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              for (var index = 0; index < dayEvents.length; index++) ...[
                if (index > 0) const Divider(height: 1),
                _row(context, dayEvents[index]),
              ],
            ],
          ),
        ),
      ],
    ];
  }

  Widget _row(BuildContext context, HistoryEvent event) {
    final text = Theme.of(context).textTheme;
    final local = event.at.toLocal();
    final time =
        '${local.hour % 12 == 0 ? 12 : local.hour % 12}:${local.minute.toString().padLeft(2, '0')}${local.hour < 12 ? 'am' : 'pm'}';
    final bin = event.bin;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                event.isDeletion ? Icons.delete_outline : Icons.history,
                color: event.isDeletion ? KiviloColors.red : KiviloColors.muted,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: event.actorName,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      TextSpan(text: ' ${event.summary}'),
                      TextSpan(
                        text: ' · $time',
                        style: const TextStyle(color: KiviloColors.muted),
                      ),
                    ],
                  ),
                  style: text.bodyMedium,
                ),
              ),
            ],
          ),
          for (final change in event.changes)
            Padding(
              padding: const EdgeInsets.only(left: 36, top: 6),
              child: Text(
                '${change.field}: ${change.from ?? 'empty'} → ${change.to ?? 'empty'}',
                style: text.bodySmall,
              ),
            ),
          if (bin != null && bin.restoredAt != null)
            Padding(
              padding: const EdgeInsets.only(left: 36, top: 8),
              child: Text('Restored', style: text.bodySmall),
            )
          else if (bin != null && bin.restorable)
            Padding(
              padding: const EdgeInsets.only(left: 36, top: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'In the bin until ${shortDate(bin.expiresAt.toIso8601String())}',
                    style: text.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                    onPressed: _restoring == null
                        ? () => _restore(event)
                        : null,
                    icon: const Icon(Icons.replay),
                    label: Text(
                      _restoring == bin.id ? 'Restoring…' : 'Restore',
                    ),
                  ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
