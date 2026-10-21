import 'package:flutter/material.dart';

import '../models/inspection.dart';
import '../services/api_failure.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/marked_network_photo.dart';

/// Choose a line with its evidence in view, then write the finding on the same route.
/// Selection changes and a failed save leave the agent's draft intact.
class FindingEditorScreen extends StatefulWidget {
  const FindingEditorScreen({
    super.key,
    this.finding,
    required this.maintenanceHistory,
    this.checkOutItems = const [],
    this.checkInItems = const [],
    required this.onSave,
    this.onSaveAndAddPhotos,
    this.onRemove,
  });

  final Finding? finding;
  final List<Map<String, dynamic>> maintenanceHistory;
  final List<ComparableItem> checkOutItems;
  final List<ComparableItem> checkInItems;
  final Future<void> Function(Map<String, dynamic>) onSave;
  final Future<void> Function(Map<String, dynamic>)? onSaveAndAddPhotos;
  final Future<void> Function()? onRemove;

  @override
  State<FindingEditorScreen> createState() => _FindingEditorScreenState();
}

class _FindingEditorScreenState extends State<FindingEditorScreen> {
  late bool _choosing = widget.finding == null;
  bool _fromCheckIn = false;
  bool _selectedAtCheckIn = false;
  ComparableItem? _selected;
  String? _roomId;
  final _search = TextEditingController();
  final _chooserScroll = ScrollController();
  double _chooserOffset = 0;
  late final _rationale = TextEditingController(
    text: widget.finding?.rationale,
  );
  late final _cost = TextEditingController(text: widget.finding?.estimatedCost);
  late String _changeType = widget.finding?.changeType ?? 'DAMAGE';
  late String _verdict = widget.finding?.verdict ?? 'UNDECIDED';
  late String? _maintenanceCaseId = widget.finding?.maintenanceCaseId;
  bool _changeChosen = false;
  bool _saving = false;
  bool _showItemDetails = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final finding = widget.finding;
    if (finding == null) return;
    _selected = widget.checkOutItems
        .where((item) => item.id == finding.itemId)
        .firstOrNull;
    if (_selected == null) {
      _selected = widget.checkInItems
          .where((item) => item.id == finding.baselineItemId)
          .firstOrNull;
      _selectedAtCheckIn = _selected != null;
    }
  }

  @override
  void dispose() {
    _search.dispose();
    _chooserScroll.dispose();
    _rationale.dispose();
    _cost.dispose();
    super.dispose();
  }

  List<ComparableItem> get _sourceItems => _fromCheckIn
      ? widget.checkInItems
            .where((item) => item.includedAtCheckOutStart != false)
            .toList()
      : widget.checkOutItems;

  void _choose(ComparableItem item) {
    if (_chooserScroll.hasClients) _chooserOffset = _chooserScroll.offset;
    FocusScope.of(context).unfocus();
    setState(() {
      _selected = item;
      _selectedAtCheckIn = _fromCheckIn;
      _choosing = false;
      _showItemDetails = false;
      _error = null;
      if (!_changeChosen) _changeType = _fromCheckIn ? 'MISSING' : 'DAMAGE';
    });
  }

  void _showChooser() {
    FocusScope.of(context).unfocus();
    setState(() => _choosing = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _chooserScroll.hasClients) {
        _chooserScroll.jumpTo(
          _chooserOffset.clamp(0, _chooserScroll.position.maxScrollExtent),
        );
      }
    });
  }

  void _back() {
    if (_saving) return;
    if (widget.finding == null && !_choosing) {
      _showChooser();
    } else {
      Navigator.pop(context);
    }
  }

  Future<void> _persist(Future<void> Function() action) async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final route = ModalRoute.of(context);
    try {
      await action();
      if (mounted) {
        final navigator = Navigator.of(context);
        if (route == null || route.isCurrent) {
          navigator.pop(true);
        } else {
          navigator.removeRoute(route, true);
        }
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = plainError(error);
        });
      }
    }
  }

  Future<void> _save({bool addPhotos = false}) async {
    if (_saving) return;
    final cost = _cost.text.trim();
    final error = widget.finding == null && _selected == null
        ? 'Choose an item first.'
        : _rationale.text.trim().isEmpty
        ? 'Describe what changed and why.'
        : cost.isNotEmpty && !RegExp(r'^\d{1,8}(\.\d{1,2})?$').hasMatch(cost)
        ? 'Enter a cost with up to 2 decimal places.'
        : null;
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    final fields = <String, dynamic>{
      'changeType': _changeType,
      'verdict': _verdict,
      'rationale': _rationale.text.trim(),
      'estimatedCost': cost.isEmpty ? null : cost,
      if (widget.finding == null) ...{
        'itemId': _selectedAtCheckIn ? null : _selected!.id,
        'baselineItemId': _selectedAtCheckIn ? _selected!.id : null,
      } else
        'maintenanceCaseId': _maintenanceCaseId,
    };
    await _persist(
      () => addPhotos
          ? widget.onSaveAndAddPhotos!(fields)
          : widget.onSave(fields),
    );
  }

  @override
  Widget build(BuildContext context) => PopScope<bool>(
    canPop: !_saving && (_choosing || widget.finding != null),
    onPopInvokedWithResult: (didPop, _) {
      if (!didPop && !_saving) _back();
    },
    child: Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: _back),
        title: Text(
          _choosing
              ? 'Choose an item'
              : widget.finding == null
              ? 'Add finding'
              : 'Review finding',
        ),
        actions: [
          TextButton(
            onPressed: _saving ? null : () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
      body: KiviloContent(child: _choosing ? _chooser() : _form()),
    ),
  );

  Widget _chooser() {
    final items = _sourceItems;
    final rooms = <String, String>{};
    for (final item in items) {
      if (item.roomId != null) rooms[item.roomId!] = item.roomName ?? 'Room';
    }
    final roomLabels = <String, String>{};
    for (final entry in rooms.entries) {
      final sameName = rooms.entries
          .where((room) => room.value == entry.value)
          .toList();
      roomLabels[entry.key] = sameName.length > 1
          ? '${entry.value} (${sameName.indexWhere((room) => room.key == entry.key) + 1})'
          : entry.value;
    }
    final terms = _search.text
        .toLowerCase()
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty);
    final filtered = items.where((item) {
      if (_roomId != null && item.roomId != _roomId) return false;
      final text = [
        item.label,
        item.name,
        item.roomName,
        item.category,
        item.identifier,
        item.notes,
        item.meterReading,
        item.condition,
        item.checkIn?.name,
        item.checkIn?.notes,
        item.checkIn?.identifier,
      ].whereType<String>().join(' ').toLowerCase();
      return terms.every(text.contains);
    }).toList();
    final groups = <String, List<ComparableItem>>{};
    for (final item in filtered) {
      (groups[item.roomId ?? 'legacy'] ??= []).add(item);
    }
    final rows = <({String? heading, ComparableItem? item})>[];
    for (final entry in groups.entries) {
      rows.add((heading: roomLabels[entry.key] ?? 'Items', item: null));
      rows.addAll(entry.value.map((item) => (heading: null, item: item)));
    }
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: TextField(
            controller: _search,
            textInputAction: TextInputAction.search,
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) => FocusScope.of(context).unfocus(),
            decoration: InputDecoration(
              labelText: 'Search items, rooms or serial numbers',
              suffixIcon: _search.text.isEmpty
                  ? null
                  : TextButton(
                      onPressed: () => setState(() => _search.clear()),
                      child: const Text('Clear'),
                    ),
            ),
          ),
        ),
        Expanded(
          child: CustomScrollView(
            controller: _chooserScroll,
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      KiviloSegmentedControl<bool>(
                        value: _fromCheckIn,
                        options: const [
                          KiviloSegmentOption(
                            value: false,
                            label: 'At check-out',
                          ),
                          KiviloSegmentOption(
                            value: true,
                            label: 'At check-in',
                          ),
                        ],
                        onChanged: (value) => setState(() {
                          _fromCheckIn = value!;
                          _roomId = null;
                          _chooserOffset = 0;
                        }),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _fromCheckIn
                            ? 'For an item no longer here at check-out.'
                            : 'Choose an item using its photos and recorded condition.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      if (rooms.length > 1) ...[
                        const SizedBox(height: 8),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              ChoiceChip(
                                label: const Text('All rooms'),
                                selected: _roomId == null,
                                onSelected: (_) =>
                                    setState(() => _roomId = null),
                              ),
                              for (final room in roomLabels.entries) ...[
                                const SizedBox(width: 8),
                                ChoiceChip(
                                  label: Text(room.value),
                                  selected: _roomId == room.key,
                                  onSelected: (_) =>
                                      setState(() => _roomId = room.key),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 8),
                      Text(
                        '${filtered.length} ${filtered.length == 1 ? 'item' : 'items'}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
              if (filtered.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        items.isEmpty
                            ? 'No items recorded in this inventory.'
                            : 'No matching items. Try another room, name or serial number.',
                      ),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                  sliver: SliverList.builder(
                    itemCount: rows.length,
                    itemBuilder: (context, index) {
                      final row = rows[index];
                      if (row.heading != null) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Text(
                            row.heading!,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        );
                      }
                      final item = row.item!;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Card(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () => _choose(item),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: _ItemInformation(
                                item: item,
                                atCheckIn: _fromCheckIn,
                                compact: true,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _choices(
    String label,
    String value,
    Map<String, String> options,
    ValueChanged<String> change,
  ) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: Theme.of(context).textTheme.titleSmall),
      const SizedBox(height: 8),
      Wrap(
        spacing: 8,
        runSpacing: 4,
        children: [
          for (final option in options.entries)
            ChoiceChip(
              label: Text(option.value),
              selected: option.key == value,
              onSelected: _saving ? null : (_) => change(option.key),
            ),
        ],
      ),
    ],
  );

  Widget _form() => Column(
    children: [
      Expanded(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          children: [
            if (_selected != null) ...[
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Selected item',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ),
                  if (widget.finding == null)
                    TextButton(
                      onPressed: _saving ? null : _showChooser,
                      child: const Text('Change item'),
                    ),
                ],
              ),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _ItemInformation(
                        item: _selected!,
                        atCheckIn: _selectedAtCheckIn,
                        compact: !_showItemDetails,
                        enabled: !_saving,
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: _saving
                              ? null
                              : () => setState(
                                  () => _showItemDetails = !_showItemDetails,
                                ),
                          child: Text(
                            _showItemDetails
                                ? 'Hide item details'
                                : 'Show item details',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ] else if (widget.finding != null)
              Text(
                widget.finding!.itemLabel ??
                    widget.finding!.baselineLabel ??
                    widget.finding!.changeType,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            const SizedBox(height: 24),
            _choices(
              'Change',
              _changeType,
              const {
                'DAMAGE': 'Damage',
                'WEAR': 'Wear',
                'MISSING': 'Missing',
                'IMPROVED': 'Improved',
                'UNCHANGED': 'Unchanged',
              },
              (value) => setState(() {
                _changeType = value;
                _changeChosen = true;
              }),
            ),
            const SizedBox(height: 20),
            _choices('Verdict', _verdict, const {
              'UNDECIDED': 'Undecided',
              'TENANT_LIABLE': 'Tenant liable',
              'FAIR_WEAR': 'Fair wear',
              'DISPUTED': 'Disputed',
            }, (value) => setState(() => _verdict = value)),
            const SizedBox(height: 20),
            TextField(
              controller: _rationale,
              enabled: !_saving,
              minLines: 3,
              maxLines: 6,
              decoration: const InputDecoration(labelText: 'Rationale'),
            ),
            if (widget.finding != null) ...[
              const SizedBox(height: 16),
              KiviloSelectField<String?>(
                label: 'Maintenance media',
                value: _maintenanceCaseId,
                options: [
                  const KiviloSelectOption<String?>(
                    value: null,
                    label: 'No linked maintenance record',
                  ),
                  for (final item in widget.maintenanceHistory)
                    KiviloSelectOption<String?>(
                      value: item['id'] as String,
                      label: item['title'] as String,
                    ),
                ],
                enabled: !_saving,
                onChanged: (value) =>
                    setState(() => _maintenanceCaseId = value),
              ),
            ],
            const SizedBox(height: 16),
            TextField(
              controller: _cost,
              enabled: !_saving,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Estimated cost (SGD)',
              ),
            ),
            if (widget.onSaveAndAddPhotos != null) ...[
              const SizedBox(height: 20),
              Text(
                'Finding photos',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 6),
              const Text(
                'Save this finding, then take or choose photos. '
                'Circle details and add notes before each photo uploads. '
                'Photos stay with this assessment; the signed inventory stays unchanged.',
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _saving ? null : () => _save(addPhotos: true),
                icon: const Icon(Icons.add_a_photo_outlined),
                label: const Text('Save & add photos'),
              ),
            ],
            if (widget.finding != null && widget.onRemove != null) ...[
              const SizedBox(height: 8),
              TextButton(
                onPressed: _saving ? null : () => _persist(widget.onRemove!),
                child: const Text('Remove finding'),
              ),
            ],
          ],
        ),
      ),
      Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: KiviloColors.border)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
        child: SafeArea(
          top: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_error != null) ...[
                Semantics(
                  liveRegion: true,
                  child: Text(
                    _error!,
                    style: const TextStyle(color: KiviloColors.red),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              FilledButton(
                onPressed: _saving ? null : _save,
                child: Text(
                  _saving
                      ? 'Saving…'
                      : widget.finding == null
                      ? 'Add finding'
                      : 'Save reviewed finding',
                ),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

class _ItemInformation extends StatelessWidget {
  const _ItemInformation({
    required this.item,
    required this.atCheckIn,
    this.compact = false,
    this.enabled = true,
  });
  final ComparableItem item;
  final bool atCheckIn;
  final bool compact;
  final bool enabled;

  String _condition(String value) => value.toLowerCase().replaceAll('_', ' ');

  Future<void> _view(
    BuildContext context,
    ComparablePhoto photo,
    String source,
  ) => Navigator.of(context).push<void>(
    MaterialPageRoute(
      builder: (_) => Scaffold(
        appBar: AppBar(title: Text(source)),
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Center(
            child: InteractiveViewer(
              minScale: 0.8,
              maxScale: 5,
              child: MarkedNetworkPhoto(
                url: photo.url,
                annotations: photo.annotations,
                semanticLabel: photo.note ?? source,
                fit: BoxFit.contain,
              ),
            ),
          ),
        ),
      ),
    ),
  );

  Widget _photo(
    BuildContext context,
    ComparablePhoto photo,
    String source,
    double size,
  ) => Semantics(
    button: true,
    enabled: enabled,
    label: 'Open $source photo${photo.note == null ? '' : ': ${photo.note}'}',
    child: InkWell(
      onTap: enabled ? () => _view(context, photo, source) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: size,
              height: size * 0.8,
              child: ColoredBox(
                color: KiviloColors.canvas,
                child: MarkedNetworkPhoto(
                  url: photo.url,
                  annotations: photo.annotations,
                  semanticLabel: photo.note ?? '$source photo',
                  fit: BoxFit.contain,
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          SizedBox(
            width: size,
            child: Text(source, style: Theme.of(context).textTheme.bodySmall),
          ),
          if (!compact && photo.note?.trim().isNotEmpty == true)
            SizedBox(
              width: size,
              child: Text(
                photo.note!,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
        ],
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final before = item.checkIn;
    final currentPhotos = item.photos;
    final first = currentPhotos.firstOrNull ?? before?.photos.firstOrNull;
    final firstSource = currentPhotos.isNotEmpty
        ? (atCheckIn ? 'At check-in' : 'At check-out')
        : 'At check-in';
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (compact && first != null) ...[
              _photo(context, first, firstSource, 76),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.displayName, style: text.titleMedium),
                  if (item.roomName != null)
                    Text(item.roomName!, style: text.bodySmall),
                  if (item.identifier?.trim().isNotEmpty == true)
                    Text(
                      'Serial / ID: ${item.identifier}',
                      style: text.bodyMedium,
                    ),
                  if (item.quantity != null && item.quantity! > 1)
                    Text('Quantity: ${item.quantity}', style: text.bodySmall),
                  if (item.meterReading?.trim().isNotEmpty == true)
                    Text('Meter: ${item.meterReading}', style: text.bodyMedium),
                ],
              ),
            ),
          ],
        ),
        if (item.condition != null || before != null) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 16,
            runSpacing: 4,
            children: [
              if (before != null && !atCheckIn)
                Text(
                  'Check-in: ${_condition(before.condition)}',
                  style: text.bodySmall,
                ),
              if (item.condition != null)
                Text(
                  '${atCheckIn ? 'Check-in' : 'Check-out'}: ${_condition(item.condition!)}',
                  style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
            ],
          ),
        ],
        if (before?.notes?.trim().isNotEmpty == true &&
            before!.notes != item.notes) ...[
          const SizedBox(height: 8),
          Text(
            'Check-in: ${before.notes}',
            maxLines: compact ? 2 : null,
            overflow: compact ? TextOverflow.ellipsis : null,
            style: text.bodySmall,
          ),
        ],
        if (item.notes?.trim().isNotEmpty == true) ...[
          const SizedBox(height: 8),
          Text(
            '${atCheckIn ? 'Check-in' : 'Check-out'}: ${item.notes}',
            maxLines: compact ? 2 : null,
            overflow: compact ? TextOverflow.ellipsis : null,
            style: text.bodyMedium,
          ),
        ],
        if (atCheckIn && item.representedAtCheckOut == true) ...[
          const SizedBox(height: 8),
          Text('Also listed at check-out', style: text.bodySmall),
        ],
        if (!compact) ...[
          const SizedBox(height: 12),
          if (currentPhotos.isEmpty && (before?.photos.isEmpty ?? true))
            Text(
              'No linked photos recorded for this item.',
              style: text.bodySmall,
            )
          else
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                for (final photo in before?.photos ?? <ComparablePhoto>[])
                  _photo(context, photo, 'At check-in', 120),
                for (final photo in currentPhotos)
                  _photo(
                    context,
                    photo,
                    atCheckIn ? 'At check-in' : 'At check-out',
                    120,
                  ),
              ],
            ),
        ],
      ],
    );
  }
}
