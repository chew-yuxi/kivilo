import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../l10n/l10n.dart';
import '../models/addenda.dart';
import '../services/addendum_photos.dart';
import '../services/api.dart';
import '../services/product_events.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_theme.dart';
import 'addendum_entry_screen.dart';
import 'report_screen.dart';
import '../ui/kivilo_layout.dart';
import '../ui/marked_network_photo.dart';

/// Updates since signing, on a countersigned check-in: what has been published and who
/// has acknowledged it, the draft the agent is writing, and resolved repairs that can
/// start one. The same as the web panel, through the same server functions. The signed
/// report itself is never edited here.
class AddendaScreen extends StatefulWidget {
  const AddendaScreen({
    super.key,
    required this.inspectionId,
    this.api,
    this.photos,
  });

  final String inspectionId;
  final Api? api;
  final AddendumPhotos? photos;

  @override
  State<AddendaScreen> createState() => _AddendaScreenState();
}

class _AddendaScreenState extends State<AddendaScreen> {
  late final _api = widget.api ?? Api();
  late final _photos = widget.photos ?? AddendumPhotos(api: _api);
  late Loading<AddendaWorkspace> _loading = _api.load(
    _load,
    retainKey: 'addenda:${widget.inspectionId}',
  );
  final _title = TextEditingController();
  final _reason = TextEditingController();
  String _date = '';
  String? _detailsFor;
  String? _pendingFor;
  Map<String, int> _pending = const {};
  bool _busy = false;
  String? _error;

  Future<AddendaWorkspace> _load() async {
    final workspace = await _api.addenda(widget.inspectionId);
    final draft = workspace.draft;
    // Photos still on this phone for the draft, so the agent can see none was lost.
    final pending = draft == null
        ? const <String, int>{}
        : await _photos.pending(draft.id, draft.entries.map((e) => e.id));
    if (mounted) {
      setState(() {
        _pending = pending;
        _pendingFor = draft?.id;
      });
    }
    return workspace;
  }

  Future<void> _refresh() async {
    final next = _api.load(
      _load,
      savedFirst: false,
      retainKey: 'addenda:${widget.inspectionId}',
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

  @override
  void dispose() {
    _title.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _saveDetails(AddendumDraft draft) => _api.updateAddendum(
    draft.id,
    title: _title.text.trim(),
    reason: _reason.text.trim().isEmpty ? null : _reason.text.trim(),
    effectiveDate: _date,
  );

  Future<void> _pickDate() async {
    final current = DateTime.parse(_date);
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null || !mounted) return;
    setState(() {
      _date =
          '${picked.year.toString().padLeft(4, '0')}-'
          '${picked.month.toString().padLeft(2, '0')}-'
          '${picked.day.toString().padLeft(2, '0')}';
    });
  }

  Future<bool> _confirm(String title, String body, String action) async =>
      await showKiviloDrawer<bool>(
        context: context,
        builder: (context) => KiviloDrawer(
          title: Text(title),
          content: Text(body),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(t.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(action),
            ),
          ],
        ),
      ) ==
      true;

  Future<void> _editEntry(
    AddendaWorkspace workspace,
    AddendumDraft draft,
    DraftEntry? entry,
  ) async {
    final body = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(
        builder: (_) => AddendumEntryScreen(
          entry: entry,
          rooms: workspace.rooms,
          targets: workspace.targets,
        ),
      ),
    );
    if (body == null || !mounted) return;
    await _run(
      () => entry == null
          ? _api.addAddendumEntry(draft.id, body)
          : _api.updateAddendumEntry(draft.id, entry.id, body),
    );
  }

  Future<void> _addPhoto(
    AddendumDraft draft,
    DraftEntry entry,
    ImageSource source,
  ) async {
    bool? uploaded;
    await _run(() async {
      uploaded = await _photos.add(
        addendumId: draft.id,
        entryId: entry.id,
        source: source,
      );
    });
    if (uploaded == false && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(t.photoSavedWillUpload)));
    }
  }

  Future<void> _publish(AddendumDraft draft) async {
    if (_pendingFor != draft.id) {
      setState(
        () => _error = 'Wait while Kivilo checks for photos on this phone.',
      );
      return;
    }
    if (_title.text.trim().isEmpty) {
      setState(() => _error = t.updateNeedsTitle);
      return;
    }
    if (draft.entries.isEmpty) {
      setState(() => _error = t.updateNeedsChange);
      return;
    }
    if ((_pending.values.fold<int>(0, (sum, count) => sum + count)) > 0) {
      setState(() => _error = t.updatePhotosWaiting);
      return;
    }
    final confirmed = await _confirm(
      t.publishUpdateTitle,
      t.publishUpdateBody,
      t.publish,
    );
    if (!confirmed) return;
    await _run(() async {
      await _saveDetails(draft);
      await _api.publishAddendum(draft.id);
    });
  }

  Future<void> _discard(AddendumDraft draft) async {
    final confirmed = await _confirm(
      t.discardUpdateTitle,
      t.discardUpdateBody,
      t.discard,
    );
    if (!confirmed) return;
    await _run(() => _api.discardAddendum(draft.id));
  }

  @override
  Widget build(BuildContext context) => ProductScreen(
    screen: ProductScreenName.addenda,
    child: Scaffold(
      appBar: AppBar(title: Text(t.updatesSinceSigning)),
      body: KiviloContent(
        maxWidth: 840,
        child: StreamBuilder<AddendaWorkspace>(
          stream: _loading.stream,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    plainError(snapshot.error!),
                    textAlign: TextAlign.center,
                  ),
                ),
              );
            }
            final workspace = snapshot.data;
            if (workspace == null) {
              return const Center(child: CircularProgressIndicator());
            }
            // Retained workspaces can render before _load runs. Bind the form to the
            // draft being displayed, without replacing edits on a same-draft refresh.
            final draft = workspace.draft;
            if (draft?.id != _detailsFor) {
              _detailsFor = draft?.id;
              _title.text = draft?.title ?? '';
              _reason.text = draft?.reason ?? '';
              _date = draft?.effectiveDate ?? '';
            }
            return RefreshIndicator(
              onRefresh: _refresh,
              child: _body(workspace),
            );
          },
        ),
      ),
    ),
  );

  Widget _body(AddendaWorkspace workspace) {
    final text = Theme.of(context).textTheme;
    final draft = workspace.draft;
    return ListView(
      padding: kiviloScreenPadding,
      children: [
        Text(t.updatesIntro, style: text.bodyMedium),
        if (workspace.published.isNotEmpty) ...[
          const SizedBox(height: kiviloSectionGap),
          KiviloSectionHeading(title: t.published, subtitle: t.publishedDetail),
          const SizedBox(height: kiviloHeadingGap),
          for (final published in workspace.published)
            Card(
              child: ListTile(
                title: Text(
                  t.updateNumberTitle(published.number, published.title),
                ),
                subtitle: Text(
                  published.acknowledgements
                      .map((ack) => ack.status)
                      .join('\n'),
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) =>
                          ReportScreen(id: widget.inspectionId, api: _api),
                    ),
                  );
                  if (mounted) await _refresh();
                },
              ),
            ),
        ],
        const SizedBox(height: kiviloSectionGap),
        if (draft == null)
          FilledButton.icon(
            onPressed: _busy
                ? null
                : () => _run(() => _api.startAddendum(widget.inspectionId)),
            icon: const Icon(Icons.add),
            label: Text(t.startUpdate),
          )
        else
          ..._draft(workspace, draft),
        if (workspace.resolvedCases.isNotEmpty) ...[
          const SizedBox(height: kiviloSectionGap),
          KiviloSectionHeading(
            title: t.resolvedRepairs,
            subtitle: t.resolvedRepairsDetail,
          ),
          const SizedBox(height: kiviloHeadingGap),
          for (final repair in workspace.resolvedCases)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(repair.title, style: text.titleSmall),
                    const SizedBox(height: kiviloHeadingGap),
                    OutlinedButton(
                      onPressed: _busy
                          ? null
                          : () => _run(
                              () => _api.addendumFromMaintenanceCase(repair.id),
                            ),
                      child: Text(t.addToReportAsUpdate),
                    ),
                  ],
                ),
              ),
            ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 16),
          Text(_error!, style: const TextStyle(color: KiviloColors.red)),
        ],
      ],
    );
  }

  List<Widget> _draft(AddendaWorkspace workspace, AddendumDraft draft) {
    final text = Theme.of(context).textTheme;
    return [
      KiviloSectionHeading(title: t.draftUpdate, subtitle: t.draftUpdateDetail),
      const SizedBox(height: kiviloHeadingGap),
      TextField(
        controller: _title,
        decoration: InputDecoration(labelText: t.title),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _reason,
        minLines: 1,
        maxLines: 4,
        decoration: InputDecoration(labelText: t.reason),
      ),
      const SizedBox(height: kiviloButtonGap),
      OutlinedButton.icon(
        onPressed: _busy ? null : _pickDate,
        icon: const Icon(Icons.calendar_today_outlined),
        label: Text('Date of the change: ${calendarDate(_date)}'),
      ),
      const SizedBox(height: kiviloButtonGap),
      TextButton(
        onPressed: _busy ? null : () => _run(() => _saveDetails(draft)),
        child: Text(t.saveDetails),
      ),
      for (final entry in draft.entries) ...[
        const SizedBox(height: 12),
        _entry(workspace, draft, entry),
      ],
      const SizedBox(height: 12),
      OutlinedButton.icon(
        onPressed: _busy ? null : () => _editEntry(workspace, draft, null),
        icon: const Icon(Icons.add),
        label: Text(t.addChange),
      ),
      const SizedBox(height: kiviloButtonGap),
      if (_pendingFor != draft.id) ...[
        Text(t.checkingForPhotosOnThisPhone, style: text.bodySmall),
        const SizedBox(height: kiviloHeadingGap),
      ],
      FilledButton.icon(
        onPressed: _busy || _pendingFor != draft.id
            ? null
            : () => _publish(draft),
        icon: const Icon(Icons.publish_outlined),
        label: Text(_busy ? t.workingEllipsis : t.publishUpdate),
      ),
      const SizedBox(height: kiviloButtonGap),
      OutlinedButton(
        onPressed: _busy ? null : () => _discard(draft),
        style: kiviloDangerOutlined,
        child: Text(t.discardDraft),
      ),
      const SizedBox(height: kiviloHeadingGap),
      Text(
        t.publishFreezes,
        style: text.bodySmall?.copyWith(color: KiviloColors.muted),
        textAlign: TextAlign.center,
      ),
    ];
  }

  String _heading(AddendaWorkspace workspace, DraftEntry entry) {
    final target = workspace.targets
        .where((t) => t.key == entry.targetKey)
        .map((t) => t.label)
        .firstOrNull;
    return switch (entry.change) {
      'ADDED' => t.addendumAdded(entry.name ?? t.addendumItem),
      'REMOVED' => t.addendumRemoved(target ?? t.addendumItem),
      _ => t.addendumReplaced(
        target ?? t.addendumItem,
        entry.name ?? t.addendumItem,
      ),
    };
  }

  Widget _entry(
    AddendaWorkspace workspace,
    AddendumDraft draft,
    DraftEntry entry,
  ) {
    final text = Theme.of(context).textTheme;
    final waiting = _pending[entry.id] ?? 0;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_heading(workspace, entry), style: text.titleSmall),
            Text(
              entry.roomName,
              style: text.bodySmall?.copyWith(color: KiviloColors.muted),
            ),
            if (entry.identifier != null)
              Text(
                entry.identifier!,
                style: text.bodySmall?.copyWith(fontFamily: 'monospace'),
              ),
            if (entry.notes != null) ...[
              const SizedBox(height: 4),
              Text(entry.notes!, style: text.bodyMedium),
            ],
            if (entry.maintenanceCaseTitle != null)
              Text(
                t.fromRepair(entry.maintenanceCaseTitle!),
                style: text.bodySmall,
              ),
            if (entry.photos.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final photo in entry.photos)
                    Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(
                            width: 88,
                            height: 88,
                            child: MarkedNetworkPhoto(
                              url: photo.posterUrl ?? photo.url,
                              annotations: photo.annotations,
                              semanticLabel: photo.note ?? photo.label,
                            ),
                          ),
                        ),
                        Positioned(
                          right: 0,
                          top: 0,
                          child: IconButton.filledTonal(
                            visualDensity: VisualDensity.compact,
                            tooltip: t.deletePhoto,
                            onPressed: _busy
                                ? null
                                : () => _run(
                                    () => _api.deleteAddendumPhoto(
                                      draft.id,
                                      photo.id,
                                    ),
                                  ),
                            icon: const Icon(Icons.close, size: 16),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ],
            if (waiting > 0) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.sync, size: 16, color: KiviloColors.amber),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      t.photosWaitingUpload(waiting),
                      style: text.bodySmall,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: kiviloHeadingGap),
            LayoutBuilder(
              builder: (context, constraints) {
                final twoColumns =
                    constraints.maxWidth >= 320 &&
                    MediaQuery.textScalerOf(context).scale(15) <= 20;
                final width = twoColumns
                    ? (constraints.maxWidth - kiviloButtonGap) / 2
                    : constraints.maxWidth;
                final actions = [
                  TextButton.icon(
                    onPressed: _busy
                        ? null
                        : () => _addPhoto(draft, entry, ImageSource.camera),
                    icon: const Icon(Icons.photo_camera_outlined),
                    label: Text(t.takePhotoShort),
                  ),
                  TextButton.icon(
                    onPressed: _busy
                        ? null
                        : () => _addPhoto(draft, entry, ImageSource.gallery),
                    icon: const Icon(Icons.add_photo_alternate_outlined),
                    label: Text(t.choosePhoto),
                  ),
                  TextButton.icon(
                    onPressed: _busy
                        ? null
                        : () => _editEntry(workspace, draft, entry),
                    icon: const Icon(Icons.edit_outlined),
                    label: Text(t.editChange),
                  ),
                  OutlinedButton.icon(
                    onPressed: _busy
                        ? null
                        : () => _run(
                            () => _api.deleteAddendumEntry(draft.id, entry.id),
                          ),
                    style: kiviloDangerOutlined,
                    icon: const Icon(Icons.delete_outline),
                    label: Text(t.deleteChange),
                  ),
                ];
                return Wrap(
                  spacing: kiviloButtonGap,
                  runSpacing: kiviloButtonGap,
                  children: [
                    for (final action in actions)
                      SizedBox(width: width, child: action),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
