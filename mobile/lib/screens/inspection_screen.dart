import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/inspection.dart';
import '../services/api.dart';
import '../services/capture_queue.dart';
import 'room_screen.dart';
import 'signature_screen.dart';
import 'maintenance_case_screen.dart';

class InspectionScreen extends StatefulWidget {
  const InspectionScreen({super.key, required this.id});
  final String id;

  @override
  State<InspectionScreen> createState() => _InspectionScreenState();
}

class _InspectionScreenState extends State<InspectionScreen> {
  final _api = Api();
  late Future<InspectionDetail> _future = _api.inspection(widget.id);
  bool _busy = false;
  String? _error;

  Future<void> _refresh() async {
    final next = _api.inspection(widget.id);
    setState(() => _future = next);
    await next;
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (mounted) await _refresh();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addRoom() async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add a room'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLength: 80,
          decoration: const InputDecoration(labelText: 'Room name'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Add'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (name != null && name.isNotEmpty) {
      await _run(() async {
        await _api.addRoom(widget.id, name);
      });
    }
  }

  Future<void> _openRoom(RoomSummary room, bool editable) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => RoomScreen(
          inspectionId: widget.id,
          roomId: room.id,
          editable: editable,
        ),
      ),
    );
    if (mounted) await _refresh();
  }

  Future<void> _sendForSignature(InspectionDetail inspection) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final ownerId = Supabase.instance.client.auth.currentUser?.id;
      if (ownerId == null) throw StateError('Sign in again before sending.');
      final queue = CaptureQueue();
      late final ({int captures, int edits}) pending;
      try {
        pending = await queue.pendingForInspection(widget.id, ownerId);
      } finally {
        await queue.close();
      }
      if (!mounted) return;
      if (pending.captures > 0 || pending.edits > 0) {
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Evidence is still syncing'),
            content: Text(
              '${pending.captures} capture(s) and ${pending.edits} '
              'note, mark or deletion edit(s) are saved on this phone. '
              'Open the rooms and tap Retry uploads before sending for signature.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK'),
              ),
            ],
          ),
        );
        return;
      }
      final agreed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Send for signature?'),
          content: Text(
            'All ${inspection.rooms.length} rooms have been reviewed. '
            'Sending freezes the inventory, captions and photo marks. '
            'Review the report with both parties before they sign.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Send'),
            ),
          ],
        ),
      );
      if (agreed == true) {
        await _api.completeReview(widget.id);
        if (mounted) await _refresh();
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sign(String stakeholderId, String name, String role) async {
    final signed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => SignatureScreen(
          inspectionId: widget.id,
          stakeholderId: stakeholderId,
          name: name,
          role: role,
        ),
      ),
    );
    if (signed == true && mounted) await _refresh();
  }

  Future<void> _share(InspectionDetail inspection) async {
    if (inspection.shareToken == null) {
      await _run(() async {
        final url = await _api.share(widget.id);
        await Clipboard.setData(ClipboardData(text: url));
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Report link copied')));
        }
      });
      return;
    }
    final url = inspection.shareUrl!;
    await Clipboard.setData(ClipboardData(text: url));
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Report link copied')));
    }
  }

  Future<void> _revoke() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Revoke report link?'),
        content: const Text('The current link will stop working immediately.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Revoke'),
          ),
        ],
      ),
    );
    if (confirmed == true) await _run(() => _api.revokeShare(widget.id));
  }

  Future<void> _startCheckOut(InspectionDetail inspection) async {
    if (inspection.checkOutId != null) {
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => InspectionScreen(id: inspection.checkOutId!),
        ),
      );
      if (mounted) await _refresh();
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final id = await _api.startCheckOut(widget.id);
      if (!mounted) return;
      await Navigator.of(
        context,
      ).push<void>(MaterialPageRoute(builder: (_) => InspectionScreen(id: id)));
      if (mounted) await _refresh();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<bool> _ensureAiConsent(InspectionDetail inspection) async {
    if (inspection.aiConsentAt != null) return true;
    final consent = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Allow AI drafting?'),
        content: const Text(
          'Kivilo sends this inspection’s room video, audio, photos and details to '
          'Google Gemini to draft inventory. For a check-out comparison, Kivilo '
          'sends the two inventories to Anthropic Claude to draft findings. '
          'A person must review every draft before it is used. Do you agree to '
          'this processing for this inspection?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Not now'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('I agree'),
          ),
        ],
      ),
    );
    if (consent != true) return false;
    try {
      await _api.consentToAiProcessing(widget.id);
      if (mounted) await _refresh();
      return true;
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
      return false;
    }
  }

  Future<void> _runFindings(InspectionDetail inspection) async {
    if (!await _ensureAiConsent(inspection)) return;
    await _run(() => _api.runFindings(widget.id));
  }

  Future<void> _editFinding(
    Finding finding,
    List<Map<String, dynamic>> maintenanceHistory,
  ) async {
    final data = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => FindingEditor(
        finding: finding,
        maintenanceHistory: maintenanceHistory,
      ),
    );
    if (data != null) {
      await _run(() => _api.updateFinding(widget.id, finding.id, data));
    }
  }

  Future<void> _publishFindings() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Publish assessment?'),
        content: const Text(
          'The reviewed findings will be visible as a dated '
          'assessment separate from the signed inventory. Future edits require '
          'publishing a new version.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Publish'),
          ),
        ],
      ),
    );
    if (confirmed == true) await _run(() => _api.publishFindings(widget.id));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Inspection')),
    body: RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<InspectionDetail>(
        future: _future,
        builder: (context, snapshot) {
          if (!snapshot.hasData && !snapshot.hasError) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('Could not load inspection: ${snapshot.error}'),
                ),
              ],
            );
          }
          final inspection = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
            children: [
              if (_api.offlineCopy)
                const Card(
                  child: ListTile(
                    leading: Icon(Icons.cloud_off_outlined),
                    title: Text('Offline copy'),
                    subtitle: Text(
                      'Open a saved room to keep capturing. '
                      'Review and signatures need a connection.',
                    ),
                  ),
                ),
              Text(
                inspection.kind == 'CHECK_IN' ? 'Check-in' : 'Check-out',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              Text(
                inspection.property,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text('${inspection.landlord} and ${inspection.tenant}'),
              const SizedBox(height: 8),
              Chip(label: Text(inspection.status.replaceAll('_', ' '))),
              if (inspection.baselineId != null)
                TextButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) =>
                          InspectionScreen(id: inspection.baselineId!),
                    ),
                  ),
                  child: const Text('View check-in baseline'),
                ),
              if (inspection.summary != null) ...[
                const SizedBox(height: 8),
                Text(inspection.summary!),
              ],
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ],
              if (inspection.maintenanceHistory.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text(
                  'Linked maintenance history',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const Text(
                  'Use this history as context. A person still decides whether it affects a finding.',
                ),
                for (final record in inspection.maintenanceHistory)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.home_repair_service_outlined),
                    title: Text(record['title'] as String),
                    subtitle: Text(
                      '${(record['status'] as String).replaceAll('_', ' ').toLowerCase()} · '
                      '${record['repairAttempts']} repairs · ${record['evidence']} evidence files',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(
                      builder: (_) => MaintenanceCaseScreen(caseId: record['id'] as String),
                    )),
                  ),
              ],
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Rooms',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  if (inspection.isOpen)
                    TextButton.icon(
                      onPressed: _busy ? null : _addRoom,
                      icon: const Icon(Icons.add),
                      label: const Text('Add'),
                    ),
                ],
              ),
              for (final room in inspection.rooms)
                Card(
                  child: ListTile(
                    title: Text(room.name),
                    subtitle: Text(
                      '${room.statusLabel} · ${room.countsLabel}'
                      '${room.newSinceDraft > 0 ? ' · ${room.newSinceDraft} new' : ''}',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => _openRoom(room, inspection.isOpen),
                  ),
                ),
              if (inspection.rooms.isEmpty)
                const Text('Add a room to start the walkthrough.'),
              if (inspection.isOpen && inspection.allRoomsReviewed) ...[
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _busy ? null : () => _sendForSignature(inspection),
                  child: const Text('Send for signature'),
                ),
              ],
              if (inspection.status == 'AWAITING_SIGNATURE' ||
                  inspection.status == 'COMPLETED') ...[
                const SizedBox(height: 24),
                Text(
                  'Signatures',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const Text('Review the agreed inventory with both parties.'),
                _signatureTile(
                  inspection,
                  inspection.landlordId,
                  inspection.landlord,
                  'Landlord',
                ),
                _signatureTile(
                  inspection,
                  inspection.tenantId,
                  inspection.tenant,
                  'Tenant',
                ),
              ],
              if (inspection.status == 'COMPLETED') ...[
                const SizedBox(height: 24),
                Text(
                  'Share report',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const Text(
                  'The link grants read-only access to both parties’ report.',
                ),
                FilledButton.icon(
                  onPressed: _busy ? null : () => _share(inspection),
                  icon: const Icon(Icons.link),
                  label: Text(
                    inspection.shareToken == null
                        ? 'Create report link'
                        : 'Copy report link',
                  ),
                ),
                if (inspection.shareToken != null)
                  TextButton(
                    onPressed: _busy ? null : _revoke,
                    child: const Text('Revoke link'),
                  ),
              ],
              if (inspection.kind == 'CHECK_IN' &&
                  inspection.status == 'COMPLETED') ...[
                const SizedBox(height: 24),
                FilledButton.tonal(
                  onPressed: _busy ? null : () => _startCheckOut(inspection),
                  child: Text(
                    inspection.checkOutId == null
                        ? 'Start check-out'
                        : 'Open check-out',
                  ),
                ),
              ],
              if (inspection.kind == 'CHECK_OUT' &&
                  (inspection.status == 'AWAITING_SIGNATURE' ||
                      inspection.status == 'COMPLETED'))
                _findings(inspection),
              if (_busy) const Center(child: CircularProgressIndicator()),
            ],
          );
        },
      ),
    ),
  );

  Widget _signatureTile(
    InspectionDetail inspection,
    String id,
    String name,
    String role,
  ) {
    final signed = inspection.signedBy(id);
    return ListTile(
      title: Text('$role · $name'),
      subtitle: Text(signed ? 'Signed' : 'Awaiting signature'),
      trailing: signed
          ? const Icon(Icons.check_circle, color: Colors.green)
          : const Icon(Icons.draw_outlined),
      onTap: !signed && inspection.status == 'AWAITING_SIGNATURE' && !_busy
          ? () => _sign(id, name, role)
          : null,
    );
  }

  Widget _findings(InspectionDetail inspection) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const SizedBox(height: 24),
      Text(
        'Check-out assessment',
        style: Theme.of(context).textTheme.titleLarge,
      ),
      const Text(
        'AI drafts are private until reviewed and published. '
        'The signed inventory stays unchanged.',
      ),
      if (inspection.latestAssessment != null)
        Card(
          child: ListTile(
            title: Text(
              'Published version ${inspection.latestAssessment!.version}',
            ),
            subtitle: Text(inspection.latestAssessment!.publishedAt),
            leading: const Icon(Icons.verified_outlined),
          ),
        ),
      if (inspection.findings.isEmpty && inspection.summary == null)
        FilledButton.tonal(
          onPressed: _busy ? null : () => _runFindings(inspection),
          child: const Text('Draft comparison'),
        ),
      if (inspection.findings.isEmpty && inspection.summary != null)
        const Text('The draft comparison found no item changes.'),
      for (final finding in inspection.findings)
        Card(
          child: ListTile(
            title: Text(
              finding.itemLabel ?? finding.baselineLabel ?? finding.changeType,
            ),
            subtitle: Text(
              '${finding.changeType} · ${finding.verdict}\n'
              '${finding.rationale}'
              '${finding.estimatedCost == null ? '' : '\nEstimated cost: SGD ${finding.estimatedCost}'}'
              '${!finding.editedByHuman && finding.confidence != null ? '\nAI draft · ${(finding.confidence! * 100).round()}% confidence' : ''}',
            ),
            isThreeLine: true,
            trailing: const Icon(Icons.edit_outlined),
            onTap: _busy
                ? null
                : () => _editFinding(finding, inspection.maintenanceHistory),
          ),
        ),
      if (inspection.findings.any((finding) => !finding.editedByHuman))
        const Text('Open and confirm each drafted finding before publishing.'),
      if (inspection.assessmentDraftChanged && inspection.status == 'COMPLETED')
        FilledButton(
          onPressed:
              _busy ||
                  inspection.findings.any((finding) => !finding.editedByHuman)
              ? null
              : _publishFindings,
          child: Text(
            inspection.latestAssessment == null
                ? 'Publish reviewed assessment'
                : 'Publish new version',
          ),
        ),
    ],
  );
}

class FindingEditor extends StatefulWidget {
  const FindingEditor({
    super.key,
    required this.finding,
    required this.maintenanceHistory,
  });
  final Finding finding;
  final List<Map<String, dynamic>> maintenanceHistory;

  @override
  State<FindingEditor> createState() => _FindingEditorState();
}

class _FindingEditorState extends State<FindingEditor> {
  late String _verdict = widget.finding.verdict;
  late final _rationale = TextEditingController(text: widget.finding.rationale);
  late final _cost = TextEditingController(text: widget.finding.estimatedCost);
  late String? _maintenanceCaseId = widget.finding.maintenanceCaseId;
  String? _error;

  @override
  void dispose() {
    _rationale.dispose();
    _cost.dispose();
    super.dispose();
  }

  void _save() {
    final cost = _cost.text.trim();
    if (_rationale.text.trim().isEmpty ||
        (cost.isNotEmpty && !RegExp(r'^\d{1,8}(\.\d{1,2})?$').hasMatch(cost))) {
      setState(
        () => _error = 'Enter a rationale and a cost with up to 2 decimals.',
      );
      return;
    }
    Navigator.pop(context, <String, dynamic>{
      'verdict': _verdict,
      'rationale': _rationale.text.trim(),
      'estimatedCost': cost.isEmpty ? null : cost,
      'maintenanceCaseId': _maintenanceCaseId,
    });
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      16,
      16,
      16,
      MediaQuery.viewInsetsOf(context).bottom + 16,
    ),
    child: SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Review finding', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          Text(
            widget.finding.itemLabel ??
                widget.finding.baselineLabel ??
                widget.finding.changeType,
          ),
          DropdownButtonFormField<String>(
            initialValue: _verdict,
            decoration: const InputDecoration(labelText: 'Verdict'),
            items: const [
              DropdownMenuItem(value: 'UNDECIDED', child: Text('Undecided')),
              DropdownMenuItem(
                value: 'TENANT_LIABLE',
                child: Text('Tenant liable'),
              ),
              DropdownMenuItem(value: 'FAIR_WEAR', child: Text('Fair wear')),
              DropdownMenuItem(value: 'DISPUTED', child: Text('Disputed')),
            ],
            onChanged: (value) => setState(() => _verdict = value!),
          ),
          TextField(
            controller: _rationale,
            minLines: 3,
            maxLines: 6,
            decoration: const InputDecoration(labelText: 'Rationale'),
          ),
          DropdownButtonFormField<String>(
            initialValue: _maintenanceCaseId,
            decoration: const InputDecoration(labelText: 'Maintenance evidence'),
            items: [
              const DropdownMenuItem<String>(
                value: null,
                child: Text('No linked maintenance record'),
              ),
              ...widget.maintenanceHistory.map((item) => DropdownMenuItem<String>(
                value: item['id'] as String,
                child: Text(item['title'] as String),
              )),
            ],
            onChanged: (value) => setState(() => _maintenanceCaseId = value),
          ),
          TextField(
            controller: _cost,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Estimated cost (SGD)',
            ),
          ),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _save,
            child: const Text('Save reviewed finding'),
          ),
        ],
      ),
    ),
  );
}
