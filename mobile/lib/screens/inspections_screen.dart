import 'package:flutter/material.dart';

import '../models/inspection.dart';
import '../services/api.dart';
import 'inspection_screen.dart';
import 'new_inspection_screen.dart';
import 'settings_screen.dart';

class InspectionsScreen extends StatefulWidget {
  const InspectionsScreen({super.key});

  @override
  State<InspectionsScreen> createState() => _InspectionsScreenState();
}

class _InspectionsScreenState extends State<InspectionsScreen> {
  final _api = Api();
  late Future<List<InspectionSummary>> _future = _api.inspections();

  Future<void> _refresh() async {
    final next = _api.inspections();
    setState(() => _future = next);
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
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inspections'),
        actions: [
          IconButton(
            tooltip: 'Settings',
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const SettingsScreen()),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        icon: const Icon(Icons.add),
        label: const Text('New check-in'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<InspectionSummary>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _Message(
                title: 'Could not load your inspections',
                body: '${snapshot.error}',
                onRetry: _refresh,
              );
            }
            final inspections = snapshot.data ?? [];
            if (inspections.isEmpty) {
              return _Message(
                title: 'Nothing here yet',
                body: _api.offlineCopy
                    ? 'This is your last saved list. Connect to create a check-in.'
                    : 'Start a check-in when you next hand over a unit.',
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: inspections.length + (_api.offlineCopy ? 1 : 0),
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, index) {
                if (_api.offlineCopy && index == 0) {
                  return const ListTile(
                    leading: Icon(Icons.cloud_off_outlined),
                    title: Text('Offline copy'),
                    subtitle: Text(
                      'Changes need a connection. Saved captures can continue.',
                    ),
                  );
                }
                final offset = _api.offlineCopy ? 1 : 0;
                final inspection = inspections[index - offset];
                return ListTile(
                  title: Text(inspection.property),
                  subtitle: Text(
                    '${inspection.kindLabel} · ${inspection.tenant}'
                    '${inspection.rooms > 0 ? ' · ${inspection.rooms} rooms' : ''}',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _openInspection(inspection.id),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.title, required this.body, this.onRetry});

  final String title;
  final String body;
  final Future<void> Function()? onRetry;

  @override
  Widget build(BuildContext context) {
    // Inside a ListView so pull to refresh still works when there is nothing to show,
    // which is exactly when an inspector wants to retry.
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(32, 80, 32, 32),
          child: Column(
            children: [
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(body, textAlign: TextAlign.center),
              if (onRetry != null) ...[
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: onRetry,
                  child: const Text('Try again'),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
