import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api.dart';
import '../services/capture_queue.dart';
import '../services/read_cache.dart';
import '../models/agency.dart';
import '../services/product_events.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';

class NewInspectionScreen extends StatefulWidget {
  const NewInspectionScreen({
    super.key,
    this.api,
    this.initialAgency,
    this.cache,
  });
  final AgencySummary? initialAgency;
  final Api? api;
  final ReadCache? cache;

  @override
  State<NewInspectionScreen> createState() => _NewInspectionScreenState();
}

class _NewInspectionScreenState extends State<NewInspectionScreen> {
  final _form = GlobalKey<FormState>();
  late final _api = widget.api ?? Api();
  late final ReadCache _cache = widget.cache ?? ReadCache();
  late AgencySummary? _agency = widget.initialAgency;

  /// Sent with the create, so a retry after a lost response returns the same check-in.
  String _clientId = newCaptureId();

  int _bedrooms = 2;
  int _bathrooms = 2;
  final _extras = <String, bool>{
    'Living room': true,
    'Dining area': false,
    'Kitchen': true,
    'Balcony': false,
    'Utility room': false,
  };
  final _custom = <String>[];
  final _customRoom = TextEditingController();
  int _draftRevision = 0;
  Future<void> _pendingDraftWrite = Future.value();

  static const _draftKey = 'new-check-in-draft';

  /// The rooms the check-in starts with, in walking order. Each gets the standard
  /// editable lines for its name and the furnishing level, as a room added later does.
  List<String> get _rooms => [
    for (final name in ['Living room', 'Dining area', 'Kitchen'])
      if (_extras[name]!) name,
    for (var i = 1; i <= _bedrooms; i++)
      _bedrooms == 1 ? 'Bedroom' : 'Bedroom $i',
    for (var i = 1; i <= _bathrooms; i++)
      _bathrooms == 1 ? 'Bathroom' : 'Bathroom $i',
    for (final name in ['Balcony', 'Utility room'])
      if (_extras[name]!) name,
    ..._custom,
  ];
  final _fields = <String, TextEditingController>{
    for (final name in [
      'line1',
      'unit',
      'postalCode',
      'landlordName',
      'landlordEmail',
      'tenantName',
      'tenantEmail',
      'monthlyRent',
      'deposit',
    ])
      name: TextEditingController(),
  };
  String _propertyType = 'PRIVATE_NON_LANDED';
  String? _furnishingLevel;
  DateTime _startDate = DateTime.now();
  late DateTime _endDate = DateTime(
    _startDate.year + 2,
    _startDate.month,
    _startDate.day,
  );
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    for (final controller in _fields.values) {
      controller.addListener(_saveDraft);
    }
    unawaited(_restoreDraft());
  }

  @override
  void dispose() {
    for (final controller in _fields.values) {
      controller.dispose();
    }
    _customRoom.dispose();
    super.dispose();
  }

  /// An interrupted setup (a call, the app closed) comes back as it was left.
  Future<void> _restoreDraft() async {
    final revision = _draftRevision;
    final value = await _cache.read(_draftKey);
    // Typing while the read is in flight takes precedence over the saved copy.
    if (!mounted || revision != _draftRevision || value is! Map) return;
    final draft = value.cast<String, dynamic>();
    final fields = (draft['fields'] as Map?)?.cast<String, dynamic>() ?? {};
    for (final entry in _fields.entries) {
      entry.value.text = fields[entry.key] as String? ?? '';
    }
    setState(() {
      _clientId = draft['clientId'] as String? ?? _clientId;
      _propertyType = draft['propertyType'] as String? ?? _propertyType;
      _furnishingLevel = draft['furnishingLevel'] as String?;
      _startDate =
          DateTime.tryParse(draft['startDate'] as String? ?? '') ?? _startDate;
      _endDate =
          DateTime.tryParse(draft['endDate'] as String? ?? '') ?? _endDate;
      _bedrooms = draft['bedrooms'] as int? ?? _bedrooms;
      _bathrooms = draft['bathrooms'] as int? ?? _bathrooms;
      final extras = (draft['extras'] as Map?)?.cast<String, dynamic>() ?? {};
      for (final name in _extras.keys) {
        _extras[name] = extras[name] as bool? ?? _extras[name]!;
      }
      _custom
        ..clear()
        ..addAll(((draft['custom'] as List?) ?? const []).cast<String>());
    });
  }

  void _saveDraft() {
    _draftRevision++;
    final snapshot = {
      'clientId': _clientId,
      'fields': {
        for (final entry in _fields.entries) entry.key: entry.value.text,
      },
      'propertyType': _propertyType,
      'furnishingLevel': _furnishingLevel,
      'startDate': _iso(_startDate),
      'endDate': _iso(_endDate),
      'bedrooms': _bedrooms,
      'bathrooms': _bathrooms,
      'extras': {..._extras},
      'custom': [..._custom],
    };
    // Each write waits for the one before, so an older copy never replaces a newer one.
    _pendingDraftWrite = _pendingDraftWrite.then((_) async {
      try {
        await _cache.write(_draftKey, snapshot);
      } catch (error) {
        debugPrint('Could not save the check-in draft: $error');
      }
    });
  }

  void _change(VoidCallback change) {
    setState(change);
    _saveDraft();
  }

  void _addCustomRoom() {
    final name = _customRoom.text.trim();
    if (name.isEmpty) return;
    _customRoom.clear();
    _change(() => _custom.add(name));
  }

  String _iso(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  Future<void> _pickDate(bool start) async {
    final selected = await showDatePicker(
      context: context,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
      initialDate: start ? _startDate : _endDate,
    );
    if (selected != null && mounted) {
      _change(() {
        if (start) {
          _startDate = selected;
        } else {
          _endDate = selected;
        }
      });
    }
  }

  Future<void> _chooseWorkspace() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final index = await _api.agencies();
      if (!mounted) return;
      final selection = await showKiviloDrawer<String>(
        context: context,
        builder: (context) => KiviloDrawer(
          title: const Text('Who owns this work?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                title: const Text('Personal'),
                subtitle: const Text(
                  'Private to you until you add collaborators',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.pop(context, 'personal'),
              ),
              for (final agency in index.agencies)
                ListTile(
                  title: Text(agency.name),
                  subtitle: const Text(
                    'Assigned agents and team owners and managers can access this work',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pop(context, agency.id),
                ),
              if (index.agencies.isEmpty)
                const Text('Create or join a team in Account → Team.'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
          ],
        ),
      );
      if (selection != null && mounted) {
        setState(
          () => _agency = selection == 'personal'
              ? null
              : index.agencies.firstWhere((agency) => agency.id == selection),
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _create() async {
    FocusManager.instance.primaryFocus?.unfocus();
    if (!_form.currentState!.validate()) return;
    if (_furnishingLevel == null) {
      setState(
        () => _error = 'Choose the property furnishing level.',
      );
      return;
    }
    if (!_endDate.isAfter(_startDate)) {
      setState(() => _error = 'The tenancy must end after it starts.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      String value(String key) => _fields[key]!.text.trim();
      final id = await _api.createInspection({
        'agencyId': ?_agency?.id,
        'line1': value('line1'),
        'unit': value('unit').isEmpty ? null : value('unit'),
        'postalCode': value('postalCode'),
        'propertyType': _propertyType,
        'furnishingLevel': _furnishingLevel,
        'landlordName': value('landlordName'),
        'landlordEmail': value('landlordEmail').isEmpty
            ? null
            : value('landlordEmail'),
        'tenantName': value('tenantName'),
        'tenantEmail': value('tenantEmail').isEmpty
            ? null
            : value('tenantEmail'),
        'startDate': _iso(_startDate),
        'endDate': _iso(_endDate),
        'monthlyRent': value('monthlyRent').isEmpty
            ? '0'
            : value('monthlyRent'),
        'deposit': value('deposit').isEmpty ? '0' : value('deposit'),
        'clientId': _clientId,
        'rooms': _rooms,
      });
      await _pendingDraftWrite;
      try {
        await _cache.remove(_draftKey);
      } catch (error) {
        // The check-in exists; a stale local draft must not look like a failed create.
        debugPrint('Could not clear the check-in draft: $error');
      }
      if (mounted) Navigator.pop(context, id);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _textField(
    String key,
    String label, {
    bool required = false,
    TextInputType? keyboardType,
  }) => TextFormField(
    controller: _fields[key],
    decoration: InputDecoration(
      labelText: '$label (${required ? 'required' : 'optional'})',
    ),
    keyboardType: keyboardType,
    onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
    validator: (value) {
      final text = value?.trim() ?? '';
      if (required && text.isEmpty) return '$label is required';
      if (text.isNotEmpty &&
          keyboardType == TextInputType.emailAddress &&
          !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(text)) {
        return 'Enter a valid email address';
      }
      if (text.isNotEmpty &&
          (key == 'monthlyRent' || key == 'deposit') &&
          !RegExp(r'^\d{1,8}(\.\d{1,2})?$').hasMatch(text)) {
        return 'Enter a valid SGD amount with up to 2 decimals';
      }
      return null;
    },
  );

  @override
  Widget build(BuildContext context) => ProductScreen(
    screen: ProductScreenName.newInspection,
    child: Scaffold(
    appBar: AppBar(title: const Text('New check-in')),
    body: KiviloContent(maxWidth: 720, child: Form(
      key: _form,
      child: ListView(
        padding: kiviloScreenPadding,
        children: [
          Text(
            'Start with the essentials',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 6),
          Text(
            'Set up the property, the tenancy and its rooms.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),
          OutlinedButton(
            onPressed: _busy ? null : _chooseWorkspace,
            child: Text('Workspace: ${_agency?.name ?? 'Personal'}'),
          ),
          const SizedBox(height: 8),
          Text(
            _agency == null
                ? 'Private to you until you share it.'
                : 'You are the responsible agent. Assigned colleagues can work with you; owners and managers oversee all team properties.',
          ),
          const SizedBox(height: kiviloSectionGap),
          const KiviloSectionHeading(
            title: 'Property',
            subtitle: 'Where the handover takes place',
          ),
          const SizedBox(height: kiviloHeadingGap),
          _textField('line1', 'Address', required: true),
          const SizedBox(height: 12),
          _textField('unit', 'Unit'),
          const SizedBox(height: 12),
          _textField(
            'postalCode',
            'Postal code',
            required: true,
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 12),
          KiviloSelectField<String>(
            label: 'Property type (required)',
            sheetTitle: 'Choose a property type',
            value: _propertyType,
            options: const [
              KiviloSelectOption(
                value: 'PRIVATE_NON_LANDED',
                label: 'Private, non-landed',
                description: 'Condominium or private apartment',
                icon: Icons.apartment_rounded,
              ),
              KiviloSelectOption(
                value: 'HDB',
                label: 'HDB',
                description: 'Public housing flat',
                icon: Icons.location_city_rounded,
              ),
              KiviloSelectOption(
                value: 'LANDED',
                label: 'Landed',
                description: 'Terrace, semi-detached or detached home',
                icon: Icons.home_rounded,
              ),
              KiviloSelectOption(
                value: 'COMMERCIAL',
                label: 'Commercial',
                description: 'Office, retail or other business premises',
                icon: Icons.store_rounded,
              ),
            ],
            onChanged: (value) => _change(() => _propertyType = value),
          ),
          const SizedBox(height: 20),
          Text(
            'Furnishing (required)',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 4),
          Text(
            'Rooms start with editable inventory rows suited to this furnishing level.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          RadioGroup<String>(
            groupValue: _furnishingLevel,
            onChanged: (value) => _change(() {
              _furnishingLevel = value;
              _error = null;
            }),
            child: const Column(
              children: [
                RadioListTile<String>(
                  value: 'FULLY_FURNISHED',
                  title: Text('Fully furnished'),
                  contentPadding: EdgeInsets.zero,
                ),
                RadioListTile<String>(
                  value: 'PARTIALLY_FURNISHED',
                  title: Text('Partially furnished'),
                  contentPadding: EdgeInsets.zero,
                ),
                RadioListTile<String>(
                  value: 'UNFURNISHED',
                  title: Text('Unfurnished'),
                  contentPadding: EdgeInsets.zero,
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          const Divider(),
          const SizedBox(height: kiviloSectionGap),
          ..._roomsSection(),
          const SizedBox(height: 32),
          const Divider(),
          const SizedBox(height: kiviloSectionGap),
          const KiviloSectionHeading(
            title: 'People',
            subtitle: 'The landlord and tenant on the report',
          ),
          const SizedBox(height: kiviloHeadingGap),
          _textField('landlordName', 'Landlord name', required: true),
          const SizedBox(height: 12),
          _textField(
            'landlordEmail',
            'Landlord email',
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 12),
          _textField('tenantName', 'Tenant name', required: true),
          const SizedBox(height: 12),
          _textField(
            'tenantEmail',
            'Tenant email',
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 32),
          const Divider(),
          const SizedBox(height: kiviloSectionGap),
          const KiviloSectionHeading(
            title: 'Tenancy',
            subtitle: 'Dates and agreed amounts',
          ),
          const SizedBox(height: kiviloHeadingGap),
          Row(
            children: [
              Expanded(
                child: _dateCard(
                  'Starts (required)',
                  _startDate,
                  () => _pickDate(true),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _dateCard(
                  'Ends (required)',
                  _endDate,
                  () => _pickDate(false),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _textField(
            'monthlyRent',
            'Monthly rent (SGD)',
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 12),
          _textField(
            'deposit',
            'Deposit (SGD)',
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 20),
          if (_error != null)
            KiviloNotice(
              tone: KiviloTone.error,
              child: Text(
                _error!,
                style: const TextStyle(color: KiviloColors.red),
              ),
            ),
        ],
      ),
    )),
    bottomNavigationBar: KiviloContent(maxWidth: 720, child: AnimatedPadding(
      duration: const Duration(milliseconds: 150),
      curve: Curves.easeOut,
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: FilledButton(
            onPressed: _busy ? null : _create,
            child: Text(_busy ? 'Creating…' : 'Create check-in'),
          ),
        ),
      ),
    )),
  ),
  );

  List<Widget> _roomsSection() {
    final text = Theme.of(context).textTheme;
    final rooms = _rooms;
    return [
      const KiviloSectionHeading(
        title: 'Rooms',
        subtitle: 'Each starts with standard lines you can edit',
      ),
      const SizedBox(height: kiviloHeadingGap),
      Text('Bedrooms', style: text.bodySmall),
      const SizedBox(height: 6),
      KiviloSegmentedControl<int>(
        value: _bedrooms,
        options: [
          for (var count = 0; count <= 5; count++)
            KiviloSegmentOption(value: count, label: '$count'),
        ],
        onChanged: _busy
            ? null
            : (value) => _change(() => _bedrooms = value!),
      ),
      const SizedBox(height: 12),
      Text('Bathrooms', style: text.bodySmall),
      const SizedBox(height: 6),
      KiviloSegmentedControl<int>(
        value: _bathrooms,
        options: [
          for (var count = 1; count <= 4; count++)
            KiviloSegmentOption(value: count, label: '$count'),
        ],
        onChanged: _busy
            ? null
            : (value) => _change(() => _bathrooms = value!),
      ),
      const SizedBox(height: 8),
      for (final name in _extras.keys)
        CheckboxListTile(
          value: _extras[name],
          title: Text(name),
          contentPadding: EdgeInsets.zero,
          onChanged: _busy
              ? null
              : (value) => _change(() => _extras[name] = value!),
        ),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: TextField(
              controller: _customRoom,
              readOnly: _busy,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Another room (optional)',
                hintText: 'For example, study',
              ),
              onSubmitted: (_) => _addCustomRoom(),
            ),
          ),
          const SizedBox(width: 8),
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: TextButton.icon(
              onPressed: _busy ? null : _addCustomRoom,
              icon: const Icon(Icons.add),
              label: const Text('Add'),
            ),
          ),
        ],
      ),
      const SizedBox(height: 16),
      Text(
        rooms.isEmpty
            ? 'No rooms yet. You can add them after this.'
            : '${rooms.length} ${rooms.length == 1 ? 'room' : 'rooms'} to set up',
        style: text.bodySmall,
      ),
      if (rooms.isNotEmpty) ...[
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final (index, name) in rooms.indexed)
              index >= rooms.length - _custom.length
                  ? InputChip(
                      label: Text(name),
                      deleteIcon: const Icon(Icons.close, size: 18),
                      onDeleted: _busy
                          ? null
                          : () => _change(
                              () => _custom.removeAt(
                                index - (rooms.length - _custom.length),
                              ),
                            ),
                    )
                  : Chip(label: Text(name)),
          ],
        ),
      ],
    ];
  }

  Widget _dateCard(String label, DateTime date, VoidCallback onTap) => Card(
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: Text(
                    _iso(date),
                    style: const TextStyle(
                      color: KiviloColors.ink,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const Icon(
                  Icons.calendar_today_outlined,
                  size: 17,
                  color: KiviloColors.muted,
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}
