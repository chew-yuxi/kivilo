import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../l10n/l10n.dart';
import '../models/maintenance.dart';
import '../models/handover.dart';
import '../services/api.dart';
import '../services/capture_queue.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_theme.dart';
import 'addenda_screen.dart';
import 'maintenance_evidence_screen.dart';
import 'photo_mark_screen.dart';
import 'responsibility_card.dart';
import 'report_screen.dart';
import 'video_screen.dart';
import '../ui/kivilo_layout.dart';
import '../ui/marked_network_photo.dart';
import '../services/photo_cache.dart';

class _MoveInDefectComposer extends StatefulWidget {
  const _MoveInDefectComposer({required this.item});
  final MaintenanceCaseDetail item;

  @override
  State<_MoveInDefectComposer> createState() => _MoveInDefectComposerState();
}

class _MoveInDefectComposerState extends State<_MoveInDefectComposer> {
  final _room = TextEditingController();
  final _name = TextEditingController();
  MoveInDefectTarget? _target;
  String _category = 'FIXTURE';
  String? _condition;
  late final _photos = widget.item.evidence
      .where((photo) => photo.purpose == 'BEFORE' && photo.isImage)
      .toList();
  late final _selected = _photos.map((photo) => photo.id).toSet();

  @override
  void dispose() {
    _room.dispose();
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final valid =
        _room.text.trim().isNotEmpty &&
        (_target != null || _name.text.trim().isNotEmpty) &&
        _condition != null &&
        _selected.isNotEmpty;
    return KiviloDrawer(
      title: Text(t.recordMoveIn),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(t.recordMoveInBody),
            const SizedBox(height: 16),
            KiviloSelectField<String?>(
              label: t.itemInCheckIn,
              value: _target?.key,
              options: [
                KiviloSelectOption<String?>(value: null, label: t.notInCheckIn),
                for (final target in widget.item.moveInDefect!.targets)
                  KiviloSelectOption<String?>(
                    value: target.key,
                    label: '${target.roomName} · ${target.name}',
                  ),
              ],
              onChanged: (key) => setState(() {
                _target = key == null
                    ? null
                    : widget.item.moveInDefect!.targets.firstWhere(
                        (target) => target.key == key,
                      );
                _room.text = _target?.roomName ?? '';
                _name.text = _target?.name ?? '';
              }),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _room,
              readOnly: _target != null,
              maxLength: 120,
              decoration: InputDecoration(labelText: t.room),
              onChanged: (_) => setState(() {}),
            ),
            if (_target == null) ...[
              TextField(
                controller: _name,
                maxLength: 120,
                decoration: InputDecoration(labelText: t.itemName),
                onChanged: (_) => setState(() {}),
              ),
              KiviloSelectField<String>(
                label: t.itemCategory,
                value: _category,
                options: [
                  KiviloSelectOption(value: 'FIXTURE', label: t.assetFixture),
                  KiviloSelectOption(
                    value: 'APPLIANCE',
                    label: t.assetAppliance,
                  ),
                  KiviloSelectOption(
                    value: 'FURNITURE',
                    label: t.assetFurniture,
                  ),
                  KiviloSelectOption(value: 'SURFACE', label: t.assetSurface),
                  KiviloSelectOption(value: 'METER', label: t.categoryMeter),
                ],
                onChanged: (value) => setState(() => _category = value),
              ),
              const SizedBox(height: 12),
            ],
            KiviloSelectField<String?>(
              label: t.conditionAtMoveIn,
              value: _condition,
              options: [
                KiviloSelectOption<String?>(
                  value: null,
                  label: t.chooseCondition,
                ),
                KiviloSelectOption<String?>(
                  value: 'NEW',
                  label: t.conditionNew,
                ),
                KiviloSelectOption<String?>(
                  value: 'GOOD',
                  label: t.conditionGood,
                ),
                KiviloSelectOption<String?>(
                  value: 'FAIR',
                  label: t.conditionFair,
                ),
                KiviloSelectOption<String?>(
                  value: 'POOR',
                  label: t.conditionPoor,
                ),
                KiviloSelectOption<String?>(
                  value: 'DAMAGED',
                  label: t.conditionDamaged,
                ),
              ],
              onChanged: (value) => setState(() => _condition = value),
            ),
            const SizedBox(height: 12),
            Text(widget.item.description),
            const SizedBox(height: 16),
            Text(
              t.photosToInclude,
              style: Theme.of(context).textTheme.titleSmall,
            ),
            for (var i = 0; i < _photos.length; i++)
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(_photos[i].note ?? t.beforePhoto(i + 1)),
                subtitle: Text(t.uploadedOn(shortDate(_photos[i].createdAt))),
                value: _selected.contains(_photos[i].id),
                onChanged: (value) => setState(() {
                  if (value == true) {
                    _selected.add(_photos[i].id);
                  } else {
                    _selected.remove(_photos[i].id);
                  }
                }),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(t.cancel),
        ),
        FilledButton(
          onPressed: valid
              ? () => Navigator.pop(context, <String, dynamic>{
                  'targetKey': _target?.key,
                  'roomName': _room.text.trim(),
                  if (_target == null) 'name': _name.text.trim(),
                  if (_target == null) 'category': _category,
                  'condition': _condition,
                  'evidenceIds': _selected.toList(),
                })
              : null,
          child: Text(t.recordCondition),
        ),
      ],
    );
  }
}

class MaintenanceCaseScreen extends StatefulWidget {
  const MaintenanceCaseScreen({super.key, required this.caseId, this.api});
  final String caseId;
  final Api? api;

  @override
  State<MaintenanceCaseScreen> createState() => _MaintenanceCaseScreenState();
}

class _MaintenanceCaseScreenState extends State<MaintenanceCaseScreen> {
  late final _api = widget.api ?? Api();
  late Loading<MaintenanceCaseDetail> _loading = _api.load(
    () => _api.maintenanceCase(widget.caseId),
    retainKey: 'maintenance:${widget.caseId}',
  );
  bool _busy = false;
  String? _error;

  Future<void> _refresh() async {
    final next = _api.load(
      () => _api.maintenanceCase(widget.caseId),
      savedFirst: false,
      retainKey: 'maintenance:${widget.caseId}',
    );
    setState(() {
      _loading = next;
    });
    await next.fresh;
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

  Future<void> _markEvidence(
    String caseId,
    MaintenanceEvidenceModel evidence,
  ) async {
    final result = await Navigator.push<PhotoMarksResult>(
      context,
      MaterialPageRoute(
        builder: (_) => PhotoMarkScreen(
          image: StoredNetworkImage(evidence.url),
          placeholder: evidence.posterUrl == null
              ? null
              : StoredNetworkImage(evidence.posterUrl!),
          annotations: evidence.annotations,
        ),
      ),
    );
    if (result == null) return;
    await _run(
      () => _api.annotateMaintenanceEvidence(
        caseId,
        evidence.id,
        result.annotations,
      ),
    );
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
    var value = '';
    final result = await showKiviloDrawer<String>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text(title),
        content: TextField(
          autofocus: true,
          minLines: 2,
          maxLines: 5,
          decoration: InputDecoration(hintText: hint),
          onChanged: (text) => value = text,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(t.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, value.trim()),
            child: Text(t.save),
          ),
        ],
      ),
    );
    return result;
  }

  Future<void> _recordRepair(String caseId, String currency) async {
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
            title: Text(t.recordCompletedRepair),
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: notes,
                  autofocus: true,
                  minLines: 2,
                  maxLines: 5,
                  decoration: InputDecoration(labelText: t.whatWasRepaired),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: cost,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    labelText: t.costOptional,
                    prefixText: '${currencySymbol(currency)} ',
                    helperText: t.costHelper,
                    errorText: valid ? null : t.costInvalidExample,
                  ),
                  onChanged: (_) => setDrawerState(() {}),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(t.cancel),
              ),
              FilledButton(
                onPressed: valid ? () => Navigator.pop(context, true) : null,
                child: Text(t.save),
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
    final body = await _ask(t.addComment);
    if (body == null || body.isEmpty) return;
    await _run(() => _api.addMaintenanceComment(caseId, body));
  }

  Future<void> _close(String caseId) async {
    final reason = await _ask(t.closeWithoutAction, hint: t.closeReasonHint);
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
    final note = await _ask(t.whatIsStillWrong);
    if (note == null) return;
    await _run(
      () =>
          _api.verifyMaintenanceVisit(caseId, visitId, 'NOT_FIXED', note: note),
    );
  }

  Future<void> _recordMoveInDefect(MaintenanceCaseDetail item) async {
    final body = await showKiviloDrawer<Map<String, dynamic>>(
      context: context,
      builder: (context) => _MoveInDefectComposer(item: item),
    );
    if (body == null) return;
    await _run(() async {
      final ownerId = Supabase.instance.client.auth.currentUser?.id;
      if (ownerId == null) {
        throw ApiFailure(t.signInBeforeRecording, 401);
      }
      final queue = CaptureQueue();
      late final ({int captures, int edits}) pending;
      try {
        pending = await queue.pendingForInspection(
          'maintenance:${item.id}',
          ownerId,
        );
      } finally {
        await queue.close();
      }
      if (pending.captures > 0 || pending.edits > 0) {
        throw ApiFailure(t.photosNotUploadedMoveIn, null);
      }
      await _api.recordMoveInDefect(item.id, body);
    });
  }

  Future<void> _disputeMoveInDefect(String addendumId) async {
    final reason = await _ask(t.disputeMoveIn, hint: t.disputeMoveInHint);
    if (reason == null || reason.isEmpty) return;
    await _run(() => _api.disputeAddendum(addendumId, reason));
  }

  Widget _moveInDefect(MaintenanceCaseDetail item) {
    final claim = item.moveInDefect!;
    final recorded = claim.addendumId != null;
    final photos = item.evidence
        .where((photo) => photo.purpose == 'BEFORE' && photo.isImage)
        .length;
    return KiviloNotice(
      tone: KiviloTone.warning,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            t.presentAtMoveIn,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          if (claim.reportedAt != null)
            Text(
              claim.deadline == null
                  ? t.reportedOn(shortDate(claim.reportedAt!))
                  : t.reportedOnDeadline(
                      shortDate(claim.reportedAt!),
                      calendarDate(claim.deadline!),
                    ),
            ),
          if (!recorded) ...[
            const SizedBox(height: 8),
            Text(t.moveInDetail),
            const SizedBox(height: kiviloButtonGap),
            if (claim.canSubmit) ...[
              OutlinedButton.icon(
                onPressed: _busy ? null : () => _addEvidence(item.id, 'BEFORE'),
                icon: const Icon(Icons.add_a_photo_outlined),
                label: Text(t.addBeforePhotos),
              ),
              const SizedBox(height: kiviloButtonGap),
              FilledButton(
                onPressed: _busy || photos == 0
                    ? null
                    : () => _recordMoveInDefect(item),
                child: Text(t.recordMoveIn),
              ),
              if (photos == 0) ...[
                const SizedBox(height: kiviloButtonGap),
                Text(t.addBeforePhotoFirst),
              ],
            ],
          ] else ...[
            const SizedBox(height: 8),
            Text(switch (claim.status) {
              'ACKNOWLEDGED' => t.moveInAccepted,
              'DISPUTED' => t.moveInDisputed,
              _ => t.moveInWaiting,
            }),
            if (claim.dispute case final dispute?) ...[
              const SizedBox(height: 8),
              Text('${dispute.disputedBy} · ${shortDate(dispute.disputedAt)}'),
              Text(dispute.reason),
            ],
            if (claim.inspectionId != null)
              TextButton.icon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) =>
                        ReportScreen(id: claim.inspectionId!, api: _api),
                  ),
                ),
                icon: const Icon(Icons.description_outlined),
                label: Text(t.viewConditionNotice),
              ),
            if (claim.canRespond) ...[
              const SizedBox(height: kiviloButtonGap),
              FilledButton(
                onPressed: _busy
                    ? null
                    : () => _run(
                        () => _api.acknowledgeAddendum(claim.addendumId!),
                      ),
                child: Text(t.agreePresentAtMoveIn),
              ),
              const SizedBox(height: kiviloButtonGap),
              OutlinedButton(
                onPressed: _busy
                    ? null
                    : () => _disputeMoveInDefect(claim.addendumId!),
                child: Text(t.disputeMoveIn),
              ),
            ],
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(t.maintenance)),
    body: KiviloContent(
      maxWidth: 840,
      child: StreamBuilder<MaintenanceCaseDetail>(
        stream: _loading.stream,
        builder: (context, snapshot) {
          if (!snapshot.hasData && !snapshot.hasError) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return KiviloMessage(
              icon: Icons.cloud_off_outlined,
              title: t.couldNotOpenThisRepair,
              body: plainError(snapshot.error!),
              actionLabel: 'Try again',
              onAction: _refresh,
            );
          }
          final item = snapshot.data!;
          final text = Theme.of(context).textTheme;
          final hasMoveInPhotoAction =
              item.moveInDefect?.wasPresentAtMoveIn == true &&
              item.moveInDefect?.addendumId == null &&
              item.moveInDefect?.canSubmit == true;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: kiviloScreenPadding,
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
                  _Notice(
                    icon: Icons.emergency_outlined,
                    color: KiviloColors.red,
                    background: KiviloColors.redSoft,
                    text: t.dangerCallFirst,
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
                        Text(t.whatHappenedHeading, style: text.titleMedium),
                        const SizedBox(height: 8),
                        Text(item.description, style: text.bodyLarge),
                        const SizedBox(height: 10),
                        Text(
                          t.reportedByOn(
                            item.reportedBy,
                            shortDate(item.createdAt),
                          ),
                          style: text.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                if (item.moveInDefect?.wasPresentAtMoveIn == true) ...[
                  _moveInDefect(item),
                  const SizedBox(height: 16),
                ],
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
                const SizedBox(height: kiviloSectionGap),
                KiviloSectionHeading(
                  title: t.photos,
                  subtitle: t.photosBeforeAfter,
                  action: hasMoveInPhotoAction
                      ? null
                      : TextButton.icon(
                          onPressed: _busy
                              ? null
                              : () => _addEvidence(item.id, 'BEFORE'),
                          icon: const Icon(
                            Icons.add_a_photo_outlined,
                            size: 18,
                          ),
                          label: Text(t.addBeforePhotos),
                        ),
                ),
                const SizedBox(height: kiviloHeadingGap),
                if (item.evidence.isEmpty)
                  _Notice(
                    icon: Icons.photo_camera_outlined,
                    color: KiviloColors.subtle,
                    background: KiviloColors.canvas,
                    text: t.noPhotosYetRepair,
                  ),
                for (final evidence in item.evidence) ...[
                  _EvidenceCard(
                    evidence: evidence,
                    onMark: evidence.canMark && !_busy
                        ? () => _markEvidence(item.id, evidence)
                        : null,
                  ),
                  const SizedBox(height: 10),
                ],
                const SizedBox(height: kiviloSectionGap),
                KiviloSectionHeading(
                  title: t.history,
                  subtitle: t.historyDetail,
                  action: TextButton.icon(
                    onPressed: _busy ? null : () => _comment(item.id),
                    icon: const Icon(Icons.add_comment_outlined, size: 18),
                    label: Text(t.comment),
                  ),
                ),
                const SizedBox(height: kiviloHeadingGap),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                    child: Column(
                      children: [
                        for (final event in item.events.reversed)
                          _HistoryRow(
                            event: event,
                            proposals: item.responsibility.history,
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    ),
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
    final subtitle = switch (item.status) {
      'REPORTED' => t.waitingAcknowledge,
      'ACKNOWLEDGED' || 'SCHEDULED' =>
        item.canLogVisit
            ? t.recordRepairWhenDone
            : item.responsibility.arrangedBy == 'TENANT'
            ? t.waitingTenantRepair
            : t.waitingLandlordRepair,
      'AWAITING_CONFIRMATION' =>
        item.canVerify ? t.checkRepair : t.waitingConfirm,
      'RESOLVED' => t.confirmedFixed,
      _ => t.closedWithoutRepair,
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            KiviloSectionHeading(title: t.repair, subtitle: subtitle),
            if (item.status == 'CLOSED_NO_ACTION' &&
                item.resolutionReason != null) ...[
              const SizedBox(height: 12),
              Text('“${item.resolutionReason}”', style: text.bodyMedium),
            ],
            for (final visit in completed) ...[
              const SizedBox(height: 12),
              _VisitRow(visit: visit, currency: item.currency),
            ],
            if (!_busy && item.canManage && item.status == 'REPORTED') ...[
              const SizedBox(height: 14),
              FilledButton(
                onPressed: () => _run(
                  () => _api.updateMaintenanceCase(item.id, 'ACKNOWLEDGED'),
                ),
                child: Text(t.acknowledgeReport),
              ),
            ],
            if (!_busy &&
                item.canLogVisit &&
                ['ACKNOWLEDGED', 'SCHEDULED'].contains(item.status)) ...[
              const SizedBox(height: kiviloButtonGap),
              FilledButton.icon(
                icon: const Icon(Icons.build_outlined),
                onPressed: () => _recordRepair(item.id, item.currency),
                label: Text(t.recordCompletedRepair),
              ),
            ],
            if (!_busy && item.canVerify && unverified != null) ...[
              const SizedBox(height: 14),
              Text(t.didRepairWork, style: text.titleMedium),
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
                      child: Text(t.fixed),
                    ),
                  ),
                  const SizedBox(width: kiviloButtonGap),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _notFixed(item.id, unverified.id),
                      child: Text(t.notFixed),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: kiviloButtonGap),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  icon: const Icon(Icons.add_a_photo_outlined, size: 18),
                  label: Text(t.addAfterPhoto),
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
                label: Text(t.addToReportAsUpdate),
              ),
            ],
            if (!_busy && item.canManage && open) ...[
              const SizedBox(height: kiviloButtonGap),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => _close(item.id),
                  style: kiviloTertiary,
                  child: Text(t.closeWithoutAction),
                ),
              ),
            ],
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
      'URGENT' => ' · ${t.priorityUrgent.toUpperCase()}',
      'SAFETY_EMERGENCY' => ' · ${t.priorityDanger.toUpperCase()}',
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
                  KiviloEyebrow(
                    '${(maintenanceCategoryLabels[item.category] ?? item.category).toUpperCase()}$urgency',
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
      borderRadius: BorderRadius.circular(16),
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
  const _VisitRow({required this.visit, required this.currency});
  final MaintenanceVisitModel visit;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    // The header pill already says a repair awaits confirmation, so a row only
    // carries a pill once someone has answered.
    final outcome = switch (visit.verificationOutcome) {
      'FIXED' => (t.fixed, KiviloColors.green, KiviloColors.greenSoft),
      'NOT_FIXED' => (t.notFixed, KiviloColors.red, KiviloColors.redSoft),
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
                  '${visit.cost == null ? '' : ' · ${currencySymbol(currency)}${visit.cost}'}',
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
  const _EvidenceCard({required this.evidence, this.onMark});
  final MaintenanceEvidenceModel evidence;
  final VoidCallback? onMark;

  @override
  Widget build(BuildContext context) {
    final label = switch (evidence.purpose) {
      'BEFORE' => t.beforeRepair,
      'AFTER' => t.afterRepair,
      _ => t.receipt,
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
                              child: MarkedNetworkPhoto(
                                url: evidence.url,
                                placeholderUrl: evidence.posterUrl,
                                annotations: evidence.annotations,
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
                child: MarkedNetworkPhoto(
                  url: evidence.posterUrl ?? evidence.url,
                  annotations: evidence.annotations,
                  fit: BoxFit.contain,
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
                  if (onMark != null)
                    TextButton.icon(
                      onPressed: onMark,
                      icon: const Icon(Icons.draw_outlined),
                      label: Text(t.mark),
                    )
                  else
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
  const _HistoryRow({required this.event, required this.proposals});
  final Map<String, dynamic> event;

  /// The case's proposals, so a cost event reads in the app's language rather than
  /// as the English sentence the server stored with it.
  final List<ResponsibilityProposal> proposals;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final metadata = event['metadata'] as Map<String, dynamic>?;
    final summary =
        proposals
            .where((proposal) => proposal.id == metadata?['proposalId'])
            .firstOrNull
            ?.terms ??
        metadata?['summary'];
    final (icon, title) = switch (event['kind'] as String) {
      'REPORTED' => (Icons.flag_outlined, t.statusReported),
      'COMMENT' => (Icons.chat_bubble_outline, t.comment),
      'STATUS_CHANGED' => (
        Icons.sync_alt,
        maintenanceStatusLabels[metadata?['to']] ?? t.statusChanged,
      ),
      'VISIT_RECORDED' => (
        Icons.build_outlined,
        metadata?['completed'] == true ? t.repairRecorded : t.repairScheduled,
      ),
      'VERIFICATION' => (Icons.check_circle_outline, t.confirmedFixed),
      'REOPENED' => (Icons.replay, t.reportedNotFixed),
      'RESPONSIBILITY_PROPOSED' => (
        Icons.handshake_outlined,
        t.costProposal('$summary'),
      ),
      'RESPONSIBILITY_ACCEPTED' => (Icons.handshake, t.costAgreed('$summary')),
      'RESPONSIBILITY_REJECTED' => (
        Icons.do_not_disturb_on_outlined,
        t.costProposalRejected,
      ),
      'RESPONSIBILITY_WITHDRAWN' => (Icons.undo, t.costProposalWithdrawn),
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
