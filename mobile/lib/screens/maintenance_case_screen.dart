import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import 'maintenance_evidence_screen.dart';

class MaintenanceCaseScreen extends StatefulWidget {
  const MaintenanceCaseScreen({super.key, required this.caseId});
  final String caseId;

  @override
  State<MaintenanceCaseScreen> createState() => _MaintenanceCaseScreenState();
}

class _MaintenanceCaseScreenState extends State<MaintenanceCaseScreen> {
  final _api = Api();
  late Future<MaintenanceCaseDetail> _future = _api.maintenanceCase(
    widget.caseId,
  );
  bool _busy = false;
  String? _error;

  Future<void> _refresh() async {
    final next = _api.maintenanceCase(widget.caseId);
    setState(() => _future = next);
    await next;
  }

  Future<void> _run(Future<void> Function() operation) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await operation();
      await _refresh();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<String?> _ask(String title, {String? hint}) async {
    final controller = TextEditingController();
    final result = await showKiviloDrawer<String>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text(title),
        content: TextField(
          controller: controller,
          autofocus: true,
          minLines: 2,
          maxLines: 5,
          decoration: InputDecoration(hintText: hint),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();
    return result;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Maintenance')),
    body: FutureBuilder<MaintenanceCaseDetail>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) return Center(child: Text('${snapshot.error}'));
        final item = snapshot.data!;
        final unverifiedVisits = item.visits
            .where(
              (visit) =>
                  visit.completedAt != null &&
                  visit.verificationOutcome == null,
            )
            .toList();
        final unverified = unverifiedVisits.isEmpty
            ? null
            : unverifiedVisits.last;
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                item.title,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 4),
              Text(
                '${item.property} · ${item.status.replaceAll('_', ' ').toLowerCase()}',
              ),
              const SizedBox(height: 16),
              Text(item.description),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                icon: const Icon(Icons.add_a_photo_outlined),
                label: const Text('Add before evidence'),
                onPressed: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => MaintenanceEvidenceScreen(
                        caseId: item.id,
                        purpose: 'BEFORE',
                      ),
                    ),
                  );
                  if (mounted) await _refresh();
                },
              ),
              if (item.priority == 'SAFETY_EMERGENCY')
                const Card(
                  child: ListTile(
                    leading: Icon(Icons.emergency_outlined),
                    title: Text('Emergency contacts'),
                    subtitle: Text('Police 999 · Fire or ambulance 995'),
                  ),
                ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    _error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ),
              if (item.evidence.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text(
                  'Before and after evidence',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                for (final evidence in item.evidence)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            evidence.purpose == 'BEFORE'
                                ? 'Before repair'
                                : 'After repair',
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          if (evidence.isImage) ...[
                            const SizedBox(height: 8),
                            Image.network(
                              evidence.url,
                              height: 180,
                              width: double.infinity,
                              fit: BoxFit.contain,
                              errorBuilder: (_, _, _) => const Text(
                                'Could not load this image. Pull to refresh its link.',
                              ),
                            ),
                          ],
                          if (evidence.note != null &&
                              evidence.note!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(evidence.note!),
                            ),
                          TextButton.icon(
                            icon: const Icon(Icons.open_in_new),
                            label: Text(
                              evidence.isImage
                                  ? 'Open full photo'
                                  : 'Open evidence',
                            ),
                            onPressed: () => launchUrl(
                              Uri.parse(evidence.url),
                              mode: LaunchMode.externalApplication,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
              if (item.canManage && !_busy) ...[
                const SizedBox(height: 16),
                if (item.status == 'REPORTED')
                  FilledButton(
                    onPressed: () => _run(
                      () => _api.updateMaintenanceCase(item.id, 'ACKNOWLEDGED'),
                    ),
                    child: const Text('Acknowledge report'),
                  ),
                if (['ACKNOWLEDGED', 'SCHEDULED'].contains(item.status))
                  FilledButton.icon(
                    icon: const Icon(Icons.build_outlined),
                    onPressed: () async {
                      final note = await _ask(
                        'Record completed repair',
                        hint: 'What was repaired?',
                      );
                      if (note == null) return;
                      await _run(() async {
                        await _api.addMaintenanceVisit(
                          item.id,
                          completedAt: DateTime.now(),
                          notes: note.isEmpty ? null : note,
                        );
                      });
                    },
                    label: const Text('Record completed repair'),
                  ),
                if (!['RESOLVED', 'CLOSED_NO_ACTION'].contains(item.status))
                  TextButton(
                    onPressed: () async {
                      final reason = await _ask(
                        'Close without action',
                        hint: 'A reason is required',
                      );
                      if (reason == null || reason.isEmpty) return;
                      await _run(
                        () => _api.updateMaintenanceCase(
                          item.id,
                          'CLOSED_NO_ACTION',
                          resolutionReason: reason,
                        ),
                      );
                    },
                    child: const Text('Close without action'),
                  ),
              ],
              if (item.canVerify && unverified != null && !_busy) ...[
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  icon: const Icon(Icons.add_a_photo_outlined),
                  label: const Text('Add after evidence'),
                  onPressed: () async {
                    await Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => MaintenanceEvidenceScreen(
                          caseId: item.id,
                          purpose: 'AFTER',
                          visitId: unverified.id,
                        ),
                      ),
                    );
                    if (mounted) await _refresh();
                  },
                ),
                Text(
                  'Did the repair work?',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton(
                        onPressed: () => _run(
                          () => _api.verifyMaintenanceVisit(
                            item.id,
                            unverified.id,
                            'FIXED',
                          ),
                        ),
                        child: const Text('Fixed'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          final note = await _ask('What is still wrong?');
                          if (note == null) return;
                          await _run(
                            () => _api.verifyMaintenanceVisit(
                              item.id,
                              unverified.id,
                              'NOT_FIXED',
                              note: note,
                            ),
                          );
                        },
                        child: const Text('Not fixed'),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Timeline',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  IconButton(
                    tooltip: 'Add comment',
                    icon: const Icon(Icons.add_comment_outlined),
                    onPressed: _busy
                        ? null
                        : () async {
                            final body = await _ask('Add comment');
                            if (body == null || body.isEmpty) return;
                            await _run(
                              () => _api.addMaintenanceComment(item.id, body),
                            );
                          },
                  ),
                ],
              ),
              for (final event in item.events.reversed)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.history),
                  title: Text(
                    (event['kind'] as String)
                        .replaceAll('_', ' ')
                        .toLowerCase(),
                  ),
                  subtitle: event['body'] == null
                      ? null
                      : Text(event['body'] as String),
                ),
            ],
          ),
        );
      },
    ),
  );
}
