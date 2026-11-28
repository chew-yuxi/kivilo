import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api.dart';
import '../services/capture_queue.dart';
import '../services/read_cache.dart';
import '../models/agency.dart';
import '../models/property_work.dart';
import 'contact_picker_screen.dart';
import 'property_picker_screen.dart';
import '../services/product_events.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';

class NewInspectionScreen extends StatefulWidget {
  const NewInspectionScreen({
    super.key,
    this.api,
    this.initialAgency,
    this.cache,
    this.offerVerification = false,
    this.freeChecksLeft,
    this.country = 'SG',
  });

  /// Where the agent works, which a new property is made in. Fixed once it is made.
  final String country;

  /// Free client checks left, to say what verifying both parties uses; null on Pro.
  final int? freeChecksLeft;
  final AgencySummary? initialAgency;

  /// Offers to start CEA due diligence on both parties with the check-in.
  final bool offerVerification;
  final Api? api;
  final ReadCache? cache;

  @override
  State<NewInspectionScreen> createState() => _NewInspectionScreenState();
}

class _NewInspectionScreenState extends State<NewInspectionScreen> {
  final _form = GlobalKey<FormState>();
  bool _verifyParties = true;
  late final _api = widget.api ?? Api();
  late final ReadCache _cache = widget.cache ?? ReadCache();
  late AgencySummary? _agency = widget.initialAgency;

  /// An existing property keeps its own country; a new one is in the agent's.
  String get _propertyCountry => _existing?.country ?? widget.country;
  String get _currency => currencyFor(_propertyCountry);
  bool get _malaysia => _propertyCountry == 'MY';

  /// CEA due diligence is Singapore law, so it is never offered in Malaysia.
  bool get _offersVerification => widget.offerVerification && !_malaysia;

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

  /// A property this account already manages, when the check-in is for a new tenancy
  /// there. Its address and workspace are its own.
  bool _choosingExisting = false;
  StartableProperty? _existing;

  /// The last check-in's room names at [_existing], offered and removable one by one.
  final _previousRooms = <String>[];
  bool _usePreviousRooms = true;

  /// With an existing property: its last landlord is this tenancy's too, linked as
  /// that same person by the server.
  bool _sameLandlord = true;

  bool get _keepsLandlord =>
      _existing?.lastLandlordName != null && _sameLandlord;

  bool get _previousMode =>
      _existing != null && _existing!.rooms.isNotEmpty && _usePreviousRooms;
  final _customRoom = TextEditingController();

  /// OneMap search for a new property's address. A later answer replaces an earlier
  /// one, never the reverse, and a failure leaves manual entry as it always was.
  final _lookup = TextEditingController();
  Timer? _lookupDelay;
  int _lookupRun = 0;
  bool _lookingUp = false;
  List<AddressMatch> _matches = const [];
  String? _lookupNote;
  int _draftRevision = 0;
  Future<void> _pendingDraftWrite = Future.value();

  static const _draftKey = 'new-check-in-draft';

  /// The rooms the check-in starts with, in walking order. Each gets the standard
  /// editable lines for its name and the furnishing level, as a room added later does.
  List<String> get _rooms => _previousMode
      ? [..._previousRooms, ..._custom]
      : [
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

  Future<void> _chooseExisting() async {
    final chosen = await Navigator.push<StartableProperty>(
      context,
      MaterialPageRoute(builder: (_) => PropertyPickerScreen(api: _api)),
    );
    if (chosen == null || !mounted) return;
    _change(() {
      _existing = chosen;
      _previousRooms
        ..clear()
        ..addAll(chosen.rooms);
      _usePreviousRooms = true;
      _sameLandlord = true;
      _furnishingLevel ??= chosen.furnishingLevel;
      _error = null;
    });
  }
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
  late final _fieldFocus = {for (final key in _fields.keys) key: FocusNode()};
  final _furnishingFocus = FocusNode();
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
    _lookup.dispose();
    _lookupDelay?.cancel();
    for (final node in _fieldFocus.values) {
      node.dispose();
    }
    _furnishingFocus.dispose();
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
      final type = draft['propertyType'] as String? ?? _propertyType;
      // A draft begun before the agent said they work in Malaysia, where there is no HDB.
      _propertyType = widget.country == 'MY' && type == 'HDB'
          ? 'PRIVATE_NON_LANDED'
          : type;
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
      _choosingExisting = draft['choosingExisting'] as bool? ?? false;
      final existing = draft['existing'];
      _existing = existing is Map
          ? StartableProperty.fromJson(existing.cast<String, dynamic>())
          : null;
      _previousRooms
        ..clear()
        ..addAll(((draft['previousRooms'] as List?) ?? const []).cast<String>());
      _usePreviousRooms = draft['usePreviousRooms'] as bool? ?? true;
      _sameLandlord = draft['sameLandlord'] as bool? ?? true;
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
      'choosingExisting': _choosingExisting,
      'existing': _existing?.toJson(),
      'previousRooms': [..._previousRooms],
      'usePreviousRooms': _usePreviousRooms,
      'sameLandlord': _sameLandlord,
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

  void _lookupChanged(String text) {
    _lookupDelay?.cancel();
    final query = text.trim();
    if (query.length < 2) {
      _lookupRun++;
      setState(() {
        _matches = const [];
        _lookupNote = null;
        _lookingUp = false;
      });
      return;
    }
    _lookupDelay = Timer(
      const Duration(milliseconds: 350),
      () => unawaited(_runLookup(query)),
    );
  }

  Future<void> _runLookup(String query) async {
    final run = ++_lookupRun;
    setState(() => _lookingUp = true);
    try {
      final matches = await _api.searchAddresses(query);
      if (!mounted || run != _lookupRun) return;
      setState(() {
        _matches = matches;
        _lookupNote = matches.isEmpty
            ? 'No Singapore address matches. Type it below.'
            : null;
      });
    } catch (error) {
      if (!mounted || run != _lookupRun) return;
      setState(() {
        _matches = const [];
        _lookupNote = 'Could not look up addresses (${plainError(error)}) '
            'Type it below.';
      });
    } finally {
      if (mounted && run == _lookupRun) setState(() => _lookingUp = false);
    }
  }

  void _useAddress(AddressMatch match) {
    _lookupRun++;
    _lookupDelay?.cancel();
    _fields['line1']!.text = match.line1;
    _fields['postalCode']!.text = match.postalCode;
    _lookup.clear();
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _matches = const [];
      _lookingUp = false;
      _lookupNote = 'Address filled in. Add the unit below if there is one.';
    });
  }

  /// Fills a party's name and email from someone this account already works with.
  /// The fields stay editable; the email decides who the person is.
  Future<void> _chooseContact(String role) async {
    final contact = await Navigator.push<Contact>(
      context,
      MaterialPageRoute(
        builder: (_) => ContactPickerScreen(api: _api, role: role),
      ),
    );
    if (contact == null || !mounted) return;
    final prefix = role == 'LANDLORD' ? 'landlord' : 'tenant';
    _fields['${prefix}Name']!.text = contact.name;
    _fields['${prefix}Email']!.text = contact.email ?? '';
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
    final invalid = _form.currentState!.validateGranularly();
    if (invalid.isNotEmpty) {
      double top(FormFieldState<Object?> state) =>
          (state.context.findRenderObject()! as RenderBox).localToGlobal(Offset.zero).dy;
      final first = invalid.reduce((a, b) => top(a) <= top(b) ? a : b);
      final field = first.widget;
      if (field is TextFormField) {
        _fieldFocus.entries.firstWhere((entry) =>
            identical(_fields[entry.key], field.controller)).value.requestFocus();
      } else {
        _furnishingFocus.requestFocus();
      }
      await WidgetsBinding.instance.endOfFrame;
      if (first.mounted) {
        await Scrollable.ensureVisible(first.context, alignment: 0.12,
            duration: const Duration(milliseconds: 220));
      }
      return;
    }
    if (_choosingExisting && _existing == null) {
      setState(
        () => _error = 'Choose the property, or switch to New property.',
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
        if (_existing case final property?) ...{
          // The property keeps its own address, type and workspace.
          'propertyId': property.id,
          'agencyId': ?property.agencyId,
        } else ...{
          'agencyId': ?_agency?.id,
          'line1': value('line1'),
          'unit': value('unit').isEmpty ? null : value('unit'),
          'postalCode': value('postalCode'),
          'propertyType': _propertyType,
          'country': widget.country,
        },
        'furnishingLevel': _furnishingLevel,
        if (_keepsLandlord)
          'sameLandlord': true
        else ...{
          'landlordName': value('landlordName'),
          'landlordEmail': value('landlordEmail').isEmpty
              ? null
              : value('landlordEmail'),
        },
        'tenantName': value('tenantName'),
        'tenantEmail': value('tenantEmail').isEmpty
            ? null
            : value('tenantEmail'),
        'startDate': _iso(_startDate),
        'endDate': _iso(_endDate),
        'preservesBlankAmounts': true,
        'monthlyRent': value('monthlyRent'),
        'deposit': value('deposit'),
        'clientId': _clientId,
        'rooms': _rooms,
        if (_offersVerification) 'verifyParties': _verifyParties,
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
    String? hint,
  }) => TextFormField(
    controller: _fields[key],
    focusNode: _fieldFocus[key],
    decoration: InputDecoration(
      labelText: '$label (${required ? 'required' : 'optional'})',
      hintText: hint,
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
        return 'Enter a valid $_currency amount with up to 2 decimals';
      }
      if (key == 'postalCode' &&
          _malaysia &&
          !RegExp(r'^\d{5}$').hasMatch(text)) {
        return 'A Malaysian postcode has 5 digits';
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
      child: SingleChildScrollView(
        padding: kiviloScreenPadding,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
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
            onPressed: _busy || _existing != null ? null : _chooseWorkspace,
            child: Text(
              'Team: ${_existing != null ? _existing!.agencyName ?? 'Personal' : _agency?.name ?? 'Personal'}',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _existing != null
                ? 'A new tenancy keeps the same team or stays Personal.'
                : _agency == null
                ? 'Private to you until you share it.'
                : 'You are the responsible agent. Assigned colleagues can work with you; owners and managers oversee all team properties.',
          ),
          const SizedBox(height: kiviloSectionGap),
          const KiviloSectionHeading(
            title: 'Property',
            subtitle: 'Where the handover takes place',
          ),
          const SizedBox(height: kiviloHeadingGap),
          KiviloSegmentedControl<bool>(
            value: _choosingExisting,
            options: const [
              KiviloSegmentOption(value: false, label: 'New property'),
              KiviloSegmentOption(value: true, label: 'Existing property'),
            ],
            onChanged: _busy
                ? null
                : (value) {
                    _change(() {
                      _choosingExisting = value!;
                      if (!value) _existing = null;
                    });
                    if (value! && _existing == null) {
                      unawaited(_chooseExisting());
                    }
                  },
          ),
          const SizedBox(height: 12),
          if (_choosingExisting) ...[
            if (_existing case final property?)
              Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 6,
                  ),
                  title: Text(property.address),
                  subtitle: Text('Last tenant: ${property.lastTenant}'),
                  trailing: TextButton(
                    onPressed: _busy ? null : _chooseExisting,
                    child: const Text('Change'),
                  ),
                ),
              )
            else
              OutlinedButton(
                onPressed: _busy ? null : _chooseExisting,
                child: const Text('Choose a property'),
              ),
          ] else ...[
            // OneMap knows Singapore addresses only.
            if (!_malaysia)
              TextField(
                controller: _lookup,
                readOnly: _busy,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  labelText: 'Find the address (optional)',
                  hintText: 'Postal code, building or street',
                  suffixIcon: _lookingUp
                      ? const Padding(
                          padding: EdgeInsets.all(14),
                          child: SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : null,
                ),
                onChanged: _lookupChanged,
              ),
            if (!_malaysia && _matches.isNotEmpty) ...[
              const SizedBox(height: 8),
              Card(
                clipBehavior: Clip.antiAlias,
                child: Column(
                  children: [
                    for (final (index, match) in _matches.indexed) ...[
                      if (index > 0) const Divider(height: 1),
                      ListTile(
                        title: Text(match.line1),
                        subtitle: Text(
                          [
                            ?match.building,
                            'Singapore ${match.postalCode}',
                          ].join(' · '),
                        ),
                        onTap: _busy ? null : () => _useAddress(match),
                      ),
                    ],
                  ],
                ),
              ),
            ],
            if (!_malaysia && _lookupNote != null) ...[
              const SizedBox(height: 6),
              Text(_lookupNote!, style: Theme.of(context).textTheme.bodySmall),
            ],
            if (!_malaysia) const SizedBox(height: 12),
            _textField(
              'line1',
              'Address',
              required: true,
              hint: _malaysia ? 'Building or street, area and city' : null,
            ),
            const SizedBox(height: 12),
            _textField('unit', 'Unit'),
            const SizedBox(height: 12),
            _textField(
              'postalCode',
              _malaysia ? 'Postcode' : 'Postal code',
              required: true,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            KiviloSelectField<String>(
              label: 'Property type (required)',
              sheetTitle: 'Choose a property type',
              value: _propertyType,
              options: [
                _malaysia
                    ? const KiviloSelectOption(
                        value: 'PRIVATE_NON_LANDED',
                        label: 'Condominium',
                        description: 'Condominium, serviced residence or apartment',
                        icon: Icons.apartment_rounded,
                      )
                    : const KiviloSelectOption(
                        value: 'PRIVATE_NON_LANDED',
                        label: 'Private, non-landed',
                        description: 'Condominium or private apartment',
                        icon: Icons.apartment_rounded,
                      ),
                // Public housing is Singapore's; the server refuses it in Malaysia.
                if (!_malaysia)
                  const KiviloSelectOption(
                    value: 'HDB',
                    label: 'HDB',
                    description: 'Public housing flat',
                    icon: Icons.location_city_rounded,
                  ),
                const KiviloSelectOption(
                  value: 'LANDED',
                  label: 'Landed',
                  description: 'Terrace, semi-detached or detached home',
                  icon: Icons.home_rounded,
                ),
                const KiviloSelectOption(
                  value: 'COMMERCIAL',
                  label: 'Commercial',
                  description: 'Office, retail or other business premises',
                  icon: Icons.store_rounded,
                ),
              ],
              onChanged: (value) => _change(() => _propertyType = value),
            ),
          ],
          const SizedBox(height: 20),
          FormField<String>(
            validator: (_) => _furnishingLevel == null ? 'Choose the property furnishing level.' : null,
            builder: (field) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                'Furnishing (required)',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 4),
              Text(
                'Rooms start with editable inventory rows suited to this furnishing level.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              if (field.errorText != null)
                Semantics(liveRegion: true, child: Text(field.errorText!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error))),
              RadioGroup<String>(
                groupValue: _furnishingLevel,
                onChanged: (value) => _change(() {
                  _furnishingLevel = value;
                  field.didChange(value);
                  if (field.hasError) field.validate();
                  _error = null;
                }),
                child: Column(
                  children: [
                    RadioListTile<String>(
                      focusNode: _furnishingFocus,
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
          ])),
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
          if (_existing?.lastLandlordName case final name?)
            CheckboxListTile(
              value: _sameLandlord,
              title: const Text('Same landlord as last time'),
              subtitle: Text(
                [name, ?_existing!.lastLandlordEmail].join(' · '),
              ),
              contentPadding: EdgeInsets.zero,
              onChanged: _busy
                  ? null
                  : (value) => _change(() => _sameLandlord = value!),
            ),
          if (!_keepsLandlord) ...[
            _textField('landlordName', 'Landlord name', required: true),
            const SizedBox(height: 12),
            _textField(
              'landlordEmail',
              'Landlord email',
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: _busy ? null : () => _chooseContact('LANDLORD'),
              child: const Text('Choose from your contacts'),
            ),
          ],
          const SizedBox(height: 12),
          _textField('tenantName', 'Tenant name', required: true),
          const SizedBox(height: 12),
          _textField(
            'tenantEmail',
            'Tenant email',
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: _busy ? null : () => _chooseContact('TENANT'),
            child: const Text('Choose from your contacts'),
          ),
          if (_offersVerification) ...[
            const SizedBox(height: 16),
            Card(
              margin: EdgeInsets.zero,
              child: SwitchListTile(
                contentPadding: const EdgeInsets.fromLTRB(16, 6, 12, 6),
                title: const Text('Verify both parties (CEA)'),
                subtitle: Text(
                  'Kivilo emails the landlord and tenant a short identity form and screens '
                  'them. CEA requires this before the tenancy is signed.'
                  '${widget.freeChecksLeft == null ? '' : ' Uses 2 of your ${widget.freeChecksLeft} free client checks.'}',
                ),
                value: _verifyParties,
                onChanged: _busy ? null : (value) => setState(() => _verifyParties = value),
              ),
            ),
          ],
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
            'Monthly rent ($_currency)',
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 12),
          _textField(
            'deposit',
            'Deposit ($_currency)',
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
        ]),
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
      if (_existing?.rooms.isNotEmpty == true)
        CheckboxListTile(
          value: _usePreviousRooms,
          title: const Text('Start with the rooms from the last check-in'),
          subtitle: const Text(
            'Names only; this check-in records its own condition',
          ),
          contentPadding: EdgeInsets.zero,
          onChanged: _busy
              ? null
              : (value) => _change(() => _usePreviousRooms = value!),
        ),
      if (!_previousMode) ...[
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
      ],
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
              _previousMode && index < _previousRooms.length
                  ? InputChip(
                      label: Text(name),
                      deleteIcon: const Icon(Icons.close, size: 18),
                      onDeleted: _busy
                          ? null
                          : () => _change(() => _previousRooms.removeAt(index)),
                    )
                  : index >= rooms.length - _custom.length
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
