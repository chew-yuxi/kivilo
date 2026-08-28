import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/inspection.dart';
import '../services/api.dart';
import 'inspection_screen.dart';

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inspections'),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            onPressed: () => Supabase.instance.client.auth.signOut(),
          ),
        ],
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
              return const _Message(
                title: 'Nothing here yet',
                body: 'Start a check-in when you next hand over a unit.',
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: inspections.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final inspection = inspections[index];
                return ListTile(
                  title: Text(inspection.property),
                  subtitle: Text(
                    '${inspection.kindLabel} · ${inspection.tenant}'
                    '${inspection.rooms > 0 ? ' · ${inspection.rooms} rooms' : ''}',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => InspectionScreen(id: inspection.id),
                    ),
                  ),
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
                OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
