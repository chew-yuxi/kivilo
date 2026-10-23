import 'package:flutter/material.dart';
import 'package:number_flow_flutter/number_flow_flutter.dart';
import 'package:open_filex/open_filex.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../l10n/l10n.dart';
import '../models/inspection.dart';
import '../models/maintenance.dart' show describeProposal;
import '../services/api.dart';
import '../services/product_events.dart';
import '../services/capture_queue.dart';
import '../services/finding_photos.dart';
import '../services/report_pdf_file.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/marked_network_photo.dart';
import '../ui/page_context_title.dart';
import '../ui/tenant_handover.dart';
import 'addenda_screen.dart';
import 'finding_editor_screen.dart';
import 'room_screen.dart';
import 'signature_screen.dart';
import 'maintenance_case_screen.dart';
import 'report_screen.dart';
import 'tenancy_access_screen.dart';
import 'property_settings_screen.dart';

class InspectionScreen extends StatefulWidget {
  const InspectionScreen({
    super.key,
    required this.id,
    this.api,
    this.reportPdf,
  });
  final String id;
  final Api? api;
  final ReportPdfFile? reportPdf;

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
    setState(() {
      _future = next;
    });
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
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addRoom() async {
    final controller = TextEditingController();
    final name = await showKiviloDrawer<String>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text(t.roomAddTitle),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLength: 80,
          decoration: InputDecoration(labelText: t.roomName),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(t.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: Text(t.add),
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

  Future<void> _openRoom(RoomSummary room, InspectionDetail inspection) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => RoomScreen(
          inspectionId: widget.id,
          roomId: room.id,
          editable: inspection.isOpen,
          property: inspection.property,
          inspectionKind: inspection.kind,
          api: _api,
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
            title: Text(t.stillUploading),
            content: Text(
              t.stillUploadingBody,
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(t.ok),
              ),
            ],
          ),
        );
        return;
      }
      final agreed = await showKiviloDrawer<bool>(
        context: context,
        builder: (context) => KiviloDrawer(
          title: Text(t.sendForSignatureTitle),
          content: Text(
            t.sendForSignatureBody(inspection.rooms.length),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(t.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(t.send),
            ),
          ],
        ),
      );
      if (agreed == true) {
        await _api.completeReview(widget.id);
        if (mounted) await _refresh();
      }
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
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
          api: _api,
        ),
      ),
    );
    if (signed == true && mounted) {
      await _refresh();
      final inspection = await _future;
      if (mounted && role == 'Tenant' && inspection.kind == 'CHECK_IN') {
        await showTenantHandover(context, inspectionId: widget.id, api: _api);
      }
    }
  }

  /// For a party who is not at the handover: the server emails them a link to sign on
  /// their own phone, after signing in as themselves.
  Future<void> _emailSigningLink(String stakeholderId, String name) =>
      _run(() async {
        await _api.emailSigningLink(widget.id, stakeholderId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(t.signingLinkSent(name))),
          );
        }
      });

  Future<void> _pdf(
    InspectionDetail inspection, {
    Rect? shareOrigin,
  }) => _run(() async {
    final url = await _api.reportPdf(widget.id);
    final file = await (widget.reportPdf ?? ReportPdfFile()).download(
      url,
      'Kivilo ${inspection.kind == 'CHECK_OUT' ? 'check-out' : 'check-in'} ${inspection.property}',
    );
    if (!mounted) return;
    if (shareOrigin != null) {
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path, mimeType: 'application/pdf')],
          subject: 'Kivilo report · ${inspection.property}',
          sharePositionOrigin: shareOrigin,
        ),
      );
    } else {
      final result = await OpenFilex.open(
        file.path,
        type: 'application/pdf',
        uti: 'com.adobe.pdf',
      );
      if (result.type != ResultType.done) {
        throw ApiFailure(
          result.type == ResultType.noAppToOpen
              ? t.pdfNoViewer
              : t.pdfOpenFailed,
          null,
        );
      }
    }
  });

  Future<void> _share(InspectionDetail inspection, Rect origin) =>
      _run(() async {
        final url = inspection.shareUrl ?? await _api.share(widget.id);
        if (!mounted) return;
        await SharePlus.instance.share(
          ShareParams(
            text: url,
            subject: 'Kivilo report · ${inspection.property}',
            sharePositionOrigin: origin,
          ),
        );
      });

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
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addFinding(InspectionDetail inspection) async {
    final owner = Supabase.instance.client.auth.currentUser?.id;
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => FindingEditorScreen(
          inspectionId: widget.id,
          api: _api,
          maintenanceHistory: inspection.maintenanceHistory,
          checkOutItems: inspection.checkOutItems,
          checkInItems: inspection.checkInItems,
          onSave: (data) => _api.createFinding(widget.id, data, ownerId: owner),
          onRecover: (id, data) =>
              _api.updateFinding(widget.id, id, data, ownerId: owner),
        ),
      ),
    );
    if (saved == true && mounted) {
      try {
        await _refresh();
      } catch (error) {
        if (mounted) setState(() => _error = plainError(error));
      }
    }
  }

  Future<void> _editFinding(
    Finding finding,
    InspectionDetail inspection,
  ) async {
    final owner = Supabase.instance.client.auth.currentUser?.id;
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => FindingEditorScreen(
          finding: finding,
          inspectionId: widget.id,
          api: _api,
          maintenanceHistory: inspection.maintenanceHistory,
          checkOutItems: inspection.checkOutItems,
          checkInItems: inspection.checkInItems,
          onSave: (data) =>
              _api.updateFinding(widget.id, finding.id, data, ownerId: owner),
          onRecover: (id, data) =>
              _api.updateFinding(widget.id, id, data, ownerId: owner),
          onRemove: () =>
              _api.deleteFinding(widget.id, finding.id, ownerId: owner),
        ),
      ),
    );
    if (saved == true && mounted) {
      try {
        await _refresh();
      } catch (error) {
        if (mounted) setState(() => _error = plainError(error));
      }
    }
  }

  /// With no findings, publishing states that no damage was found, so the drawer says
  /// exactly that and the request carries the confirmation the server requires.
  Future<void> _publishFindings(bool noFindings) async {
    final owner = Supabase.instance.client.auth.currentUser?.id;
    if (owner != null) {
      try {
        if (await FindingPhotos.hasUnfinishedPhotos(widget.id, owner)) {
          if (mounted) {
            setState(
              () => _error =
                  t.findingPhotosUnfinished,
            );
          }
          return;
        }
      } catch (error) {
        if (mounted) setState(() => _error = plainError(error));
        return;
      }
    }
    if (!mounted) return;
    final confirmed = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text(
          noFindings ? t.publishNoDamageTitle : t.publishAssessmentTitle,
        ),
        content: Text(
          noFindings
              ? t.publishNoDamageBody
              : t.publishAssessmentBody,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(t.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(noFindings ? t.publishNoDamage : t.publish),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _run(() => _api.publishFindings(widget.id, noFindings: noFindings));
    }
  }

  @override
  Widget build(BuildContext context) => ProductScreen(
    screen: ProductScreenName.inspection,
    child: Scaffold(
      appBar: AppBar(
        centerTitle: false,
        toolbarHeight: 72,
        title: FutureBuilder<InspectionDetail>(
          future: _future,
          builder: (context, snapshot) => PageContextTitle(
            title: snapshot.data == null
                ? t.inspection
                : snapshot.data!.kind == 'CHECK_IN'
                ? t.checkIn
                : t.checkOut,
            contextLabel: snapshot.data?.property ?? t.homeInspections,
          ),
        ),
      ),
      body: KiviloContent(
        maxWidth: 1120,
        child: RefreshIndicator(
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
                      child: Text(
                        t.inspectionOpenFailed(plainError(snapshot.error!)),
                      ),
                    ),
                  ],
                );
              }
              final inspection = snapshot.data!;
              final reviewed = inspection.rooms
                  .where((room) => room.status == 'REVIEWED')
                  .length;
              final isCheckIn = inspection.kind == 'CHECK_IN';
              final signed = inspection.status == 'COMPLETED';
              final sent = !inspection.isOpen;
              final nextRoom = inspection.rooms
                  .where((room) => room.status != 'REVIEWED')
                  .firstOrNull;
              final recording =
                  inspection.rooms.isEmpty ||
                  inspection.rooms.any(
                    (room) => const [
                      'PENDING',
                      'CAPTURING',
                      'PROCESSING',
                      'FAILED',
                    ].contains(room.status),
                  );
              final stage = sent
                  ? 2
                  : recording
                  ? 0
                  : 1;
              final steps = [t.stepRooms, t.stepReview, t.stepSign];
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
                                t.inspectionOffline,
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
                          isCheckIn
                              ? Icons.login_outlined
                              : Icons.logout_outlined,
                          color: KiviloColors.pinkDark,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isCheckIn
                                  ? t.inspectionCheckInEyebrow
                                  : t.inspectionCheckOutEyebrow,
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
                          t.roomCount(inspection.rooms.length),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  if (inspection.propertyId case final propertyId?) ...[
                    OutlinedButton(
                      onPressed: _busy
                          ? null
                          : () async {
                              await Navigator.of(context).push<void>(
                                MaterialPageRoute(
                                  builder: (_) => PropertySettingsScreen(
                                    propertyId: propertyId,
                                    api: _api,
                                  ),
                                ),
                              );
                              if (mounted) await _refresh();
                            },
                      child: Text(t.propertySettings),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (inspection.tenancyRecordId case final tenancyId?) ...[
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.person_outline),
                        title: Text(
                          inspection.access?.canManageAccess == true
                              ? t.tenancyManageAccess
                              : inspection.access?.scope == 'INSPECTION'
                              ? t.accessPreviousReports
                              : t.tenancyPropertyAccess,
                        ),
                        subtitle: inspection.access == null
                            ? null
                            : Text(inspection.access!.label),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: _busy
                            ? null
                            : () async {
                                await Navigator.of(context).push<void>(
                                  MaterialPageRoute(
                                    builder: (_) => TenancyAccessScreen(
                                      tenancyId: tenancyId,
                                      property: inspection.property,
                                      api: _api,
                                    ),
                                  ),
                                );
                                if (mounted) await _refresh();
                              },
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  Card(
                    color: KiviloColors.canvas,
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              for (var index = 0; index < 3; index++) ...[
                                if (index > 0)
                                  const Padding(
                                    padding: EdgeInsets.symmetric(
                                      horizontal: 8,
                                    ),
                                    child: Icon(
                                      Icons.chevron_right,
                                      size: 16,
                                      color: KiviloColors.subtle,
                                    ),
                                  ),
                                Expanded(
                                  child: Semantics(
                                    selected: !signed && stage == index,
                                    label:
                                        signed || index < stage
                                        ? t.stepComplete(index + 1, steps[index])
                                        : stage == index
                                        ? t.stepCurrent(index + 1, steps[index])
                                        : t.step(index + 1, steps[index]),
                                    excludeSemantics: true,
                                    child: Column(
                                      children: [
                                        Container(
                                          width: 28,
                                          height: 28,
                                          alignment: Alignment.center,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: signed || index < stage
                                                ? KiviloColors.greenSoft
                                                : index == stage
                                                ? KiviloColors.pinkSoft
                                                : Colors.white,
                                          ),
                                          child: signed || index < stage
                                              ? const Icon(
                                                  Icons.check_rounded,
                                                  size: 16,
                                                  color: KiviloColors.green,
                                                )
                                              : Text(
                                                  '${index + 1}',
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w700,
                                                    color: index == stage
                                                        ? KiviloColors.pinkDark
                                                        : KiviloColors.muted,
                                                  ),
                                                ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          steps[index],
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: !signed && index == stage
                                                ? KiviloColors.pinkDark
                                                : KiviloColors.body,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 20),
                          Text(
                            signed
                                ? t.inspectionSigned
                                : sent
                                ? t.inspectionReadyToSign
                                : inspection.allRoomsReviewed
                                ? t.inspectionRoomsReady
                                : recording
                                ? t.inspectionBuildRecord
                                : t.inspectionCheckEachRoom,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            signed
                                ? t.inspectionSignedBody
                                : sent
                                ? t.inspectionSentBody
                                : inspection.allRoomsReviewed
                                ? t.inspectionRoomsReadyBody
                                : recording
                                ? t.inspectionRecordingBody
                                : t.inspectionReviewBody,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          if (inspection.isOpen) ...[
                            const SizedBox(height: 16),
                            KiviloProgressBar(
                              minHeight: 5,
                              value: inspection.rooms.isEmpty
                                  ? 0
                                  : reviewed / inspection.rooms.length,
                              color: KiviloColors.pink,
                            ),
                            const SizedBox(height: 8),
                            NumberFlow(
                              value: reviewed,
                              suffix:
                                  t.roomsReviewedSuffix(inspection.rooms.length),
                              style: Theme.of(context).textTheme.bodySmall,
                              tabularNums: true,
                            ),
                            const SizedBox(height: 14),
                            OutlinedButton.icon(
                              onPressed: _busy
                                  ? null
                                  : inspection.rooms.isEmpty
                                  ? _addRoom
                                  : inspection.allRoomsReviewed
                                  ? () => _sendForSignature(inspection)
                                  : () => _openRoom(nextRoom!, inspection),
                              icon: Icon(
                                inspection.rooms.isEmpty
                                    ? Icons.add
                                    : inspection.allRoomsReviewed
                                    ? Icons.draw_outlined
                                    : Icons.chevron_right,
                              ),
                              label: Text(
                                inspection.rooms.isEmpty
                                    ? t.homeAddFirstRoom
                                    : inspection.allRoomsReviewed
                                    ? t.sendForSignature
                                    : t.continueRoom(nextRoom!.name),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    color: KiviloColors.canvas,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            t.inspectionPeople,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 12),
                          _personRow(
                            Icons.person_outline,
                            t.landlord,
                            inspection.landlord,
                          ),
                          const SizedBox(height: 10),
                          _personRow(
                            Icons.person_outline,
                            t.tenant,
                            inspection.tenant,
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (isCheckIn &&
                      inspection.signatures.any(
                        (signature) =>
                            signature.stakeholderId == inspection.tenantId,
                      )) ...[
                    const SizedBox(height: 16),
                    OutlinedButton(
                      onPressed: () => showTenantHandover(
                        context,
                        inspectionId: widget.id,
                        api: _api,
                      ),
                      child: Text(t.tenantHandover),
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
                      label: Text(t.viewCheckInBaseline),
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
                              t.reportSummary,
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
                    title: t.stepRooms,
                    subtitle: inspection.rooms.isEmpty
                        ? t.roomsStartFirst
                        : t.roomsDetail,
                    action: inspection.isOpen
                        ? TextButton.icon(
                            onPressed: _busy ? null : _addRoom,
                            icon: const Icon(Icons.add),
                            label: Text(t.add),
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
                              t.roomsEmpty,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              t.roomsEmptyDetail,
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                    ),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final columns = constraints.maxWidth >= 760 ? 2 : 1;
                      final width =
                          (constraints.maxWidth - (columns - 1) * 12) / columns;
                      return Wrap(
                        spacing: 12,
                        runSpacing: 10,
                        children: [
                          for (final room in inspection.rooms)
                            SizedBox(
                              width: width,
                              child: _roomCard(room, inspection),
                            ),
                        ],
                      );
                    },
                  ),
                  if (inspection.rooms.isNotEmpty) const SizedBox(height: 10),
                  if (inspection.status == 'AWAITING_SIGNATURE' ||
                      inspection.status == 'COMPLETED') ...[
                    const SizedBox(height: 28),
                    KiviloSectionHeading(
                      title: t.signatures,
                      subtitle:
                          t.signaturesDetail,
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
                    KiviloSectionHeading(
                      title: t.shareReport,
                      subtitle:
                          t.shareReportDetail,
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
                                    t.shareReportSigned,
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleMedium,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            FilledButton.icon(
                              onPressed: _busy ? null : () => _pdf(inspection),
                              icon: const Icon(Icons.description_outlined),
                              label: Text(t.viewPdf),
                            ),
                            const SizedBox(height: 10),
                            Builder(
                              builder: (context) => OutlinedButton.icon(
                                onPressed: _busy
                                    ? null
                                    : () {
                                        final box =
                                            context.findRenderObject()!
                                                as RenderBox;
                                        _pdf(
                                          inspection,
                                          shareOrigin:
                                              box.localToGlobal(Offset.zero) &
                                              box.size,
                                        );
                                      },
                                icon: const Icon(Icons.share_outlined),
                                label: Text(t.sharePdf),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Builder(
                              builder: (context) => OutlinedButton.icon(
                                onPressed: _busy
                                    ? null
                                    : () {
                                        final box =
                                            context.findRenderObject()!
                                                as RenderBox;
                                        _share(
                                          inspection,
                                          box.localToGlobal(Offset.zero) &
                                              box.size,
                                        );
                                      },
                                icon: const Icon(Icons.link_outlined),
                                label: Text(t.shareLink),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              t.shareLinkWarning,
                            ),
                            // The report as the parties read it, with every update since
                            // signing and who has acknowledged it.
                            if (inspection.kind == 'CHECK_IN') ...[
                              const SizedBox(height: 10),
                              OutlinedButton.icon(
                                onPressed: () => Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) => ReportScreen(id: widget.id),
                                  ),
                                ),
                                icon: const Icon(Icons.fact_check_outlined),
                                label: Text(t.signedReportAndUpdates),
                              ),
                              const SizedBox(height: 10),
                              OutlinedButton.icon(
                                onPressed: () => Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) =>
                                        AddendaScreen(inspectionId: widget.id),
                                  ),
                                ),
                                icon: const Icon(Icons.edit_outlined),
                                label: Text(t.writeUpdate),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                  if (inspection.kind == 'CHECK_IN' &&
                      inspection.status == 'COMPLETED' &&
                      (inspection.access?.scope != 'INSPECTION' ||
                          inspection.checkOutId != null)) ...[
                    const SizedBox(height: 28),
                    Card(
                      color: KiviloColors.canvas,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              t.endOfTenancy,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 5),
                            Text(
                              t.endOfTenancyDetail,
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
                                    ? t.startCheckOut
                                    : t.homeOpenCheckOut,
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
                    KiviloSectionHeading(
                      title: t.maintenanceHistory,
                      subtitle:
                          t.maintenanceHistoryDetail,
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
                            '${t.repairCount(record['repairAttempts'] as int)} · '
                            '${t.mediaFileCount(record['evidence'] as int)}'
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
        'AGREED' => '\n${t.costAgreed(switch (record['costAgreementTerms']) {
          // A server from before the terms were added sends only its English sentence.
          final Map<String, dynamic> terms => describeProposal(
            arrangedBy: terms['arrangedBy'] as String,
            payer: terms['payer'] as String,
            tenantCap: terms['tenantCap'] as String?,
          ),
          _ => '${record['costAgreement']}',
        })}',
        'PENDING' => '\n${t.costPending}',
        'DISPUTED' => '\n${t.costDisputed}',
        'NOT_PROPOSED' => '\n${t.costNotProposed}',
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
                  t.costsOpen(open),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  t.costsOpenBody,
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

  Widget _roomCard(RoomSummary room, InspectionDetail inspection) => Card(
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => _openRoom(room, inspection),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    room.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                const Icon(Icons.chevron_right, color: KiviloColors.subtle),
              ],
            ),
            const SizedBox(height: 7),
            KiviloStatusPill(status: room.status),
            const SizedBox(height: 8),
            Text(
              room.countsLabel,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (room.previews.isNotEmpty) ...[
              const SizedBox(height: 14),
              SizedBox(
                height: 76,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: room.previews.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (context, index) => ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: SizedBox(
                      width: 92,
                      child: MarkedNetworkPhoto(
                        url: room.previews[index].url,
                        annotations: room.previews[index].annotations,
                        semanticLabel: t.roomPreview(room.name, index + 1),
                      ),
                    ),
                  ),
                ),
              ),
            ],
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
    final awaiting = inspection.status == 'AWAITING_SIGNATURE';
    final party = inspection.signingParty(id);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ListTile(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 5,
              ),
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: signed
                      ? KiviloColors.greenSoft
                      : KiviloColors.amberSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  signed ? Icons.check_rounded : Icons.draw_outlined,
                  color: signed ? KiviloColors.green : KiviloColors.amber,
                ),
              ),
              title: Text(name, style: Theme.of(context).textTheme.titleMedium),
              subtitle: Text(
                '${t.partyRole(role)} · ${signed ? t.signed : t.filterAwaitingSignature}',
              ),
              trailing: signed
                  ? null
                  : const Icon(Icons.chevron_right, color: KiviloColors.subtle),
              onTap: !signed && awaiting && !_busy
                  ? () => _sign(id, name, role)
                  : null,
            ),
            if (!signed && awaiting && party != null)
              _signingEmailRow(party, name),
          ],
        ),
      ),
    );
  }

  /// Under an unsigned party: whether they have been emailed the link to sign on their
  /// own phone, and a button to send it (again).
  Widget _signingEmailRow(SigningParty party, String name) {
    final status = party.email == null
        ? t.noEmailOnFile
        : switch (party.emailState) {
            'SENT' => t.signingLinkEmailed(shortDate(party.emailedAt!)),
            'QUEUED' => t.signingLinkQueued,
            'FAILED' => t.signingLinkFailed,
            _ => t.signingLinkNotEmailed,
          };
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 8, 8),
      child: Row(
        children: [
          Expanded(
            child: Text(status, style: Theme.of(context).textTheme.bodySmall),
          ),
          if (party.email != null)
            TextButton.icon(
              onPressed: _busy || party.emailState == 'QUEUED'
                  ? null
                  : () => _emailSigningLink(party.stakeholderId, name),
              icon: const Icon(Icons.mail_outline, size: 18),
              label: Text(
                party.emailState == null ? t.emailSigningLink : t.resend,
              ),
            ),
        ],
      ),
    );
  }

  Widget _findings(InspectionDetail inspection) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const SizedBox(height: 28),
      KiviloSectionHeading(
        title: t.checkOutAssessment,
        subtitle: t.checkOutAssessmentDetail,
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
                  t.checkOutAssessmentIntro,
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
              t.publishedVersion(inspection.latestAssessment!.version),
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
        title: t.findings,
        subtitle: inspection.findings.isEmpty
            ? t.findingsEmpty
            : t.findingsCount(inspection.findings.length),
        action: inspection.status == 'COMPLETED'
            ? TextButton.icon(
                onPressed: _busy ? null : () => _addFinding(inspection),
                icon: const Icon(Icons.add),
                label: Text(t.add),
              )
            : null,
      ),
      const SizedBox(height: 12),
      for (final finding in inspection.findings) ...[
        Card(
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: _busy ? null : () => _editFinding(finding, inspection),
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
                      _findingTag(findingChangeLabels[finding.changeType] ?? finding.changeType),
                      _findingTag(findingVerdictLabels[finding.verdict] ?? finding.verdict),
                      // Drafted by the old AI comparison, not yet confirmed.
                      if (!finding.editedByHuman)
                        _findingTag(
                          t.findingUnconfirmed,
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
                      t.findingEstimatedCost('${finding.estimatedCost}'),
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
          t.findingsConfirmFirst,
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
                ? t.publishNoDamageFound
                : inspection.latestAssessment == null
                ? t.publishAssessment
                : t.publishNewVersion,
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
