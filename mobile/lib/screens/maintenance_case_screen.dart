import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import 'maintenance_evidence_screen.dart';
import 'responsibility_card.dart';

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

  Future<void> _recordRepair(String caseId) async {
    final notes = TextEditingController();
    final cost = TextEditingController();
    final saved = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDrawerState) {
          final amount = cost.text.trim();
          final valid =
              amount.isEmpty || RegExp(r'^\d+(?:\.\d{1,2})?$').hasMatch(amount);
          return KiviloDrawer(
            title: const Text('Record completed repair'),
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: notes,
                  autofocus: true,
                  minLines: 2,
                  maxLines: 5,
                  decoration: const InputDecoration(
                    labelText: 'What was repaired?',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: cost,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    labelText: 'Cost (optional)',
                    prefixText: 'S\$ ',
                    helperText: 'Used to split the cost as agreed',
                    errorText: valid
                        ? null
                        : 'Enter an amount like 150 or 150.50',
                  ),
                  onChanged: (_) => setDrawerState(() {}),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: valid ? () => Navigator.pop(context, true) : null,
                child: const Text('Save'),
              ),
            ],
          );
        },
      ),
    );
    if (saved == true) {
      final note = notes.text.trim();
      final amount = cost.text.trim();
      await _run(() async {
        await _api.addMaintenanceVisit(
          caseId,
          completedAt: DateTime.now(),
          notes: note.isEmpty ? null : note,
          cost: amount.isEmpty ? null : amount,
        );
      });
    }
    notes.dispose();
    cost.dispose();
  }

  String _eventTitle(Map<String, dynamic> event) {
    final summary = (event['metadata'] as Map<String, dynamic>?)?['summary'];
    return switch (event['kind'] as String) {
      'RESPONSIBILITY_PROPOSED' => 'Cost proposal: $summary',
      'RESPONSIBILITY_ACCEPTED' => 'Cost agreed: $summary',
      'RESPONSIBILITY_REJECTED' => 'Cost proposal rejected',
      'RESPONSIBILITY_WITHDRAWN' => 'Cost proposal withdrawn',
      final kind => kind.replaceAll('_', ' ').toLowerCase(),
    };
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
              const SizedBox(height: 16),
              ResponsibilityCard(
                responsibility: item.responsibility,
                role: item.role,
                busy: _busy,
                onPropose: (body) =>
                    _run(() => _api.proposeResponsibility(item.id, body)),
                onAnswer: (proposalId, decision, note) => _run(
                  () => _api.answerResponsibility(
                    item.id,
                    proposalId,
                    decision,
                    note: note,
                  ),
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
              if (!_busy) ...[
                const SizedBox(height: 16),
                if (item.canManage && item.status == 'REPORTED')
                  FilledButton(
                    onPressed: () => _run(
                      () => _api.updateMaintenanceCase(item.id, 'ACKNOWLEDGED'),
                    ),
                    child: const Text('Acknowledge report'),
                  ),
                if (item.canLogVisit &&
                    ['ACKNOWLEDGED', 'SCHEDULED'].contains(item.status))
                  FilledButton.icon(
                    icon: const Icon(Icons.build_outlined),
                    onPressed: () => _recordRepair(item.id),
                    label: const Text('Record completed repair'),
                  ),
                if (item.canManage &&
                    !['RESOLVED', 'CLOSED_NO_ACTION'].contains(item.status))
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
                  title: Text(_eventTitle(event)),
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
