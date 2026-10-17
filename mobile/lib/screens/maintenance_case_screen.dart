import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_theme.dart';
import 'addenda_screen.dart';
import 'maintenance_evidence_screen.dart';
import 'responsibility_card.dart';
import 'video_screen.dart';
import '../ui/kivilo_layout.dart';

class MaintenanceCaseScreen extends StatefulWidget {
  const MaintenanceCaseScreen({super.key, required this.caseId, this.api});
  final String caseId;
  final Api? api;

  @override
  State<MaintenanceCaseScreen> createState() => _MaintenanceCaseScreenState();
}

class _MaintenanceCaseScreenState extends State<MaintenanceCaseScreen> {
  late final _api = widget.api ?? Api();
  late Future<MaintenanceCaseDetail> _future = _api.maintenanceCase(
    widget.caseId,
  );
  bool _busy = false;
  String? _error;

  Future<void> _refresh() async {
    final next = _api.maintenanceCase(widget.caseId);
    setState(() {
      _future = next;
    });
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
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Prefills a change on the draft update, then opens the draft to finish and publish.
  Future<void> _addToReport(String caseId) async {
    String? inspectionId;
    await _run(() async {
      inspectionId = await _api.addendumFromMaintenanceCase(caseId);
    });
    if (!mounted || _error != null || inspectionId == null) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AddendaScreen(inspectionId: inspectionId!, api: _api),
      ),
    );
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

  Future<void> _addEvidence(
    String caseId,
    String purpose, {
    String? visitId,
  }) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MaintenanceEvidenceScreen(
          caseId: caseId,
          purpose: purpose,
          visitId: visitId,
        ),
      ),
    );
    if (mounted) await _refresh();
  }

  Future<void> _comment(String caseId) async {
    final body = await _ask('Add a comment');
    if (body == null || body.isEmpty) return;
    await _run(() => _api.addMaintenanceComment(caseId, body));
  }

  Future<void> _close(String caseId) async {
    final reason = await _ask(
      'Close without action',
      hint: 'A reason is required. Both sides see it.',
    );
    if (reason == null || reason.isEmpty) return;
    await _run(
      () => _api.updateMaintenanceCase(
        caseId,
        'CLOSED_NO_ACTION',
        resolutionReason: reason,
      ),
    );
  }

  Future<void> _notFixed(String caseId, String visitId) async {
    final note = await _ask('What is still wrong?');
    if (note == null) return;
    await _run(
      () =>
          _api.verifyMaintenanceVisit(caseId, visitId, 'NOT_FIXED', note: note),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Maintenance')),
    body: KiviloContent(maxWidth: 840, child: FutureBuilder<MaintenanceCaseDetail>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) return Center(child: Text(plainError(snapshot.error!)));
        final item = snapshot.data!;
        final text = Theme.of(context).textTheme;
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              _CaseHeader(item: item),
              if (_error != null) ...[
                const SizedBox(height: 16),
                _Notice(
                  icon: Icons.error_outline,
                  color: KiviloColors.red,
                  background: KiviloColors.redSoft,
                  text: _error!,
                ),
              ],
              if (item.priority == 'SAFETY_EMERGENCY') ...[
                const SizedBox(height: 16),
                const _Notice(
                  icon: Icons.emergency_outlined,
                  color: KiviloColors.red,
                  background: KiviloColors.redSoft,
                  text:
                      'If anyone is in danger, call Police 999 or SCDF fire '
                      'and ambulance 995 first.',
                ),
              ],
              const SizedBox(height: 20),
              Card(
                color: KiviloColors.canvas,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('What happened', style: text.titleMedium),
                      const SizedBox(height: 8),
                      Text(item.description, style: text.bodyLarge),
                      const SizedBox(height: 10),
                      Text(
                        'Reported by ${item.reportedBy} on ${shortDate(item.createdAt)}',
                        style: text.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              _repairCard(item),
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
              const SizedBox(height: 28),
              KiviloSectionHeading(
                title: 'Photos',
                subtitle: 'Before and after the repair',
                action: TextButton.icon(
                  onPressed: _busy
                      ? null
                      : () => _addEvidence(item.id, 'BEFORE'),
                  icon: const Icon(Icons.add_a_photo_outlined, size: 18),
                  label: const Text('Add'),
                ),
              ),
              const SizedBox(height: 12),
              if (item.evidence.isEmpty)
                const _Notice(
                  icon: Icons.photo_camera_outlined,
                  color: KiviloColors.subtle,
                  background: KiviloColors.canvas,
                  text:
                      'No photos yet. A photo of the problem now settles '
                      'arguments later.',
                ),
              for (final evidence in item.evidence) ...[
                _EvidenceCard(evidence: evidence),
                const SizedBox(height: 10),
              ],
              const SizedBox(height: 18),
              KiviloSectionHeading(
                title: 'History',
                subtitle: 'Everything on this request',
                action: TextButton.icon(
                  onPressed: _busy ? null : () => _comment(item.id),
                  icon: const Icon(Icons.add_comment_outlined, size: 18),
                  label: const Text('Comment'),
                ),
              ),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                  child: Column(
                    children: [
                      for (final event in item.events.reversed)
                        _HistoryRow(event: event),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    )),
  );

  /// The one thing to do next on the repair itself, for whoever has to do it.
  Widget _repairCard(MaintenanceCaseDetail item) {
    final text = Theme.of(context).textTheme;
    final completed = item.visits
        .where((visit) => visit.completedAt != null)
        .toList();
    final unverified = completed
        .where((visit) => visit.verificationOutcome == null)
        .lastOrNull;
    final open = !['RESOLVED', 'CLOSED_NO_ACTION'].contains(item.status);
    final arranger = item.responsibility.arrangedBy == 'TENANT'
        ? 'the tenant'
        : 'the landlord';
    final subtitle = switch (item.status) {
      'REPORTED' => 'Waiting for the landlord or agent to acknowledge',
      'ACKNOWLEDGED' || 'SCHEDULED' =>
        item.canLogVisit
            ? 'Record the repair once it is done'
            : 'Waiting for $arranger to repair it',
      'AWAITING_CONFIRMATION' =>
        item.canVerify
            ? 'Check the repair and confirm'
            : 'Waiting for the other side to confirm the repair',
      'RESOLVED' => 'Confirmed fixed',
      _ => 'Closed without a repair',
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            KiviloSectionHeading(title: 'Repair', subtitle: subtitle),
            if (item.status == 'CLOSED_NO_ACTION' &&
                item.resolutionReason != null) ...[
              const SizedBox(height: 12),
              Text('“${item.resolutionReason}”', style: text.bodyMedium),
            ],
            for (final visit in completed) ...[
              const SizedBox(height: 12),
              _VisitRow(visit: visit),
            ],
            if (!_busy && item.canManage && item.status == 'REPORTED') ...[
              const SizedBox(height: 14),
              FilledButton(
                onPressed: () => _run(
                  () => _api.updateMaintenanceCase(item.id, 'ACKNOWLEDGED'),
                ),
                child: const Text('Acknowledge report'),
              ),
            ],
            if (!_busy &&
                item.canLogVisit &&
                ['ACKNOWLEDGED', 'SCHEDULED'].contains(item.status)) ...[
              const SizedBox(height: 14),
              FilledButton.icon(
                icon: const Icon(Icons.build_outlined),
                onPressed: () => _recordRepair(item.id),
                label: const Text('Record completed repair'),
              ),
            ],
            if (!_busy && item.canVerify && unverified != null) ...[
              const SizedBox(height: 14),
              Text('Did the repair work?', style: text.titleMedium),
              const SizedBox(height: 10),
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
                      onPressed: () => _notFixed(item.id, unverified.id),
                      child: const Text('Not fixed'),
                    ),
                  ),
                ],
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  icon: const Icon(Icons.add_a_photo_outlined, size: 18),
                  label: const Text('Add an after photo'),
                  onPressed: () =>
                      _addEvidence(item.id, 'AFTER', visitId: unverified.id),
                ),
              ),
            ],
            // A replaced appliance or fixture belongs in the signed check-in as an
            // update, with this repair's before and after photos.
            if (!_busy &&
                item.role == 'AGENT' &&
                item.status == 'RESOLVED') ...[
              const SizedBox(height: 14),
              OutlinedButton.icon(
                icon: const Icon(Icons.fact_check_outlined),
                onPressed: () => _addToReport(item.id),
                label: const Text('Add to the report as an update'),
              ),
            ],
            if (!_busy && item.canManage && open)
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: () => _close(item.id),
                  child: const Text('Close without action'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

const _categoryIcons = {
  'APPLIANCE': Icons.kitchen_outlined,
  'PLUMBING': Icons.water_drop_outlined,
  'LOCKSMITH': Icons.key_outlined,
  'ELECTRICAL': Icons.bolt_outlined,
  'AIR_CONDITIONING': Icons.ac_unit,
  'STRUCTURAL': Icons.foundation_outlined,
  'PEST': Icons.pest_control_outlined,
  'OTHER': Icons.build_outlined,
};

class _CaseHeader extends StatelessWidget {
  const _CaseHeader({required this.item});
  final MaintenanceCaseDetail item;

  @override
  Widget build(BuildContext context) {
    final urgency = switch (item.priority) {
      'URGENT' => ' · URGENT',
      'SAFETY_EMERGENCY' => ' · DANGER',
      _ => '',
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: KiviloColors.pinkSoft,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                _categoryIcons[item.category] ?? Icons.build_outlined,
                color: KiviloColors.pinkDark,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${item.category.replaceAll('_', ' ')}$urgency',
                    style: const TextStyle(
                      color: KiviloColors.pinkDark,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.1,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.title,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            KiviloStatusPill(status: item.status),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                item.property,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({
    required this.icon,
    required this.color,
    required this.background,
    required this.text,
  });
  final IconData icon;
  final Color color;
  final Color background;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: background,
      borderRadius: BorderRadius.circular(14),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Text(text, style: Theme.of(context).textTheme.bodyMedium),
        ),
      ],
    ),
  );
}

class _VisitRow extends StatelessWidget {
  const _VisitRow({required this.visit});
  final MaintenanceVisitModel visit;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    // The header pill already says a repair awaits confirmation, so a row only
    // carries a pill once someone has answered.
    final outcome = switch (visit.verificationOutcome) {
      'FIXED' => ('Fixed', KiviloColors.green, KiviloColors.greenSoft),
      'NOT_FIXED' => ('Not fixed', KiviloColors.red, KiviloColors.redSoft),
      _ => null,
    };
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: KiviloColors.canvas,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: KiviloColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Repaired ${shortDate(visit.completedAt!)}'
                  '${visit.cost == null ? '' : ' · S\$${visit.cost}'}',
                  style: text.titleMedium,
                ),
              ),
              if (outcome case (final label, final color, final background))
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: background,
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    label,
                    style: TextStyle(
                      color: color,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          if (visit.notes != null) ...[
            const SizedBox(height: 4),
            Text(visit.notes!, style: text.bodyMedium),
          ],
          if (visit.verificationNote != null) ...[
            const SizedBox(height: 4),
            Text('“${visit.verificationNote}”', style: text.bodySmall),
          ],
        ],
      ),
    );
  }
}

class _EvidenceCard extends StatelessWidget {
  const _EvidenceCard({required this.evidence});
  final MaintenanceEvidenceModel evidence;

  @override
  Widget build(BuildContext context) {
    final label = switch (evidence.purpose) {
      'BEFORE' => 'Before repair',
      'AFTER' => 'After repair',
      _ => 'Receipt',
    };
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        // Photos and video stay inside the app: the signed URL is a bearer link to
        // someone's home. Only a document the app cannot render leaves it.
        onTap: () => evidence.isImage || evidence.isVideo
            ? Navigator.push<void>(
                context,
                MaterialPageRoute(
                  builder: (_) => evidence.isVideo
                      ? VideoScreen.network(url: evidence.url)
                      : Scaffold(
                          appBar: AppBar(title: Text(label)),
                          backgroundColor: Colors.black,
                          body: Center(
                            child: InteractiveViewer(
                              minScale: 0.8,
                              maxScale: 5,
                              child: Image.network(
                                evidence.url,
                                fit: BoxFit.contain,
                              ),
                            ),
                          ),
                        ),
                ),
              )
            : launchUrl(
                Uri.parse(evidence.url),
                mode: LaunchMode.externalApplication,
              ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (evidence.isImage)
              Container(
                color: KiviloColors.canvas,
                height: 200,
                child: Image.network(
                  evidence.url,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Center(
                    child: Text('Could not load. Pull to refresh the link.'),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        if (evidence.note != null &&
                            evidence.note!.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            evidence.note!,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                        const SizedBox(height: 2),
                        Text(
                          shortDate(evidence.createdAt),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.open_in_new, color: KiviloColors.subtle),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({required this.event});
  final Map<String, dynamic> event;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final metadata = event['metadata'] as Map<String, dynamic>?;
    final summary = metadata?['summary'];
    final (icon, title) = switch (event['kind'] as String) {
      'REPORTED' => (Icons.flag_outlined, 'Reported'),
      'COMMENT' => (Icons.chat_bubble_outline, 'Comment'),
      'STATUS_CHANGED' => (
        Icons.sync_alt,
        maintenanceStatusLabels[metadata?['to']] ?? 'Status changed',
      ),
      'VISIT_RECORDED' => (
        Icons.build_outlined,
        metadata?['completed'] == true ? 'Repair recorded' : 'Repair scheduled',
      ),
      'VERIFICATION' => (Icons.check_circle_outline, 'Confirmed fixed'),
      'REOPENED' => (Icons.replay, 'Reported not fixed'),
      'RESPONSIBILITY_PROPOSED' => (
        Icons.handshake_outlined,
        'Cost proposal: $summary',
      ),
      'RESPONSIBILITY_ACCEPTED' => (Icons.handshake, 'Cost agreed: $summary'),
      'RESPONSIBILITY_REJECTED' => (
        Icons.do_not_disturb_on_outlined,
        'Cost proposal rejected',
      ),
      'RESPONSIBILITY_WITHDRAWN' => (Icons.undo, 'Cost proposal withdrawn'),
      final kind => (Icons.history, kind.replaceAll('_', ' ').toLowerCase()),
    };
    final actor = (event['actor'] as Map<String, dynamic>?)?['name'];
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
              color: KiviloColors.pinkSoft,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 16, color: KiviloColors.pinkDark),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: text.titleSmall),
                if (event['body'] case final String body) ...[
                  const SizedBox(height: 2),
                  Text(body, style: text.bodyMedium),
                ],
                const SizedBox(height: 2),
                Text(
                  [?actor, shortDate(event['createdAt'] as String)].join(' · '),
                  style: text.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
