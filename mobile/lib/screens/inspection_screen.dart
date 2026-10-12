import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/inspection.dart';
import '../services/api.dart';
import '../services/capture_queue.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';
import 'room_screen.dart';
import 'signature_screen.dart';
import 'maintenance_case_screen.dart';

class InspectionScreen extends StatefulWidget {
  const InspectionScreen({super.key, required this.id, this.api});
  final String id;
  final Api? api;

  @override
  State<InspectionScreen> createState() => _InspectionScreenState();
}

class _InspectionScreenState extends State<InspectionScreen> {
  late final _api = widget.api ?? Api();
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
    final name = await showKiviloDrawer<String>(
      context: context,
      builder: (context) => KiviloDrawer(
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
        await showKiviloDrawer<void>(
          context: context,
          builder: (context) => KiviloDrawer(
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
      final agreed = await showKiviloDrawer<bool>(
        context: context,
        builder: (context) => KiviloDrawer(
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
    final confirmed = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
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

  Future<void> _addFinding(InspectionDetail inspection) async {
    final data = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => FindingEditor(
        maintenanceHistory: inspection.maintenanceHistory,
        checkOutItems: inspection.checkOutItems,
        checkInItems: inspection.checkInItems,
      ),
    );
    if (data != null) {
      await _run(() => _api.createFinding(widget.id, data));
    }
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
    if (data == null) return;
    if (data[FindingEditor.remove] == true) {
      await _run(() => _api.deleteFinding(widget.id, finding.id));
    } else {
      await _run(() => _api.updateFinding(widget.id, finding.id, data));
    }
  }

  /// With no findings, publishing states that no damage was found, so the drawer says
  /// exactly that and the request carries the confirmation the server requires.
  Future<void> _publishFindings(bool noFindings) async {
    final confirmed = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text(
          noFindings ? 'Publish: no damage found?' : 'Publish assessment?',
        ),
        content: Text(
          noFindings
              ? 'No changes are recorded between check-in and check-out. '
                    'Publishing states that you checked and found no damage, '
                    'and both parties see that in the shared report. Future '
                    'edits require publishing a new version.'
              : 'The reviewed findings will be visible as a dated '
                    'assessment separate from the signed inventory. Future '
                    'edits require publishing a new version.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(noFindings ? 'Publish no damage' : 'Publish'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _run(() => _api.publishFindings(widget.id, noFindings: noFindings));
    }
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
          final reviewed = inspection.rooms
              .where((room) => room.status == 'REVIEWED')
              .length;
          final isCheckIn = inspection.kind == 'CHECK_IN';
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 48),
            children: [
              if (_api.offlineCopy) ...[
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
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Offline copy. Open a saved room to keep capturing. Review and signatures need a connection.',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),
              ],
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
                      isCheckIn ? Icons.login_outlined : Icons.logout_outlined,
                      color: KiviloColors.pinkDark,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isCheckIn ? 'CHECK-IN REPORT' : 'CHECK-OUT REPORT',
                          style: const TextStyle(
                            color: KiviloColors.pinkDark,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.1,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          inspection.property,
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
                  KiviloStatusPill(status: inspection.status),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '${inspection.rooms.length} ${inspection.rooms.length == 1 ? 'room' : 'rooms'}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Card(
                color: KiviloColors.canvas,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'People on this report',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      _personRow(
                        Icons.person_outline,
                        'Landlord',
                        inspection.landlord,
                      ),
                      const SizedBox(height: 10),
                      _personRow(
                        Icons.person_outline,
                        'Tenant',
                        inspection.tenant,
                      ),
                    ],
                  ),
                ),
              ),
              if (inspection.isOpen) ...[
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Walkthrough progress',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            ),
                            Text(
                              '$reviewed/${inspection.rooms.length} reviewed',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            minHeight: 7,
                            value: inspection.rooms.isEmpty
                                ? 0
                                : reviewed / inspection.rooms.length,
                            backgroundColor: KiviloColors.border,
                            color: KiviloColors.pink,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          inspection.allRoomsReviewed
                              ? 'Every room is reviewed. The inventory is ready to send.'
                              : 'Capture each room, write and review its inventory, then send the report for signatures.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              if (inspection.baselineId != null) ...[
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) =>
                          InspectionScreen(id: inspection.baselineId!),
                    ),
                  ),
                  icon: const Icon(Icons.compare_arrows_outlined),
                  label: const Text('View check-in baseline'),
                ),
              ],
              if (inspection.summary != null) ...[
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Report summary',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          inspection.summary!,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 16),
                Card(
                  color: KiviloColors.redSoft,
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: KiviloColors.red),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 28),
              KiviloSectionHeading(
                title: 'Rooms',
                subtitle: inspection.rooms.isEmpty
                    ? 'Start with your first room'
                    : 'Evidence and inventory, room by room',
                action: inspection.isOpen
                    ? TextButton.icon(
                        onPressed: _busy ? null : _addRoom,
                        icon: const Icon(Icons.add),
                        label: const Text('Add'),
                      )
                    : null,
              ),
              const SizedBox(height: 12),
              if (inspection.rooms.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 30,
                    ),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.meeting_room_outlined,
                          size: 34,
                          color: KiviloColors.subtle,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'No rooms yet',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Add a room to start the walkthrough.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ),
              for (final room in inspection.rooms) ...[
                _roomCard(room, inspection.isOpen),
                const SizedBox(height: 10),
              ],
              if (inspection.isOpen && inspection.allRoomsReviewed) ...[
                const SizedBox(height: 8),
                Card(
                  color: KiviloColors.pinkSoft,
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Ready for signatures',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 5),
                        Text(
                          'Sending freezes inventory, captions and photo marks for both parties.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 14),
                        FilledButton.icon(
                          onPressed: _busy
                              ? null
                              : () => _sendForSignature(inspection),
                          icon: const Icon(Icons.draw_outlined),
                          label: const Text('Send for signature'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              if (inspection.status == 'AWAITING_SIGNATURE' ||
                  inspection.status == 'COMPLETED') ...[
                const SizedBox(height: 28),
                const KiviloSectionHeading(
                  title: 'Signatures',
                  subtitle: 'The agreed inventory is now fixed for signing.',
                ),
                const SizedBox(height: 12),
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
                const SizedBox(height: 28),
                const KiviloSectionHeading(
                  title: 'Share report',
                  subtitle: 'A private, read-only link for the signed report.',
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            const Icon(
                              Icons.link_outlined,
                              color: KiviloColors.pinkDark,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                inspection.shareToken == null
                                    ? 'No active link'
                                    : 'Report link is active',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        FilledButton.icon(
                          onPressed: _busy ? null : () => _share(inspection),
                          icon: const Icon(Icons.content_copy_outlined),
                          label: Text(
                            inspection.shareToken == null
                                ? 'Create and copy link'
                                : 'Copy report link',
                          ),
                        ),
                        if (inspection.shareToken != null)
                          TextButton(
                            onPressed: _busy ? null : _revoke,
                            child: const Text('Revoke link'),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
              if (inspection.kind == 'CHECK_IN' &&
                  inspection.status == 'COMPLETED') ...[
                const SizedBox(height: 28),
                Card(
                  color: KiviloColors.canvas,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'End of tenancy',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 5),
                        Text(
                          'Use this signed check-in as the baseline for a check-out.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 14),
                        OutlinedButton.icon(
                          onPressed: _busy
                              ? null
                              : () => _startCheckOut(inspection),
                          icon: const Icon(Icons.compare_arrows_outlined),
                          label: Text(
                            inspection.checkOutId == null
                                ? 'Start check-out'
                                : 'Open check-out',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              if (inspection.kind == 'CHECK_OUT' &&
                  (inspection.status == 'AWAITING_SIGNATURE' ||
                      inspection.status == 'COMPLETED'))
                _findings(inspection),
              if (inspection.maintenanceHistory.isNotEmpty) ...[
                const SizedBox(height: 28),
                const KiviloSectionHeading(
                  title: 'Maintenance history',
                  subtitle:
                      'Context for review. A person decides whether it affects a finding.',
                ),
                const SizedBox(height: 12),
                if (inspection.kind == 'CHECK_OUT')
                  ?_unsettledCosts(inspection.maintenanceHistory),
                for (final record in inspection.maintenanceHistory) ...[
                  Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 4,
                      ),
                      leading: Icon(
                        Icons.home_repair_service_outlined,
                        color: _costOpen(record)
                            ? KiviloColors.amber
                            : KiviloColors.pinkDark,
                      ),
                      title: Text(record['title'] as String),
                      subtitle: Text(
                        '${maintenanceStatusLabels[record['status']]} · '
                        '${record['repairAttempts']} ${record['repairAttempts'] == 1 ? 'repair' : 'repairs'} · '
                        '${record['evidence']} evidence ${record['evidence'] == 1 ? 'file' : 'files'}'
                        '${_costLine(record)}',
                      ),
                      trailing: const Icon(
                        Icons.chevron_right,
                        color: KiviloColors.subtle,
                      ),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => MaintenanceCaseScreen(
                            caseId: record['id'] as String,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
              if (_busy) const Center(child: CircularProgressIndicator()),
            ],
          );
        },
      ),
    ),
  );

  bool _costOpen(Map<String, dynamic> record) => const [
    'PENDING',
    'DISPUTED',
    'NOT_PROPOSED',
  ].contains(record['costStanding']);

  String _costLine(Map<String, dynamic> record) =>
      switch (record['costStanding']) {
        'AGREED' => '\nCost agreed: ${record['costAgreement']}',
        'PENDING' => '\nCost proposal waiting for an answer',
        'DISPUTED' => '\nCost disputed',
        'NOT_PROPOSED' => '\nNobody has proposed who pays',
        _ => '',
      };

  /// At check-out the deposit is decided, so a repair whose cost nobody agreed is
  /// the argument about to happen. Shown, never resolved, here.
  Widget? _unsettledCosts(List<Map<String, dynamic>> history) {
    final open = history.where(_costOpen).length;
    if (open == 0) return null;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: KiviloColors.amberSoft,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.handshake_outlined, color: KiviloColors.amber),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  open == 1
                      ? '1 repair has no agreed cost'
                      : '$open repairs have no agreed cost',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'Settle who pays on each one before the deposit is decided, '
                  'or link it to a finding so the decision is made there.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _personRow(IconData icon, String role, String name) => Row(
    children: [
      Icon(icon, size: 18, color: KiviloColors.muted),
      const SizedBox(width: 10),
      SizedBox(
        width: 74,
        child: Text(role, style: Theme.of(context).textTheme.bodySmall),
      ),
      Expanded(
        child: Text(name, style: Theme.of(context).textTheme.bodyMedium),
      ),
    ],
  );

  Widget _roomCard(RoomSummary room, bool editable) => Card(
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => _openRoom(room, editable),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: room.status == 'REVIEWED'
                    ? KiviloColors.greenSoft
                    : KiviloColors.pinkSoft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                room.status == 'REVIEWED'
                    ? Icons.check_rounded
                    : Icons.meeting_room_outlined,
                color: room.status == 'REVIEWED'
                    ? KiviloColors.green
                    : KiviloColors.pinkDark,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    room.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 7),
                  KiviloStatusPill(status: room.status),
                  const SizedBox(height: 8),
                  Text(
                    room.countsLabel,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: KiviloColors.subtle),
          ],
        ),
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
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 5,
          ),
          leading: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: signed ? KiviloColors.greenSoft : KiviloColors.amberSoft,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              signed ? Icons.check_rounded : Icons.draw_outlined,
              color: signed ? KiviloColors.green : KiviloColors.amber,
            ),
          ),
          title: Text(name, style: Theme.of(context).textTheme.titleMedium),
          subtitle: Text('$role · ${signed ? 'Signed' : 'Awaiting signature'}'),
          trailing: signed
              ? null
              : const Icon(Icons.chevron_right, color: KiviloColors.subtle),
          onTap: !signed && inspection.status == 'AWAITING_SIGNATURE' && !_busy
              ? () => _sign(id, name, role)
              : null,
        ),
      ),
    );
  }

  Widget _findings(InspectionDetail inspection) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const SizedBox(height: 28),
      const KiviloSectionHeading(
        title: 'Check-out assessment',
        subtitle: 'A separate, dated record of changes and responsibility.',
      ),
      const SizedBox(height: 12),
      Card(
        color: KiviloColors.canvas,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.info_outline,
                size: 20,
                color: KiviloColors.muted,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Record each change since check-in. Findings stay private until you publish them, and the signed inventory does not change.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            ],
          ),
        ),
      ),
      if (inspection.latestAssessment != null) ...[
        const SizedBox(height: 12),
        Card(
          color: KiviloColors.greenSoft,
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 4,
            ),
            title: Text(
              'Published version ${inspection.latestAssessment!.version}',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            subtitle: Text(inspection.latestAssessment!.publishedAt),
            leading: const Icon(
              Icons.verified_outlined,
              color: KiviloColors.green,
            ),
          ),
        ),
      ],
      const SizedBox(height: 20),
      KiviloSectionHeading(
        title: 'Findings',
        subtitle: inspection.findings.isEmpty
            ? 'No changes recorded yet'
            : '${inspection.findings.length} ${inspection.findings.length == 1 ? 'change' : 'changes'} recorded',
        action: inspection.status == 'COMPLETED'
            ? TextButton.icon(
                onPressed: _busy ? null : () => _addFinding(inspection),
                icon: const Icon(Icons.add),
                label: const Text('Add'),
              )
            : null,
      ),
      const SizedBox(height: 12),
      for (final finding in inspection.findings) ...[
        Card(
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: _busy
                ? null
                : () => _editFinding(finding, inspection.maintenanceHistory),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          finding.itemLabel ??
                              finding.baselineLabel ??
                              finding.changeType,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(
                        Icons.chevron_right,
                        color: KiviloColors.subtle,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      _findingTag(finding.changeType.replaceAll('_', ' ')),
                      _findingTag(finding.verdict.replaceAll('_', ' ')),
                      // Drafted by the old AI comparison, not yet confirmed.
                      if (!finding.editedByHuman)
                        _findingTag(
                          'Unconfirmed',
                          tint: KiviloColors.pinkSoft,
                          color: KiviloColors.pinkDark,
                        ),
                    ],
                  ),
                  const SizedBox(height: 11),
                  Text(
                    finding.rationale,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  if (finding.estimatedCost != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Estimated cost · SGD ${finding.estimatedCost}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
      ],
      if (inspection.findings.any((finding) => !finding.editedByHuman)) ...[
        const SizedBox(height: 4),
        Text(
          'Open and confirm each unconfirmed finding before publishing.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
      if (inspection.assessmentDraftChanged &&
          inspection.status == 'COMPLETED') ...[
        const SizedBox(height: 14),
        FilledButton.icon(
          onPressed:
              _busy ||
                  inspection.findings.any((finding) => !finding.editedByHuman)
              ? null
              : () => _publishFindings(inspection.findings.isEmpty),
          icon: const Icon(Icons.publish_outlined),
          label: Text(
            inspection.findings.isEmpty
                ? 'Publish: no damage found'
                : inspection.latestAssessment == null
                ? 'Publish assessment'
                : 'Publish new version',
          ),
        ),
      ],
    ],
  );

  Widget _findingTag(
    String text, {
    Color tint = KiviloColors.canvas,
    Color color = KiviloColors.muted,
  }) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
    decoration: BoxDecoration(
      color: tint,
      borderRadius: BorderRadius.circular(8),
    ),
    child: Text(
      text,
      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
    ),
  );
}

/// Writes a new finding, or reviews an existing one. A new finding is written against
/// an item from either report: the check-out for anything still there, the check-in for
/// anything now missing.
class FindingEditor extends StatefulWidget {
  const FindingEditor({
    super.key,
    this.finding,
    required this.maintenanceHistory,
    this.checkOutItems = const [],
    this.checkInItems = const [],
  });
  final Finding? finding;
  final List<Map<String, dynamic>> maintenanceHistory;
  final List<ComparableItem> checkOutItems;
  final List<ComparableItem> checkInItems;

  /// Key of the result that asks for the finding to be removed rather than saved.
  static const remove = 'remove';

  @override
  State<FindingEditor> createState() => _FindingEditorState();
}

class _FindingEditorState extends State<FindingEditor> {
  /// `out:<id>` or `in:<id>`, so one picker can offer both reports.
  String? _item;
  late String _changeType = widget.finding?.changeType ?? 'DAMAGE';
  late String _verdict = widget.finding?.verdict ?? 'UNDECIDED';
  late final _rationale = TextEditingController(
    text: widget.finding?.rationale,
  );
  late final _cost = TextEditingController(text: widget.finding?.estimatedCost);
  late String? _maintenanceCaseId = widget.finding?.maintenanceCaseId;
  String? _error;

  @override
  void dispose() {
    _rationale.dispose();
    _cost.dispose();
    super.dispose();
  }

  void _save() {
    final cost = _cost.text.trim();
    if ((widget.finding == null && _item == null) ||
        _rationale.text.trim().isEmpty ||
        (cost.isNotEmpty && !RegExp(r'^\d{1,8}(\.\d{1,2})?$').hasMatch(cost))) {
      setState(
        () => _error =
            'Choose an item, enter a rationale and a cost with up to 2 decimals.',
      );
      return;
    }
    final fields = <String, dynamic>{
      'changeType': _changeType,
      'verdict': _verdict,
      'rationale': _rationale.text.trim(),
      'estimatedCost': cost.isEmpty ? null : cost,
    };
    if (widget.finding == null) {
      final [side, id] = _item!.split(':');
      Navigator.pop(context, <String, dynamic>{
        'itemId': side == 'out' ? id : null,
        'baselineItemId': side == 'in' ? id : null,
        ...fields,
      });
    } else {
      Navigator.pop(context, <String, dynamic>{
        ...fields,
        'maintenanceCaseId': _maintenanceCaseId,
      });
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      20,
      12,
      20,
      MediaQuery.viewInsetsOf(context).bottom + 24,
    ),
    child: SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 34,
              height: 4,
              decoration: BoxDecoration(
                color: KiviloColors.border,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            widget.finding == null ? 'Add finding' : 'Review finding',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 4),
          if (widget.finding != null)
            Text(
              widget.finding!.itemLabel ??
                  widget.finding!.baselineLabel ??
                  widget.finding!.changeType,
              style: Theme.of(context).textTheme.bodyMedium,
            )
          else ...[
            const SizedBox(height: 16),
            KiviloSelectField<String?>(
              label: 'Item',
              value: _item,
              options: [
                const KiviloSelectOption<String?>(
                  value: null,
                  label: 'Choose an item',
                ),
                for (final item in widget.checkOutItems)
                  KiviloSelectOption<String?>(
                    value: 'out:${item.id}',
                    label: item.label,
                  ),
                for (final item in widget.checkInItems)
                  KiviloSelectOption<String?>(
                    value: 'in:${item.id}',
                    label: '${item.label} (at check-in)',
                  ),
              ],
              onChanged: (value) => setState(() => _item = value),
            ),
          ],
          const SizedBox(height: 20),
          KiviloSelectField<String>(
            label: 'Change',
            value: _changeType,
            options: const [
              KiviloSelectOption(value: 'DAMAGE', label: 'Damage'),
              KiviloSelectOption(value: 'WEAR', label: 'Wear'),
              KiviloSelectOption(value: 'MISSING', label: 'Missing'),
              KiviloSelectOption(value: 'IMPROVED', label: 'Improved'),
              KiviloSelectOption(value: 'UNCHANGED', label: 'Unchanged'),
            ],
            onChanged: (value) => setState(() => _changeType = value),
          ),
          const SizedBox(height: 12),
          KiviloSelectField<String>(
            label: 'Verdict',
            value: _verdict,
            options: const [
              KiviloSelectOption(value: 'UNDECIDED', label: 'Undecided'),
              KiviloSelectOption(
                value: 'TENANT_LIABLE',
                label: 'Tenant liable',
              ),
              KiviloSelectOption(value: 'FAIR_WEAR', label: 'Fair wear'),
              KiviloSelectOption(value: 'DISPUTED', label: 'Disputed'),
            ],
            onChanged: (value) => setState(() => _verdict = value),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _rationale,
            minLines: 3,
            maxLines: 6,
            decoration: const InputDecoration(labelText: 'Rationale'),
          ),
          if (widget.finding != null) ...[
            const SizedBox(height: 12),
            KiviloSelectField<String?>(
              label: 'Maintenance evidence',
              value: _maintenanceCaseId,
              options: [
                const KiviloSelectOption<String?>(
                  value: null,
                  label: 'No linked maintenance record',
                ),
                ...widget.maintenanceHistory.map(
                  (item) => KiviloSelectOption<String?>(
                    value: item['id'] as String,
                    label: item['title'] as String,
                  ),
                ),
              ],
              onChanged: (value) => setState(() => _maintenanceCaseId = value),
            ),
          ],
          const SizedBox(height: 12),
          TextField(
            controller: _cost,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Estimated cost (SGD)',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: KiviloColors.red)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _save,
            child: Text(
              widget.finding == null ? 'Add finding' : 'Save reviewed finding',
            ),
          ),
          if (widget.finding != null) ...[
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.pop(context, <String, dynamic>{
                FindingEditor.remove: true,
              }),
              child: const Text('Remove finding'),
            ),
          ],
        ],
      ),
    ),
  );
}
