import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../l10n/l10n.dart';
import '../models/inspection.dart';
import '../services/api.dart';
import '../services/product_events.dart';
import '../services/capture_backend.dart';
import '../services/capture_queue.dart';
import '../services/capture_store.dart';
import '../ui/check_in_reference_view.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/marked_network_photo.dart';
import '../ui/page_context_title.dart';
import 'capture_screen.dart';
import 'photo_mark_screen.dart';
import 'video_screen.dart';

class RoomScreen extends StatefulWidget {
  const RoomScreen({
    super.key,
    required this.inspectionId,
    required this.roomId,
    required this.editable,
    this.property,
    this.inspectionKind,
    this.api,
    this.queue,
    this.ownerId,
    this.supportDirectory,
  });

  final String inspectionId;
  final String roomId;
  final bool editable;
  final String? property;
  final String? inspectionKind;
  final Api? api;
  final CaptureQueue? queue;
  final String? ownerId;
  final Future<Directory> Function()? supportDirectory;

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
  bool _addingItem = false;
  bool _newestFirst = true;

  /// The check-in reference starts closed, as on the web, so the inventory is what the
  /// inspector lands on; each copied row carries its own check-in line anyway.
  bool _showCheckIn = false;
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
    final checkIn = fresh.checkIn;
    return RoomDetail(
      id: fresh.id,
      name: fresh.name,
      status: fresh.status,
      items: fresh.items,
      captures: captures,
      checkIn: checkIn == null
          ? null
          : CheckInReference(
              baselineId: checkIn.baselineId,
              conductedAt: checkIn.conductedAt,
              lines: checkIn.lines,
              photos: [
                for (final photo in checkIn.photos)
                  CheckInPhoto(
                    id: photo.id,
                    url: _stable(photo.id, photo.url),
                    caption: photo.caption,
                    update: photo.update,
                    annotations: photo.annotations,
                  ),
              ],
            ),
    );
  }

  Future<void> _refresh() async {
    final next = _load();
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

  Future<void> _capture() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => CaptureScreen(
          inspectionId: widget.inspectionId,
          roomId: widget.roomId,
          api: _api,
          queue: widget.queue,
          ownerId: widget.ownerId,
          supportDirectory: widget.supportDirectory,
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
      title: Text(capture.kind == 'PHOTO' ? t.photoActions : t.videoActions),
      content: Column(
        children: [
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.open_in_full),
            title: Text(t.preview),
            subtitle: Text(t.previewDetail),
            onTap: () => Navigator.pop(context, 'preview'),
          ),
          if (widget.editable) ...[
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.notes_outlined),
              title: Text(t.editNote),
              subtitle: Text(t.noteHint),
              onTap: () => Navigator.pop(context, 'note'),
            ),
            if (capture.kind == 'PHOTO')
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.gesture_outlined),
                title: Text(t.markPhoto),
                subtitle: Text(t.markPhotoDetail),
                onTap: () => Navigator.pop(context, 'mark'),
              ),
            const Divider(),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(
                Icons.delete_outline,
                color: KiviloColors.red,
              ),
              title: Text(
                t.deleteMedia,
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
          child: Text(t.close),
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
              appBar: AppBar(title: Text(t.photo)),
              backgroundColor: Colors.black,
              body: Center(
                child: InteractiveViewer(
                  minScale: 0.8,
                  maxScale: 5,
                  child: MarkedNetworkPhoto(
                    url: capture.url,
                    annotations: capture.annotations,
                    fit: BoxFit.contain,
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
            capture.kind == 'PHOTO' ? t.deletePhotoTitle : t.deleteVideoTitle,
          ),
          content: Text(
            t.deleteMediaBody,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(t.cancel),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(t.delete),
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
    final canLinkExistingMedia =
        captures.isEmpty ||
        await _mediaUploaded(captures.map((capture) => capture.id));
    // A capture may have finished uploading just before this drawer opened.
    // Start the optional media selector from that committed attachment state.
    final latest = canLinkExistingMedia && captures.isNotEmpty
        ? await _api.room(widget.inspectionId, widget.roomId)
        : null;
    if (!mounted) return;
    await showKiviloDrawer<void>(
      context: context,
      builder: (context) => ItemEditor(
        item: latest == null
            ? item
            : latest.items.firstWhere((current) => current.id == item.id),
        captures: latest?.captures ?? captures,
        canLinkExistingMedia: canLinkExistingMedia,
        onSave: (data) => _api.updateItem(widget.inspectionId, item.id, data),
      ),
    );
  }

  Future<void> _openItem(InventoryItem item) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => CaptureScreen(
          inspectionId: widget.inspectionId,
          roomId: widget.roomId,
          itemId: item.id,
          itemName: item.name,
          api: _api,
          onEditItem: _editItem,
          queue: widget.queue,
          ownerId: widget.ownerId,
          supportDirectory: widget.supportDirectory,
        ),
      ),
    );
    if (mounted) await _refresh();
  }

  Future<void> _addItem() async {
    if (_busy || _addingItem) return;
    _addingItem = true;
    InventoryItem? added;
    List<EvidenceCapture> captures = const [];
    await _run(() async {
      final id = await _api.addItem(widget.inspectionId, widget.roomId);
      final room = await _load();
      added = room.items.firstWhere((item) => item.id == id);
      captures = room.captures;
    });
    if (!mounted || added == null) {
      if (mounted) setState(() => _addingItem = false);
      return;
    }
    try {
      await _editItem(added!, captures);
      if (mounted) await _openItem(added!);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _addingItem = false);
    }
  }

  Future<void> _deleteItem(InventoryItem item) async {
    final confirmed = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text(t.deleteNamed(item.name)),
        content: Text(t.deleteItemBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(t.cancel),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(t.delete),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _run(() async {
        final room = await _api.room(widget.inspectionId, widget.roomId);
        if (!await _ensureMediaUploaded(room, itemId: item.id)) return;
        await _api.deleteItem(widget.inspectionId, item.id);
      });
    }
  }

  /// A reviewed room with no items tells both parties there was nothing in it to
  /// record, so the drawer says exactly that and the request carries the
  /// confirmation the server requires.
  Future<void> _nothingToRecord(RoomDetail room) async {
    final confirmed = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text(t.nothingToRecordTitle(room.name)),
        content: Text(
          t.nothingToRecordBody,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(t.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(t.confirm),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _reviewRoom(nothingToRecord: true);
    }
  }

  Future<void> _reviewRoom({bool nothingToRecord = false}) => _run(() async {
    final room = await _api.room(widget.inspectionId, widget.roomId);
    if (!await _ensureMediaUploaded(room)) return;
    if (room.status != 'REVIEW' && room.status != 'REVIEWED') {
      await _api.finishRoom(widget.inspectionId, widget.roomId);
    }
    await _api.markRoomReviewed(
      widget.inspectionId,
      widget.roomId,
      nothingToRecord: nothingToRecord,
    );
  });

  Future<bool> _mediaUploaded(
    Iterable<String> serverCaptureIds, {
    String? itemId,
  }) async {
    final ownerId =
        widget.ownerId ?? Supabase.instance.client.auth.currentUser?.id;
    if (ownerId == null) {
      throw ApiFailure(t.signInAgain, 401);
    }
    final queue = widget.queue ?? CaptureQueue();
    late final ({int captures, int edits}) pending;
    late final List<String> unresolved;
    try {
      final root =
          await (widget.supportDirectory ?? getApplicationSupportDirectory)();
      final pickerIntent = File('${root.path}/capture-picker.json');
      if (await pickerIntent.exists()) {
        final intent =
            jsonDecode(await pickerIntent.readAsString())
                as Map<String, dynamic>;
        if (intent['ownerId'] == ownerId &&
            intent['inspectionId'] == widget.inspectionId &&
            intent['roomId'] == widget.roomId &&
            (itemId == null || intent['itemId'] == itemId)) {
          return false;
        }
      }
      unresolved = await CaptureStore(
        queue: queue,
        root: root,
      ).reconcile(ownerId, roomId: widget.roomId);
      if (itemId == null) {
        pending = await queue.pendingForRoom(
          widget.inspectionId,
          widget.roomId,
          ownerId,
          serverCaptureIds,
        );
      } else {
        final captures = await queue.forRoom(widget.roomId, ownerId);
        pending = (
          captures: captures
              .where((capture) => capture.itemId == itemId)
              .length,
          edits: 0,
        );
      }
    } finally {
      if (widget.queue == null) await queue.close();
    }
    return pending.captures == 0 && pending.edits == 0 && unresolved.isEmpty;
  }

  Future<bool> _ensureMediaUploaded(RoomDetail room, {String? itemId}) async {
    if (await _mediaUploaded(
      room.captures.map((capture) => capture.id),
      itemId: itemId,
    )) {
      return true;
    }
    if (!mounted) return false;
    await showKiviloDrawer<void>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text(t.stillUploading),
        content: Text(
          t.roomStillUploadingBody,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(t.ok),
          ),
        ],
      ),
    );
    return false;
  }

  Future<void> _rename(RoomDetail room) async {
    final controller = TextEditingController(text: room.name);
    final name = await showKiviloDrawer<String>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text(t.roomRename),
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
            child: Text(t.save),
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
        title: Text(t.roomActions),
        content: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: Text(t.roomRename),
              subtitle: Text(t.roomRenameDetail),
              onTap: () => Navigator.pop(context, 'rename'),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(
                Icons.delete_outline,
                color: KiviloColors.red,
              ),
              title: Text(
                t.roomDelete,
                style: TextStyle(color: KiviloColors.red),
              ),
              subtitle: Text(t.roomDeleteDetail),
              onTap: () => Navigator.pop(context, 'delete'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(t.close),
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
      final room = await _api.room(widget.inspectionId, widget.roomId);
      if (!await _ensureMediaUploaded(room)) return;
      if (!mounted) return;
      final confirmed = await showKiviloDrawer<bool>(
        context: context,
        builder: (context) => KiviloDrawer(
          title: Text(t.roomDeleteTitle),
          content: Text(
            t.roomDeleteBody,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(t.cancel),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(t.delete),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
      await _api.deleteRoom(widget.inspectionId, widget.roomId);
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => ProductScreen(
    screen: ProductScreenName.room,
    child: Scaffold(
      appBar: AppBar(
        centerTitle: false,
        toolbarHeight: 72,
        title: FutureBuilder<RoomDetail>(
          future: _future,
          builder: (context, snapshot) => PageContextTitle(
            title: snapshot.data?.name ?? t.room,
            contextLabel: [
              if (widget.inspectionKind != null)
                widget.inspectionKind == 'CHECK_OUT' ? t.checkOut : t.checkIn,
              if (widget.property != null) widget.property!,
              if (widget.inspectionKind == null && widget.property == null)
                t.roomInventory,
            ].join(' · '),
          ),
        ),
      ),
      body: KiviloContent(
        maxWidth: 1200,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 840;
            return RefreshIndicator(
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
                          child: Text(
                            t.roomOpenFailed(plainError(snapshot.error!)),
                          ),
                        ),
                      ],
                    );
                  }
                  final room = snapshot.data!;
                  final photos = room.captures
                      .where((capture) => capture.kind == 'PHOTO')
                      .length;
                  final videos = room.captures.length - photos;
                  final checkIn = room.checkIn;
                  final inventory = <Widget>[
                    if (checkIn != null) ...[
                      KiviloSectionHeading(
                        title: t.atCheckIn,
                        subtitle: checkIn.conductedAt == null
                            ? t.atCheckInSigned
                            : t.atCheckInSignedOn(shortDate(checkIn.conductedAt!)),
                        action: TextButton(
                          onPressed: () =>
                              setState(() => _showCheckIn = !_showCheckIn),
                          child: Text(_showCheckIn ? t.hide : t.show),
                        ),
                      ),
                      if (_showCheckIn) ...[
                        const SizedBox(height: 12),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(16, 16, 16, 6),
                            child: CheckInReferenceView(reference: checkIn),
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),
                    ],
                    KiviloSectionHeading(
                      title: t.inventory,
                      subtitle:
                          t.itemsInRoom(room.items.length),
                      action: widget.editable
                          ? TextButton.icon(
                              onPressed: _busy || _addingItem ? null : _addItem,
                              icon: const Icon(Icons.add),
                              label: Text(t.add),
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
                                t.inventoryEmpty,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                t.inventoryEmptyDetail,
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ],
                          ),
                        ),
                      ),
                    for (final item in room.items) ...[
                      _inventoryCard(
                        item,
                        room.captures,
                        checkIn?.lines
                            .where((line) => line.key == item.baselineKey)
                            .firstOrNull,
                      ),
                      const SizedBox(height: 10),
                    ],
                  ];
                  final media = <Widget>[
                    KiviloSectionHeading(
                      title: t.media,
                      subtitle: room.captures.isEmpty
                          ? t.mediaEmptyDetail
                          : room.captures.length == 1
                          ? t.mediaOne
                          : t.mediaMany(room.captures.length),
                      action: room.captures.length > 1
                          ? TextButton(
                              onPressed: () =>
                                  setState(() => _newestFirst = !_newestFirst),
                              child: Text(
                                _newestFirst ? t.newestFirst : t.oldestFirst,
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(height: 12),
                    if (widget.editable) ...[
                      OutlinedButton.icon(
                        onPressed: _busy ? null : _capture,
                        icon: const Icon(Icons.videocam_outlined),
                        label: Text(t.roomMediaWalkthrough),
                      ),
                      const SizedBox(height: 12),
                    ],
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
                                t.mediaEmpty,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                t.mediaEmptyUploading,
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ],
                          ),
                        ),
                      ),
                    if (room.captures.isNotEmpty)
                      if (wide)
                        SizedBox(
                          height: (constraints.maxHeight * .65).clamp(360, 560),
                          child: GridView.builder(
                            key: PageStorageKey('room-media-${widget.roomId}'),
                            primary: false,
                            gridDelegate:
                                const SliverGridDelegateWithMaxCrossAxisExtent(
                                  maxCrossAxisExtent: 220,
                                  childAspectRatio: 1.15,
                                  crossAxisSpacing: 10,
                                  mainAxisSpacing: 10,
                                ),
                            itemCount: room.captures.length,
                            itemBuilder: (_, index) {
                              final number = _newestFirst
                                  ? room.captures.length - index
                                  : index + 1;
                              return _evidenceCard(
                                room.captures[number - 1],
                                number,
                              );
                            },
                          ),
                        )
                      else
                        SizedBox(
                          height: 132,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: room.captures.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(width: 10),
                            itemBuilder: (_, index) {
                              // A capture keeps the number it was added with in either order.
                              final number = _newestFirst
                                  ? room.captures.length - index
                                  : index + 1;
                              return _evidenceCard(
                                room.captures[number - 1],
                                number,
                              );
                            },
                          ),
                        ),
                    if (widget.editable && room.status != 'REVIEWED') ...[
                      const SizedBox(height: 10),
                      Card(
                        color: KiviloColors.pinkSoft,
                        child: Padding(
                          padding: const EdgeInsets.all(18),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                t.finishRoom,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 5),
                              Text(
                                room.items.isEmpty
                                    ? t.finishRoomEmpty
                                    : t.finishRoomBody,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                              const SizedBox(height: 14),
                              FilledButton.icon(
                                onPressed: _busy || room.items.isEmpty
                                    ? null
                                    : _reviewRoom,
                                icon: const Icon(Icons.check_rounded),
                                label: Text(t.reviewedRoom),
                              ),
                              if (room.items.isEmpty) ...[
                                const SizedBox(height: 8),
                                OutlinedButton(
                                  onPressed: _busy
                                      ? null
                                      : () => _nothingToRecord(room),
                                  child: Text(t.nothingToRecord),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],
                  ];
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
                                    t.roomOffline,
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodyMedium,
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
                                Text(
                                  t.roomRecordEyebrow,
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
                                  style: Theme.of(
                                    context,
                                  ).textTheme.headlineMedium,
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
                              tooltip: t.roomActions,
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
                              t.roomCounts(room.items.length, photos, videos),
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
                                      ? t.roomFixedBody
                                      : switch (room.status) {
                                          'PENDING' =>
                                            t.roomPendingBody,
                                          'REVIEW' =>
                                            t.roomReviewBody,
                                          'REVIEWED' =>
                                            t.roomReviewedBody,
                                          _ =>
                                            t.roomCapturingBody,
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
                      const SizedBox(height: 30),
                      if (wide)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              flex: 3,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: inventory,
                              ),
                            ),
                            const SizedBox(width: 24),
                            Expanded(
                              flex: 2,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: media,
                              ),
                            ),
                          ],
                        )
                      else ...[
                        ...inventory,
                        const SizedBox(height: 20),
                        ...media,
                      ],
                      if (_busy)
                        const Center(child: CircularProgressIndicator()),
                    ],
                  );
                },
              ),
            );
          },
        ),
      ),
    ),
  );

  Widget _evidenceCard(EvidenceCapture capture, int number) => Semantics(
    label: capture.kind == 'PHOTO' ? t.photo : t.video,
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
                        ? MarkedNetworkPhoto(
                            url: capture.url,
                            annotations: capture.annotations,
                            fit: BoxFit.contain,
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
                        capture.kind == 'PHOTO' ? t.photoNumber(number) : t.videoNumber(number),
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

  /// Whether a check-out row no longer says what its check-in line did. Surrounding
  /// whitespace is not a difference: this app trims every field it saves and the web
  /// keeps what was typed, so either may have touched a field nobody changed.
  static bool _differs(String? was, String? now) =>
      (was ?? '').trim() != (now ?? '').trim();

  /// "serial: ABC123", or "no serial" when the check-in left it empty.
  static String _quoted(String field, String? value) {
    final trimmed = value?.trim() ?? '';
    return trimmed.isEmpty ? t.fieldNone(field) : t.fieldValue(field, trimmed);
  }

  /// [baseline] is the check-in line a check-out row was copied from, so what it was
  /// stays in view once it is edited.
  Widget _inventoryCard(
    InventoryItem item,
    List<EvidenceCapture> captures,
    CheckInLine? baseline,
  ) {
    final attached = captures
        .where((capture) => item.evidenceCaptureIds.contains(capture.id))
        .toList();
    // The condition, which is the comparison, and anything else only where this row
    // no longer says the same, each named, so "no serial" says the serial is new.
    // An addendum's line is marked as the reference marks it.
    final atCheckIn = baseline == null
        ? null
        : [
            baseline.update ? t.atCheckInUpdatedPrefix : t.atCheckInPrefix,
            [
              itemConditionLabels[baseline.condition] ?? baseline.condition,
              if (_differs(baseline.name, item.name))
                t.fieldValue(t.fieldName, baseline.name),
              if (baseline.quantity != item.quantity) '×${baseline.quantity}',
              if (_differs(baseline.identifier, item.identifier))
                _quoted(t.fieldSerial, baseline.identifier),
              if (_differs(baseline.meterReading, item.meterReading))
                _quoted(t.fieldReading, baseline.meterReading),
              if (_differs(baseline.notes, item.notes))
                _quoted(t.fieldNotes, baseline.notes),
            ].join(' · '),
          ].join(' ');
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: widget.editable && !_busy ? () => _openItem(item) : null,
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
                      tooltip: t.openItem,
                      visualDensity: VisualDensity.compact,
                      icon: const Icon(Icons.chevron_right, size: 22),
                      onPressed: _busy ? null : () => _openItem(item),
                    ),
                    IconButton(
                      tooltip: t.deleteItem,
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
                  _itemTag(itemCategoryLabels[item.category] ?? item.category),
                  _itemTag(itemConditionLabels[item.condition] ?? item.condition),
                  _itemTag(t.quantityShort(item.quantity)),
                ],
              ),
              if (item.identifier != null) ...[
                const SizedBox(height: 10),
                Text(
                  t.identifierLine(item.identifier!),
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
              if (item.meterReading != null) ...[
                const SizedBox(height: 5),
                Text(
                  t.readingLine(item.meterReading!),
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
              if (item.notes != null) ...[
                const SizedBox(height: 9),
                Text(
                  item.notes!,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
              if (atCheckIn != null) ...[
                const SizedBox(height: 9),
                Text(atCheckIn, style: Theme.of(context).textTheme.bodySmall),
              ],
              if (attached.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  t.attachedMedia,
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 7),
                Wrap(
                  spacing: 9,
                  runSpacing: 9,
                  children: [
                    for (final capture in attached)
                      _attachedMediaPreview(
                        item,
                        capture,
                        captures.indexOf(capture) + 1,
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _attachedMediaPreview(
    InventoryItem item,
    EvidenceCapture capture,
    int number,
  ) {
    final label = capture.kind == 'PHOTO' && capture.annotations != null
        ? t.markedPhotoNumber(number)
        : capture.kind == 'PHOTO'
        ? t.photoNumber(number)
        : t.videoNumber(number);
    return Semantics(
      button: true,
      label: t.openAttachedTo(label, item.name),
      child: SizedBox(
        width: 94,
        height: 104,
        child: Card(
          margin: EdgeInsets.zero,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: _busy
                ? null
                : () => unawaited(_handleEvidenceAction(capture, 'preview')),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: ColoredBox(
                    color: KiviloColors.canvas,
                    child: capture.kind == 'PHOTO'
                        ? MarkedNetworkPhoto(
                            url: capture.url,
                            annotations: capture.annotations,
                          )
                        : VideoPoster(
                            posterUrl: capture.posterUrl,
                            iconSize: 24,
                          ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 6,
                  ),
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ],
            ),
          ),
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
          tooltip: t.backToMediaActions,
        ),
        Text(t.note),
      ],
    ),
    content: TextField(
      controller: _controller,
      autofocus: true,
      minLines: 3,
      maxLines: 6,
      decoration: InputDecoration(
        labelText: t.note,
        hintText: t.noteHint,
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: Text(t.cancel),
      ),
      FilledButton(
        onPressed: () =>
            Navigator.pop(context, _EvidenceNoteResult.save(_controller.text)),
        child: Text(t.saveNote),
      ),
    ],
  );
}

class ItemEditor extends StatefulWidget {
  const ItemEditor({
    super.key,
    required this.item,
    required this.captures,
    required this.onSave,
    this.canLinkExistingMedia = true,
  });
  final InventoryItem item;
  final List<EvidenceCapture> captures;
  final Future<void> Function(Map<String, dynamic>) onSave;
  final bool canLinkExistingMedia;

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
  bool _showExistingMedia = false;
  bool _evidenceChanged = false;
  bool _saving = false;
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

  Future<void> _save() async {
    if (_saving) return;
    final count = int.tryParse(_quantity.text.trim());
    if (_name.text.trim().isEmpty || count == null || count < 1) {
      setState(
        () => _error = t.itemNameRequired,
      );
      return;
    }
    final data = <String, dynamic>{
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
      if (_evidenceChanged) 'evidenceCaptureIds': _evidenceCaptureIds.toList(),
    };
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onSave(data);
      if (!mounted) return;
      setState(() => _saving = false);
      Navigator.pop(context);
    } catch (error) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = plainError(error);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_saving,
    child: AbsorbPointer(
      absorbing: _saving,
      child: Padding(
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
              Text(
                t.editItem,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 4),
              Text(
                t.editItemDetail,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _name,
                decoration: InputDecoration(labelText: t.assetName),
              ),
              const SizedBox(height: 12),
              KiviloSelectField<String>(
                label: t.assetCategory,
                value: _category,
                options: [
                  KiviloSelectOption(value: 'FIXTURE', label: t.assetFixture),
                  KiviloSelectOption(value: 'APPLIANCE', label: t.assetAppliance),
                  KiviloSelectOption(value: 'FURNITURE', label: t.assetFurniture),
                  KiviloSelectOption(value: 'SURFACE', label: t.assetSurface),
                  KiviloSelectOption(value: 'METER', label: t.categoryMeter),
                ],
                onChanged: (value) => setState(() => _category = value),
              ),
              const SizedBox(height: 12),
              KiviloSelectField<String>(
                label: t.condition,
                value: _condition,
                options: [
                  KiviloSelectOption(value: 'NEW', label: t.conditionNew),
                  KiviloSelectOption(value: 'GOOD', label: t.conditionGood),
                  KiviloSelectOption(value: 'FAIR', label: t.conditionFair),
                  KiviloSelectOption(value: 'POOR', label: t.conditionPoor),
                  KiviloSelectOption(value: 'DAMAGED', label: t.conditionDamaged),
                ],
                onChanged: (value) => setState(() => _condition = value),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _quantity,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: t.quantity),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _identifier,
                decoration: InputDecoration(
                  labelText: t.makeModelSerial,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _meterReading,
                decoration: InputDecoration(labelText: t.meterReading),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _notes,
                minLines: 2,
                maxLines: 4,
                decoration: InputDecoration(labelText: t.notes),
              ),
              if (widget.captures.isNotEmpty) ...[
                const SizedBox(height: 12),
                if (widget.canLinkExistingMedia)
                  TextButton.icon(
                    onPressed: () => setState(
                      () => _showExistingMedia = !_showExistingMedia,
                    ),
                    icon: const Icon(Icons.link_outlined),
                    label: Text(
                      _showExistingMedia
                          ? t.hideRoomMedia
                          : t.linkRoomMedia,
                    ),
                  )
                else
                  Text(
                    t.finishUploadingBeforeLink,
                  ),
              ],
              if (_showExistingMedia) ...[
                const SizedBox(height: 4),
                Text(
                  t.linkRoomMediaDetail,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 10),
                if (widget.captures.isEmpty)
                  Text(t.noRoomMedia)
                else
                  ...widget.captures.indexed.map((entry) {
                    final (index, capture) = entry;
                    final selected = _evidenceCaptureIds.contains(capture.id);
                    final detail = [
                      if (capture.note?.trim().isNotEmpty ?? false)
                        capture.note!.trim(),
                      if (capture.annotations != null) t.hasPhotoMarks,
                    ].join(' · ');
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Material(
                        color: selected
                            ? KiviloColors.pinkSoft
                            : KiviloColors.canvas,
                        borderRadius: BorderRadius.circular(14),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: () => setState(() {
                            _evidenceChanged = true;
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
                                          ? MarkedNetworkPhoto(
                                              url: capture.url,
                                              annotations: capture.annotations,
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
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        capture.kind == 'PHOTO' ? t.photoNumber(index + 1) : t.videoNumber(index + 1),
                                        style: Theme.of(
                                          context,
                                        ).textTheme.labelLarge,
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
              ],
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: const TextStyle(color: KiviloColors.red)),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _saving ? null : _save,
                child: Text(_saving ? t.saving : t.saveChanges),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
