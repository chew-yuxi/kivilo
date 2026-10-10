import 'dart:async';

import 'package:flutter/material.dart';

import '../models/inspection.dart';
import '../services/api.dart';
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
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
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
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
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

  Future<void> _deleteRoom() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
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
    if (confirmed != true) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
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
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (_api.offlineCopy)
                const Card(
                  child: ListTile(
                    leading: Icon(Icons.cloud_off_outlined),
                    title: Text('Offline copy'),
                    subtitle: Text(
                      'Capture can continue; review edits need a connection.',
                    ),
                  ),
                ),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      room.name,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                  ),
                  if (widget.editable)
                    PopupMenuButton<String>(
                      onSelected: (value) =>
                          value == 'rename' ? _rename(room) : _deleteRoom(),
                      itemBuilder: (_) => const [
                        PopupMenuItem(
                          value: 'rename',
                          child: Text('Rename room'),
                        ),
                        PopupMenuItem(
                          value: 'delete',
                          child: Text('Delete room'),
                        ),
                      ],
                    ),
                ],
              ),
              Text(room.status == 'REVIEWED' ? 'Reviewed' : room.status),
              if (room.processingError != null) ...[
                const SizedBox(height: 8),
                Text(
                  room.processingError!,
                  style: const TextStyle(color: Colors.red),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ],
              if (widget.editable) ...[
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _busy ? null : _capture,
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Capture video or photos'),
                ),
                if (room.status == 'FAILED')
                  OutlinedButton.icon(
                    onPressed: _busy ? null : _capture,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Review captures and retry drafting'),
                  ),
              ],
              const SizedBox(height: 24),
              Text('Evidence', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              if (room.captures.isEmpty)
                const Text('No captures have reached the server yet.'),
              if (room.captures.isNotEmpty)
                SizedBox(
                  height: 112,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: room.captures.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (_, index) {
                      final capture = room.captures[index];
                      return Semantics(
                        label: capture.kind == 'PHOTO'
                            ? 'Photo evidence'
                            : 'Video evidence',
                        child: SizedBox(
                          width: 110,
                          child: capture.kind == 'PHOTO'
                              ? Image.network(
                                  capture.url,
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, _, _) =>
                                      const Icon(Icons.broken_image_outlined),
                                )
                              : const Card(
                                  child: Center(
                                    child: Icon(Icons.videocam_outlined),
                                  ),
                                ),
                        ),
                      );
                    },
                  ),
                ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Inventory',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  if (widget.editable)
                    TextButton.icon(
                      onPressed: _busy
                          ? null
                          : () => _run(
                              () => _api.addItem(
                                widget.inspectionId,
                                widget.roomId,
                              ),
                            ),
                      icon: const Icon(Icons.add),
                      label: const Text('Add item'),
                    ),
                ],
              ),
              if (room.items.isEmpty)
                const Text(
                  'No items drafted yet. Add an item or process your captures.',
                ),
              for (final item in room.items)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                item.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            if (widget.editable)
                              IconButton(
                                tooltip: 'Edit item',
                                icon: const Icon(Icons.edit_outlined),
                                onPressed: _busy ? null : () => _editItem(item),
                              ),
                            if (widget.editable)
                              IconButton(
                                tooltip: 'Delete item',
                                icon: const Icon(Icons.delete_outline),
                                onPressed: _busy
                                    ? null
                                    : () => _deleteItem(item),
                              ),
                          ],
                        ),
                        Text(
                          '${item.category} · ${item.condition} · Qty ${item.quantity}',
                        ),
                        if (item.identifier != null)
                          Text('Identifier: ${item.identifier}'),
                        if (item.meterReading != null)
                          Text('Reading: ${item.meterReading}'),
                        if (item.notes != null) Text(item.notes!),
                        if (!item.editedByHuman && item.confidence != null)
                          Text(
                            'AI draft · ${(item.confidence! * 100).round()}% confidence',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                      ],
                    ),
                  ),
                ),
              if (widget.editable && room.status == 'REVIEW') ...[
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _busy
                      ? null
                      : () => _run(
                          () => _api.markRoomReviewed(
                            widget.inspectionId,
                            widget.roomId,
                          ),
                        ),
                  child: const Text('I reviewed this room'),
                ),
              ],
              if (_busy) const Center(child: CircularProgressIndicator()),
            ],
          );
        },
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
          Text(
            'Edit inventory item',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          DropdownButtonFormField<String>(
            initialValue: _category,
            decoration: const InputDecoration(labelText: 'Category'),
            items: ['FIXTURE', 'APPLIANCE', 'FURNITURE', 'SURFACE', 'METER']
                .map(
                  (value) => DropdownMenuItem(value: value, child: Text(value)),
                )
                .toList(),
            onChanged: (value) => setState(() => _category = value!),
          ),
          DropdownButtonFormField<String>(
            initialValue: _condition,
            decoration: const InputDecoration(labelText: 'Condition'),
            items: ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']
                .map(
                  (value) => DropdownMenuItem(value: value, child: Text(value)),
                )
                .toList(),
            onChanged: (value) => setState(() => _condition = value!),
          ),
          TextField(
            controller: _quantity,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Quantity'),
          ),
          TextField(
            controller: _identifier,
            decoration: const InputDecoration(
              labelText: 'Make, model or serial',
            ),
          ),
          TextField(
            controller: _meterReading,
            decoration: const InputDecoration(labelText: 'Meter reading'),
          ),
          TextField(
            controller: _notes,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'Notes'),
          ),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          const SizedBox(height: 16),
          FilledButton(onPressed: _save, child: const Text('Save changes')),
        ],
      ),
    ),
  );
}
