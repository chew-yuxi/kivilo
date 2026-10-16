import 'package:flutter/material.dart';

import '../models/addenda.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';

const _categories = [
  KiviloSelectOption(value: 'FIXTURE', label: 'Fixture'),
  KiviloSelectOption(value: 'APPLIANCE', label: 'Appliance'),
  KiviloSelectOption(value: 'FURNITURE', label: 'Furniture'),
  KiviloSelectOption(value: 'SURFACE', label: 'Surface'),
  KiviloSelectOption(value: 'METER', label: 'Meter'),
];

const _conditions = [
  KiviloSelectOption(value: 'NEW', label: 'New'),
  KiviloSelectOption(value: 'GOOD', label: 'Good'),
  KiviloSelectOption(value: 'FAIR', label: 'Fair'),
  KiviloSelectOption(value: 'POOR', label: 'Poor'),
  KiviloSelectOption(value: 'DAMAGED', label: 'Damaged'),
];

/// One change on a draft update, new or saved: a line added, a line replaced, or a line
/// removed. A replacement or removal names the line it changes, and the room follows
/// that line, so only an added line asks for one. Pops with the body the entry
/// endpoints take; the server validates it again.
class AddendumEntryScreen extends StatefulWidget {
  const AddendumEntryScreen({
    super.key,
    this.entry,
    required this.rooms,
    required this.targets,
  });

  final DraftEntry? entry;
  final List<String> rooms;
  final List<AddendumTarget> targets;

  @override
  State<AddendumEntryScreen> createState() => _AddendumEntryScreenState();
}

class _AddendumEntryScreenState extends State<AddendumEntryScreen> {
  late String _change = widget.entry?.change ?? 'ADDED';
  // A line no longer in the report (an earlier update removed it) is chosen again.
  late String _target =
      widget.targets.any((target) => target.key == widget.entry?.targetKey)
      ? widget.entry!.targetKey!
      : '';
  late String _category = widget.entry?.category ?? 'APPLIANCE';
  late String _condition = widget.entry?.condition ?? 'NEW';
  late final _room = TextEditingController(text: widget.entry?.roomName ?? '');
  late final _name = TextEditingController(text: widget.entry?.name ?? '');
  late final _identifier = TextEditingController(
    text: widget.entry?.identifier ?? '',
  );
  late final _quantity = TextEditingController(
    text: '${widget.entry?.quantity ?? 1}',
  );
  late final _notes = TextEditingController(text: widget.entry?.notes ?? '');
  String? _error;

  @override
  void dispose() {
    _room.dispose();
    _name.dispose();
    _identifier.dispose();
    _quantity.dispose();
    _notes.dispose();
    super.dispose();
  }

  String? _text(TextEditingController controller) =>
      controller.text.trim().isEmpty ? null : controller.text.trim();

  void _save() {
    final added = _change == 'ADDED';
    final removed = _change == 'REMOVED';
    final problem = added && _text(_room) == null
        ? 'Choose the room.'
        : !added && _target.isEmpty
        ? 'Choose the item this replaces or removes.'
        : !removed && _text(_name) == null
        ? 'Name the new item.'
        : null;
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    Navigator.of(context).pop(<String, dynamic>{
      'change': _change,
      'roomName': added ? _text(_room) : '',
      'targetKey': added ? null : _target,
      'name': removed ? null : _text(_name),
      'category': removed ? null : _category,
      'condition': removed ? null : _condition,
      'quantity': (int.tryParse(_quantity.text.trim()) ?? 1).clamp(1, 999),
      'identifier': removed ? null : _text(_identifier),
      'notes': _text(_notes),
    });
  }

  @override
  Widget build(BuildContext context) {
    final added = _change == 'ADDED';
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.entry == null ? 'Add a change' : 'Edit change'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        children: [
          KiviloSelectField<String>(
            label: 'Change',
            value: _change,
            options: const [
              KiviloSelectOption(value: 'ADDED', label: 'Added'),
              KiviloSelectOption(value: 'REPLACED', label: 'Replaced'),
              KiviloSelectOption(value: 'REMOVED', label: 'Removed'),
            ],
            onChanged: (value) => setState(() => _change = value),
          ),
          const SizedBox(height: 12),
          if (added) ...[
            TextField(
              controller: _room,
              decoration: const InputDecoration(labelText: 'Room'),
            ),
            if (widget.rooms.isNotEmpty) ...[
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                children: [
                  for (final room in widget.rooms)
                    ActionChip(
                      label: Text(room),
                      onPressed: () => setState(() => _room.text = room),
                    ),
                ],
              ),
            ],
          ] else
            KiviloSelectField<String>(
              label: 'Item it changes',
              value: _target,
              options: [
                const KiviloSelectOption(value: '', label: 'Which item?'),
                for (final target in widget.targets)
                  KiviloSelectOption(value: target.key, label: target.label),
              ],
              onChanged: (value) => setState(() => _target = value),
            ),
          if (_change != 'REMOVED') ...[
            const SizedBox(height: 12),
            TextField(
              controller: _name,
              decoration: const InputDecoration(
                labelText: 'New item',
                hintText: 'e.g. Dishwasher',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _identifier,
              decoration: const InputDecoration(
                labelText: 'Make, model and serial',
              ),
            ),
            const SizedBox(height: 12),
            KiviloSelectField<String>(
              label: 'Category',
              value: _category,
              options: _categories,
              onChanged: (value) => setState(() => _category = value),
            ),
            const SizedBox(height: 12),
            KiviloSelectField<String>(
              label: 'Condition',
              value: _condition,
              options: _conditions,
              onChanged: (value) => setState(() => _condition = value),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _quantity,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Quantity'),
            ),
          ],
          const SizedBox(height: 12),
          TextField(
            controller: _notes,
            minLines: 2,
            maxLines: 5,
            decoration: const InputDecoration(labelText: 'Notes'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: KiviloColors.red)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _save,
            child: Text(widget.entry == null ? 'Add change' : 'Save change'),
          ),
        ],
      ),
    );
  }
}
