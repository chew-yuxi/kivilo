import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/inspection.dart';
import '../services/api.dart';
import '../services/capture_backend.dart';
import '../services/capture_queue.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';
import 'capture_screen.dart';
import 'photo_mark_screen.dart';
import 'video_screen.dart';

class RoomScreen extends StatefulWidget {
  const RoomScreen({
    super.key,
    required this.inspectionId,
    required this.roomId,
    required this.editable,
    this.api,
  });

  final String inspectionId;
  final String roomId;
  final bool editable;
  final Api? api;

  @override
  State<RoomScreen> createState() => _RoomScreenState();
}

class _RoomScreenState extends State<RoomScreen> {
  late final _api = widget.api ?? Api();
  late final _evidenceBackend = RoutingEvidenceBackend(_api.dio);

  /// Signed URLs kept across refreshes so thumbnails do not flash, but renewed before
  /// their hour runs out, or every image and video on a long-open screen would break.
  final Map<String, ({String url, DateTime at})> _captureUrls = {};

  String _stable(String key, String fresh) {
    final kept = _captureUrls[key];
    if (kept != null &&
        DateTime.now().difference(kept.at) < const Duration(minutes: 45)) {
      return kept.url;
    }
    _captureUrls[key] = (url: fresh, at: DateTime.now());
    return fresh;
  }

  late Future<RoomDetail> _future = _load();
  bool _busy = false;
  bool _newestFirst = true;
  String? _error;

  Future<RoomDetail> _load() async {
    final fresh = await _api.room(widget.inspectionId, widget.roomId);
    final captures = [
      for (final capture in fresh.captures)
        EvidenceCapture(
          id: capture.id,
          kind: capture.kind,
          url: _stable(capture.id, capture.url),
          posterUrl: capture.posterUrl == null
              ? null
              : _stable('poster:${capture.id}', capture.posterUrl!),
          clientId: capture.clientId,
          note: capture.note,
          annotations: capture.annotations,
        ),
    ];
    return RoomDetail(
      id: fresh.id,
      name: fresh.name,
      status: fresh.status,
      items: fresh.items,
      captures: captures,
    );
  }

  Future<void> _refresh() async {
    final next = _load();
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

  Future<void> _capture() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => CaptureScreen(
          inspectionId: widget.inspectionId,
          roomId: widget.roomId,
        ),
      ),
    );
    if (mounted) await _refresh();
  }

  Future<String?> _evidenceAction(
    EvidenceCapture capture,
  ) => showKiviloDrawer<String>(
    context: context,
    builder: (context) => KiviloDrawer(
      title: Text(capture.kind == 'PHOTO' ? 'Photo actions' : 'Video actions'),
      content: Column(
        children: [
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.open_in_full),
            title: const Text('Preview'),
            subtitle: const Text('Open the original file'),
            onTap: () => Navigator.pop(context, 'preview'),
          ),
          if (widget.editable) ...[
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.notes_outlined),
              title: const Text('Edit note'),
              subtitle: const Text('Describe what this shows'),
              onTap: () => Navigator.pop(context, 'note'),
            ),
            if (capture.kind == 'PHOTO')
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.gesture_outlined),
                title: const Text('Mark photo'),
                subtitle: const Text('Circle, point to, or draw over a detail'),
                onTap: () => Navigator.pop(context, 'mark'),
              ),
            const Divider(),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(
                Icons.delete_outline,
                color: KiviloColors.red,
              ),
              title: const Text(
                'Delete media',
                style: TextStyle(color: KiviloColors.red),
              ),
              onTap: () => Navigator.pop(context, 'delete'),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    ),
  );

  Future<void> _openEvidenceActions(EvidenceCapture capture) async {
    while (mounted) {
      final action = await _evidenceAction(capture);
      if (!mounted || action == null) return;
      if (action != 'note') {
        await _handleEvidenceAction(capture, action);
        return;
      }
      final result = await showKiviloDrawer<_EvidenceNoteResult>(
        context: context,
        builder: (_) => _EvidenceNoteDrawer(initial: capture.note),
      );
      if (!mounted || result == null) return;
      if (result.returnToActions) continue;
      if (result.note != null) {
        await _run(
          () => _evidenceBackend.updateNote(
            widget.inspectionId,
            capture.id,
            result.note!.trim().isEmpty ? null : result.note!.trim(),
          ),
        );
      }
      return;
    }
  }

  Future<void> _handleEvidenceAction(
    EvidenceCapture capture,
    String action,
  ) async {
    if (action == 'preview') {
      if (capture.kind == 'VIDEO') {
        await Navigator.push<void>(
          context,
          MaterialPageRoute(
            builder: (_) => VideoScreen.network(url: capture.url),
          ),
        );
      } else {
        await Navigator.push<void>(
          context,
          MaterialPageRoute(
            builder: (_) => Scaffold(
              appBar: AppBar(title: const Text('Photo')),
              backgroundColor: Colors.black,
              body: Center(
                child: InteractiveViewer(
                  minScale: 0.8,
                  maxScale: 5,
                  child: Image.network(
                    capture.url,
                    fit: BoxFit.contain,
                    gaplessPlayback: true,
                  ),
                ),
              ),
            ),
          ),
        );
      }
      return;
    }
    if (action == 'mark') {
      final result = await Navigator.push<PhotoMarksResult>(
        context,
        MaterialPageRoute(
          builder: (_) => PhotoMarkScreen(
            image: NetworkImage(capture.url),
            annotations: capture.annotations,
          ),
        ),
      );
      if (result != null) {
        await _run(
          () => _evidenceBackend.annotate(
            widget.inspectionId,
            capture.id,
            result.annotations,
          ),
        );
      }
      return;
    }
    if (action == 'delete') {
      final confirmed = await showKiviloDrawer<bool>(
        context: context,
        builder: (context) => KiviloDrawer(
          title: Text(
            'Delete this ${capture.kind == 'PHOTO' ? 'photo' : 'video'}?',
          ),
          content: const Text(
            'This removes the original capture from the room and any inventory attachments.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Delete'),
            ),
          ],
        ),
      );
      if (confirmed == true) {
        await _run(
          () => _evidenceBackend.deleteCapture(widget.inspectionId, capture.id),
        );
      }
    }
  }

  Future<void> _editItem(
    InventoryItem item,
    List<EvidenceCapture> captures,
  ) async {
    final data = await showKiviloDrawer<Map<String, dynamic>>(
      context: context,
      builder: (context) => ItemEditor(item: item, captures: captures),
    );
    if (data != null) {
      await _run(() => _api.updateItem(widget.inspectionId, item.id, data));
    }
  }

  Future<void> _deleteItem(InventoryItem item) async {
    final confirmed = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text('Delete ${item.name}?'),
        content: const Text('This removes the line from the inventory.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _run(() => _api.deleteItem(widget.inspectionId, item.id));
    }
  }

  Future<void> _rename(RoomDetail room) async {
    final controller = TextEditingController(text: room.name);
    final name = await showKiviloDrawer<String>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: const Text('Rename room'),
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
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (name != null && name.isNotEmpty && name != room.name) {
      await _run(
        () => _api.renameRoom(widget.inspectionId, widget.roomId, name),
      );
    }
  }

  Future<void> _openRoomActions(RoomDetail room) async {
    final action = await showKiviloDrawer<String>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: const Text('Room actions'),
        content: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: const Text('Rename room'),
              subtitle: const Text('Change the room name'),
              onTap: () => Navigator.pop(context, 'rename'),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(
                Icons.delete_outline,
                color: KiviloColors.red,
              ),
              title: const Text(
                'Delete room',
                style: TextStyle(color: KiviloColors.red),
              ),
              subtitle: const Text('Remove its captures and inventory'),
              onTap: () => Navigator.pop(context, 'delete'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
    if (!mounted || action == null) return;
    if (action == 'rename') await _rename(room);
    if (action == 'delete') await _deleteRoom();
  }

  Future<void> _deleteRoom() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final ownerId = Supabase.instance.client.auth.currentUser?.id;
      if (ownerId == null) {
        throw StateError('Sign in again before deleting this room.');
      }
      final room = await _api.room(widget.inspectionId, widget.roomId);
      final queue = CaptureQueue();
      late final ({int captures, int edits}) pending;
      try {
        pending = await queue.pendingForRoom(
          widget.inspectionId,
          widget.roomId,
          ownerId,
          room.captures.map((capture) => capture.id),
        );
      } finally {
        await queue.close();
      }
      if (!mounted) return;
      if (pending.captures > 0 || pending.edits > 0) {
        await showKiviloDrawer<void>(
          context: context,
          builder: (context) => KiviloDrawer(
            title: const Text('Media is still syncing'),
            content: Text(
              'This room has ${pending.captures} saved capture(s) and '
              '${pending.edits} note, mark or deletion edit(s) waiting to sync. '
              'Open camera & media and retry uploads before deleting the room.',
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
      final confirmed = await showKiviloDrawer<bool>(
        context: context,
        builder: (context) => KiviloDrawer(
          title: const Text('Delete this room?'),
          content: const Text('Its captures and inventory will be removed.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Delete'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
      await _api.deleteRoom(widget.inspectionId, widget.roomId);
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Room')),
    body: RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<RoomDetail>(
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
                  child: Text('Could not load room: ${snapshot.error}'),
                ),
              ],
            );
          }
          final room = snapshot.data!;
          final photos = room.captures
              .where((capture) => capture.kind == 'PHOTO')
              .length;
          final videos = room.captures.length - photos;
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
                            'Offline copy. Keep capturing; review edits need a connection.',
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
                    child: const Icon(
                      Icons.meeting_room_outlined,
                      color: KiviloColors.pinkDark,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'ROOM RECORD',
                          style: TextStyle(
                            color: KiviloColors.pinkDark,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.1,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          room.name,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                      ],
                    ),
                  ),
                  if (widget.editable)
                    IconButton(
                      onPressed: _busy
                          ? null
                          : () => unawaited(_openRoomActions(room)),
                      icon: const Icon(Icons.more_horiz),
                      tooltip: 'Room actions',
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  KiviloStatusPill(status: room.status),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '${room.items.length} ${room.items.length == 1 ? 'item' : 'items'} · $photos photos · $videos videos',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Card(
                color: KiviloColors.canvas,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        room.status == 'REVIEWED'
                            ? Icons.check_circle_outline
                            : Icons.info_outline,
                        size: 20,
                        color: room.status == 'REVIEWED'
                            ? KiviloColors.green
                            : KiviloColors.muted,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          !widget.editable
                              ? 'This inventory is fixed for signing. Media remains available below.'
                              : switch (room.status) {
                                  'PENDING' =>
                                    'Start with a narrated walkthrough, then photograph labels and details.',
                                  'REVIEW' =>
                                    'Add each item you see, checked against the media, then mark this room reviewed.',
                                  'REVIEWED' =>
                                    'This room has been reviewed. You can still add media while the report is open.',
                                  _ =>
                                    'Keep capturing. When you are done, write the room inventory from your photos and videos.',
                                },
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
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
              if (widget.editable) ...[
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _busy ? null : _capture,
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Open camera & media'),
                ),
              ],
              const SizedBox(height: 30),
              KiviloSectionHeading(
                title: 'Inventory',
                subtitle:
                    '${room.items.length} ${room.items.length == 1 ? 'item' : 'items'} in this room',
                action: widget.editable
                    ? TextButton.icon(
                        onPressed: _busy
                            ? null
                            : () => _run(
                                () => _api.addItem(
                                  widget.inspectionId,
                                  widget.roomId,
                                ),
                              ),
                        icon: const Icon(Icons.add),
                        label: const Text('Add'),
                      )
                    : null,
              ),
              const SizedBox(height: 12),
              if (room.items.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 28,
                    ),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.inventory_2_outlined,
                          size: 32,
                          color: KiviloColors.subtle,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'No inventory items yet',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Add each item you see in this room.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ),
              for (final item in room.items) ...[
                _inventoryCard(item, room.captures),
                const SizedBox(height: 10),
              ],
              const SizedBox(height: 20),
              KiviloSectionHeading(
                title: 'Media',
                subtitle: room.captures.isEmpty
                    ? 'The source record for this room'
                    : '${room.captures.length} synced ${room.captures.length == 1 ? 'capture' : 'captures'}',
                action: room.captures.length > 1
                    ? TextButton(
                        onPressed: () =>
                            setState(() => _newestFirst = !_newestFirst),
                        child: Text(
                          _newestFirst ? 'Newest first' : 'Oldest first',
                        ),
                      )
                    : null,
              ),
              const SizedBox(height: 12),
              if (room.captures.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 28,
                    ),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.photo_camera_back_outlined,
                          size: 32,
                          color: KiviloColors.subtle,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'No synced captures yet',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Captures saved on this phone appear here after upload.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ),
              if (room.captures.isNotEmpty)
                SizedBox(
                  height: 132,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: room.captures.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 10),
                    itemBuilder: (_, index) {
                      // The API lists captures oldest first. Each keeps the number it
                      // was added with whichever way the strip runs, so "Photo 3" is
                      // the same capture in both orders.
                      final number = _newestFirst
                          ? room.captures.length - index
                          : index + 1;
                      return _evidenceCard(room.captures[number - 1], number);
                    },
                  ),
                ),
              if (widget.editable && room.status == 'REVIEW') ...[
                const SizedBox(height: 10),
                Card(
                  color: KiviloColors.pinkSoft,
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Finish this room',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 5),
                        Text(
                          room.items.isEmpty
                              ? 'Add at least one item before marking this room reviewed.'
                              : 'Check every item against the photos and video. Your review makes this room ready for the report.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 14),
                        FilledButton.icon(
                          onPressed: _busy || room.items.isEmpty
                              ? null
                              : () => _run(
                                  () => _api.markRoomReviewed(
                                    widget.inspectionId,
                                    widget.roomId,
                                  ),
                                ),
                          icon: const Icon(Icons.check_rounded),
                          label: const Text('I reviewed this room'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              if (_busy) const Center(child: CircularProgressIndicator()),
            ],
          );
        },
      ),
    ),
  );

  Widget _evidenceCard(EvidenceCapture capture, int number) => Semantics(
    label: capture.kind == 'PHOTO' ? 'Photo' : 'Video',
    child: SizedBox(
      width: 120,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: _busy ? null : () => unawaited(_openEvidenceActions(capture)),
          child: Column(
            children: [
              Expanded(
                child: SizedBox.expand(
                  child: ColoredBox(
                    color: KiviloColors.canvas,
                    child: capture.kind == 'PHOTO'
                        ? Image.network(
                            capture.url,
                            fit: BoxFit.contain,
                            gaplessPlayback: true,
                            errorBuilder: (_, _, _) => const Icon(
                              Icons.broken_image_outlined,
                              color: KiviloColors.subtle,
                            ),
                          )
                        : VideoPoster(posterUrl: capture.posterUrl),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 7,
                ),
                child: Row(
                  children: [
                    Icon(
                      capture.kind == 'PHOTO'
                          ? Icons.photo_outlined
                          : Icons.videocam_outlined,
                      size: 14,
                      color: KiviloColors.muted,
                    ),
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        '${capture.kind == 'PHOTO' ? 'Photo' : 'Video'} $number',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );

  Widget _inventoryCard(InventoryItem item, List<EvidenceCapture> captures) {
    final attached = captures
        .where((capture) => item.evidenceCaptureIds.contains(capture.id))
        .toList();
    return Card(
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
                    item.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                if (widget.editable) ...[
                  IconButton(
                    tooltip: 'Edit item',
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.edit_outlined, size: 20),
                    onPressed: _busy ? null : () => _editItem(item, captures),
                  ),
                  IconButton(
                    tooltip: 'Delete item',
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.delete_outline, size: 20),
                    onPressed: _busy ? null : () => _deleteItem(item),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 5),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: [
                _itemTag(item.category.replaceAll('_', ' ')),
                _itemTag(item.condition.replaceAll('_', ' ')),
                _itemTag('Qty ${item.quantity}'),
              ],
            ),
            if (item.identifier != null) ...[
              const SizedBox(height: 10),
              Text(
                'Identifier  ${item.identifier}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            if (item.meterReading != null) ...[
              const SizedBox(height: 5),
              Text(
                'Reading  ${item.meterReading}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            if (item.notes != null) ...[
              const SizedBox(height: 9),
              Text(item.notes!, style: Theme.of(context).textTheme.bodyMedium),
            ],
            if (attached.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'Attached media',
                style: Theme.of(context).textTheme.labelLarge,
              ),
              const SizedBox(height: 7),
              Wrap(
                spacing: 7,
                runSpacing: 7,
                children: [
                  for (final capture in attached)
                    _itemTag(
                      capture.kind == 'PHOTO'
                          ? capture.annotations == null
                                ? 'Photo'
                                : 'Marked photo'
                          : 'Video',
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _itemTag(String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
    decoration: BoxDecoration(
      color: KiviloColors.canvas,
      borderRadius: BorderRadius.circular(8),
    ),
    child: Text(
      label,
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: KiviloColors.muted,
      ),
    ),
  );
}

class _EvidenceNoteDrawer extends StatefulWidget {
  const _EvidenceNoteDrawer({this.initial});
  final String? initial;

  @override
  State<_EvidenceNoteDrawer> createState() => _EvidenceNoteDrawerState();
}

class _EvidenceNoteResult {
  const _EvidenceNoteResult.save(this.note) : returnToActions = false;
  const _EvidenceNoteResult.back() : note = null, returnToActions = true;

  final String? note;
  final bool returnToActions;
}

class _EvidenceNoteDrawerState extends State<_EvidenceNoteDrawer> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.initial,
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => KiviloDrawer(
    title: Row(
      children: [
        IconButton(
          onPressed: () =>
              Navigator.pop(context, const _EvidenceNoteResult.back()),
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Back to media actions',
        ),
        const Text('Note'),
      ],
    ),
    content: TextField(
      controller: _controller,
      autofocus: true,
      minLines: 3,
      maxLines: 6,
      decoration: const InputDecoration(
        labelText: 'Note',
        hintText: 'Describe what this shows',
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: () =>
            Navigator.pop(context, _EvidenceNoteResult.save(_controller.text)),
        child: const Text('Save note'),
      ),
    ],
  );
}

class ItemEditor extends StatefulWidget {
  const ItemEditor({super.key, required this.item, required this.captures});
  final InventoryItem item;
  final List<EvidenceCapture> captures;

  @override
  State<ItemEditor> createState() => _ItemEditorState();
}

class _ItemEditorState extends State<ItemEditor> {
  late final _name = TextEditingController(text: widget.item.name);
  late final _quantity = TextEditingController(text: '${widget.item.quantity}');
  late final _notes = TextEditingController(text: widget.item.notes);
  late final _identifier = TextEditingController(text: widget.item.identifier);
  late final _meterReading = TextEditingController(
    text: widget.item.meterReading,
  );
  late String _category = widget.item.category;
  late String _condition = widget.item.condition;
  late final Set<String> _evidenceCaptureIds = {
    ...widget.item.evidenceCaptureIds,
  };
  String? _error;

  @override
  void dispose() {
    for (final controller in [
      _name,
      _quantity,
      _notes,
      _identifier,
      _meterReading,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _save() {
    final count = int.tryParse(_quantity.text.trim());
    if (_name.text.trim().isEmpty || count == null || count < 1) {
      setState(
        () => _error = 'Enter an item name and quantity of at least one.',
      );
      return;
    }
    Navigator.pop(context, <String, dynamic>{
      'name': _name.text.trim(),
      'quantity': count,
      'category': _category,
      'condition': _condition,
      'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      'identifier': _identifier.text.trim().isEmpty
          ? null
          : _identifier.text.trim(),
      'meterReading': _meterReading.text.trim().isEmpty
          ? null
          : _meterReading.text.trim(),
      'evidenceCaptureIds': _evidenceCaptureIds.toList(),
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
          Text(
            'Edit inventory item',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 4),
          Text(
            'Confirm the details against the room\'s media.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          const SizedBox(height: 12),
          KiviloSelectField<String>(
            label: 'Category',
            value: _category,
            options: const [
              KiviloSelectOption(value: 'FIXTURE', label: 'Fixture'),
              KiviloSelectOption(value: 'APPLIANCE', label: 'Appliance'),
              KiviloSelectOption(value: 'FURNITURE', label: 'Furniture'),
              KiviloSelectOption(value: 'SURFACE', label: 'Surface'),
              KiviloSelectOption(value: 'METER', label: 'Meter'),
            ],
            onChanged: (value) => setState(() => _category = value),
          ),
          const SizedBox(height: 12),
          KiviloSelectField<String>(
            label: 'Condition',
            value: _condition,
            options: const [
              KiviloSelectOption(value: 'NEW', label: 'New'),
              KiviloSelectOption(value: 'GOOD', label: 'Good'),
              KiviloSelectOption(value: 'FAIR', label: 'Fair'),
              KiviloSelectOption(value: 'POOR', label: 'Poor'),
              KiviloSelectOption(value: 'DAMAGED', label: 'Damaged'),
            ],
            onChanged: (value) => setState(() => _condition = value),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _quantity,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Quantity'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _identifier,
            decoration: const InputDecoration(
              labelText: 'Make, model or serial',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _meterReading,
            decoration: const InputDecoration(labelText: 'Meter reading'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _notes,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'Notes'),
          ),
          const SizedBox(height: 20),
          Text(
            'Attached media',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'Choose the room photos and videos that support this inventory line. Their notes and photo marks stay attached.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 10),
          if (widget.captures.isEmpty)
            const Text('No media in this room yet.')
          else
            ...widget.captures.indexed.map((entry) {
              final (index, capture) = entry;
              final selected = _evidenceCaptureIds.contains(capture.id);
              final detail = [
                if (capture.note?.trim().isNotEmpty ?? false)
                  capture.note!.trim(),
                if (capture.annotations != null) 'Has photo marks',
              ].join(' · ');
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Material(
                  color: selected ? KiviloColors.pinkSoft : KiviloColors.canvas,
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () => setState(() {
                      if (selected) {
                        _evidenceCaptureIds.remove(capture.id);
                      } else {
                        _evidenceCaptureIds.add(capture.id);
                      }
                    }),
                    child: Padding(
                      padding: const EdgeInsets.all(10),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: SizedBox(
                              width: 54,
                              height: 54,
                              child: ColoredBox(
                                color: Colors.white,
                                child: capture.kind == 'PHOTO'
                                    ? Image.network(
                                        capture.url,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, _, _) => const Icon(
                                          Icons.broken_image_outlined,
                                        ),
                                      )
                                    : VideoPoster(
                                        posterUrl: capture.posterUrl,
                                        iconSize: 24,
                                      ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${capture.kind == 'PHOTO' ? 'Photo' : 'Video'} ${index + 1}',
                                  style: Theme.of(context).textTheme.labelLarge,
                                ),
                                if (detail.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    detail,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodySmall,
                                  ),
                                ],
                              ],
                            ),
                          ),
                          Icon(
                            selected
                                ? Icons.check_circle
                                : Icons.circle_outlined,
                            color: selected
                                ? KiviloColors.pink
                                : KiviloColors.subtle,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: KiviloColors.red)),
          ],
          const SizedBox(height: 20),
          FilledButton(onPressed: _save, child: const Text('Save changes')),
        ],
      ),
    ),
  );
}
