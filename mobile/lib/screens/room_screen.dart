import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/inspection.dart';
import '../services/api.dart';
import '../services/capture_queue.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';
import 'capture_screen.dart';

class RoomScreen extends StatefulWidget {
  const RoomScreen({
    super.key,
    required this.inspectionId,
    required this.roomId,
    required this.editable,
  });

  final String inspectionId;
  final String roomId;
  final bool editable;

  @override
  State<RoomScreen> createState() => _RoomScreenState();
}

class _RoomScreenState extends State<RoomScreen> {
  final _api = Api();
  late Future<RoomDetail> _future = _load();
  Timer? _poller;
  bool _busy = false;
  String? _error;

  Future<RoomDetail> _load() async {
    final room = await _api.room(widget.inspectionId, widget.roomId);
    _poller?.cancel();
    if (mounted && room.status == 'PROCESSING') {
      _poller = Timer(const Duration(seconds: 5), () {
        if (mounted) {
          unawaited(
            _refresh().catchError((Object error) {
              if (mounted) setState(() => _error = '$error');
            }),
          );
        }
      });
    }
    return room;
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  @override
  void dispose() {
    _poller?.cancel();
    super.dispose();
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

  Future<void> _editItem(InventoryItem item) async {
    final data = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => ItemEditor(item: item),
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
        content: const Text('This removes the inventory line from the draft.'),
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
            title: const Text('Evidence is still syncing'),
            content: Text(
              'This room has ${pending.captures} saved capture(s) and '
              '${pending.edits} note, mark or deletion edit(s) waiting to sync. '
              'Open camera & evidence and retry uploads before deleting the room.',
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
                              ? 'This inventory is fixed for signing. Evidence remains available below.'
                              : switch (room.status) {
                                  'PENDING' =>
                                    'Start with a narrated walkthrough, then photograph labels and details.',
                                  'CAPTURING' =>
                                    'Keep capturing. When ready, draft the room inventory from your evidence.',
                                  'PROCESSING' =>
                                    'Kivilo is drafting the room inventory. This page will update when it is ready.',
                                  'REVIEW' =>
                                    'Check every drafted item against the evidence before marking this room reviewed.',
                                  'REVIEWED' =>
                                    'This room has been reviewed. You can still add evidence while the report is open.',
                                  _ =>
                                    'Drafting needs attention. Review captures and retry from the capture screen.',
                                },
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (room.processingError != null) ...[
                const SizedBox(height: 12),
                Card(
                  color: KiviloColors.redSoft,
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Text(
                      room.processingError!,
                      style: const TextStyle(color: KiviloColors.red),
                    ),
                  ),
                ),
              ],
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
                  label: const Text('Open camera & evidence'),
                ),
                if (room.status == 'FAILED') ...[
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: _busy ? null : _capture,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Review captures and retry drafting'),
                  ),
                ],
              ],
              const SizedBox(height: 30),
              KiviloSectionHeading(
                title: 'Evidence',
                subtitle: room.captures.isEmpty
                    ? 'The source record for this room'
                    : '${room.captures.length} synced ${room.captures.length == 1 ? 'capture' : 'captures'}',
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
                      final capture = room.captures[index];
                      return _evidenceCard(capture, index + 1);
                    },
                  ),
                ),
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
                          'Add an item or draft from your room captures.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ),
              for (final item in room.items) ...[
                _inventoryCard(item),
                const SizedBox(height: 10),
              ],
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
                          'Confirm every item against the photos and video. Your review makes this draft ready for the report.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 14),
                        FilledButton.icon(
                          onPressed: _busy
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
    label: capture.kind == 'PHOTO' ? 'Photo evidence' : 'Video evidence',
    child: SizedBox(
      width: 120,
      child: Card(
        clipBehavior: Clip.antiAlias,
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
                          errorBuilder: (_, _, _) => const Icon(
                            Icons.broken_image_outlined,
                            color: KiviloColors.subtle,
                          ),
                        )
                      : const Icon(
                          Icons.videocam_outlined,
                          size: 30,
                          color: KiviloColors.pinkDark,
                        ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
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
                  Text(
                    '${capture.kind == 'PHOTO' ? 'Photo' : 'Video'} $number',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _inventoryCard(InventoryItem item) => Card(
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
                  onPressed: _busy ? null : () => _editItem(item),
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
          if (!item.editedByHuman && item.confidence != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(
                  Icons.auto_awesome_outlined,
                  size: 15,
                  color: KiviloColors.pinkDark,
                ),
                const SizedBox(width: 5),
                Text(
                  'AI draft · ${(item.confidence! * 100).round()}% confidence',
                  style: const TextStyle(
                    color: KiviloColors.pinkDark,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    ),
  );

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

class ItemEditor extends StatefulWidget {
  const ItemEditor({super.key, required this.item});
  final InventoryItem item;

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
            'Confirm the details against room evidence.',
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
