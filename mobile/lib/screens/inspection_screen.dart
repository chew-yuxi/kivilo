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

  Future<bool> _ensureAiConsent(InspectionDetail inspection) async {
    if (inspection.aiConsentAt != null) return true;
    final consent = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: const Text('Allow AI drafting?'),
        content: const Text(
          'Kivilo sends this inspection’s room video, audio, photos and details to '
          'Google Gemini to draft inventory. For a check-out comparison, Kivilo '
          'also sends the reviewed check-in and check-out inventories and tenancy '
          'length to Gemini '
          'to draft findings. '
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
    final confirmed = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
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
                              : 'Capture each room, review its draft, then send the report for signatures.',
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
                for (final record in inspection.maintenanceHistory) ...[
                  Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                      ),
                      leading: const Icon(
                        Icons.home_repair_service_outlined,
                        color: KiviloColors.pinkDark,
                      ),
                      title: Text(record['title'] as String),
                      subtitle: Text(
                        '${(record['status'] as String).replaceAll('_', ' ').toLowerCase()} · '
                        '${record['repairAttempts']} repairs · ${record['evidence']} evidence files',
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
                  if (room.newSinceDraft > 0) ...[
                    const SizedBox(height: 4),
                    Text(
                      '${room.newSinceDraft} new since draft',
                      style: const TextStyle(
                        color: KiviloColors.pinkDark,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
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
                  'AI drafts stay private until a person reviews and publishes them. The signed inventory does not change.',
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
      if (inspection.findings.isEmpty && inspection.summary == null) ...[
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _busy ? null : () => _runFindings(inspection),
          icon: const Icon(Icons.auto_awesome_outlined),
          label: const Text('Draft comparison'),
        ),
      ],
      if (inspection.findings.isEmpty && inspection.summary != null) ...[
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'The draft comparison found no item changes.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ),
      ],
      if (inspection.findings.isNotEmpty) ...[
        const SizedBox(height: 20),
        KiviloSectionHeading(
          title: 'Findings',
          subtitle:
              '${inspection.findings.length} ${inspection.findings.length == 1 ? 'change' : 'changes'} to review',
        ),
        const SizedBox(height: 12),
      ],
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
                      if (!finding.editedByHuman)
                        _findingTag(
                          'AI draft',
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
                  if (!finding.editedByHuman && finding.confidence != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      '${(finding.confidence! * 100).round()}% AI confidence',
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
          'Open and confirm each drafted finding before publishing.',
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
              : _publishFindings,
          icon: const Icon(Icons.publish_outlined),
          label: Text(
            inspection.latestAssessment == null
                ? 'Publish reviewed assessment'
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
          Text('Review finding', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4),
          Text(
            widget.finding.itemLabel ??
                widget.finding.baselineLabel ??
                widget.finding.changeType,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),
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
            child: const Text('Save reviewed finding'),
          ),
        ],
      ),
    ),
  );
}
