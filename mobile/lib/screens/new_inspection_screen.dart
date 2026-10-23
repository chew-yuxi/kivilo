import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../services/api.dart';
import '../models/agency.dart';
import '../services/product_events.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';

class NewInspectionScreen extends StatefulWidget {
  const NewInspectionScreen({super.key, this.api, this.initialAgency});
  final AgencySummary? initialAgency;
  final Api? api;

  @override
  State<NewInspectionScreen> createState() => _NewInspectionScreenState();
}

class _NewInspectionScreenState extends State<NewInspectionScreen> {
  final _form = GlobalKey<FormState>();
  late final _api = widget.api ?? Api();
  late AgencySummary? _agency = widget.initialAgency;
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
  bool? _fullyFurnished;
  DateTime _startDate = DateTime.now();
  late DateTime _endDate = DateTime(
    _startDate.year + 2,
    _startDate.month,
    _startDate.day,
  );
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final controller in _fields.values) {
      controller.dispose();
    }
    super.dispose();
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
      setState(() {
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
          title: Text(t.newWhoOwns),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                title: Text(t.workspacePersonal),
                subtitle: Text(
                  t.newPersonalDetail,
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.pop(context, 'personal'),
              ),
              for (final agency in index.agencies)
                ListTile(
                  title: Text(agency.name),
                  subtitle: Text(
                    t.newTeamDetail,
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pop(context, agency.id),
                ),
              if (index.agencies.isEmpty)
                Text(t.newCreateTeamHint),
            ],
          ),
          actions: [
            OutlinedButton(
              onPressed: () => Navigator.pop(context),
              child: Text(t.cancel),
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
    if (_fullyFurnished == null) {
      setState(
        () => _error = t.newFurnishingRequired,
      );
      return;
    }
    if (!_endDate.isAfter(_startDate)) {
      setState(() => _error = t.newEndAfterStart);
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
        'fullyFurnished': _fullyFurnished,
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
      });
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
      labelText: required ? t.fieldRequired(label) : t.fieldOptional(label),
    ),
    keyboardType: keyboardType,
    onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
    validator: (value) {
      final text = value?.trim() ?? '';
      if (required && text.isEmpty) return t.fieldIsRequired(label);
      if (text.isNotEmpty &&
          keyboardType == TextInputType.emailAddress &&
          !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(text)) {
        return t.fieldInvalidEmail;
      }
      if (text.isNotEmpty &&
          (key == 'monthlyRent' || key == 'deposit') &&
          !RegExp(r'^\d{1,8}(\.\d{1,2})?$').hasMatch(text)) {
        return t.fieldInvalidAmount;
      }
      return null;
    },
  );

  @override
  Widget build(BuildContext context) => ProductScreen(
    screen: ProductScreenName.newInspection,
    child: Scaffold(
    appBar: AppBar(title: Text(t.newCheckIn)),
    body: KiviloContent(maxWidth: 720, child: Form(
      key: _form,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
        children: [
          Text(
            t.newEssentials,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 6),
          Text(
            t.newEssentialsDetail,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),
          OutlinedButton(
            onPressed: _busy ? null : _chooseWorkspace,
            child: Text(t.newWorkspace(_agency?.name ?? t.workspacePersonal)),
          ),
          const SizedBox(height: 8),
          Text(
            _agency == null
                ? t.newPrivate
                : t.newTeamResponsible,
          ),
          const SizedBox(height: 32),
          KiviloSectionHeading(
            title: t.newProperty,
            subtitle: t.newPropertyDetail,
          ),
          const SizedBox(height: 16),
          _textField('line1', t.newAddress, required: true),
          const SizedBox(height: 12),
          _textField('unit', t.newUnit),
          const SizedBox(height: 12),
          _textField(
            'postalCode',
            t.newPostalCode,
            required: true,
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 12),
          KiviloSelectField<String>(
            label: t.newPropertyTypeRequired,
            sheetTitle: t.newChoosePropertyType,
            value: _propertyType,
            options: [
              KiviloSelectOption(
                value: 'PRIVATE_NON_LANDED',
                label: t.propertyTypePrivate,
                description: t.propertyTypePrivateDetail,
                icon: Icons.apartment_rounded,
              ),
              KiviloSelectOption(
                value: 'HDB',
                label: t.propertyTypeHdb,
                description: t.propertyTypeHdbDetail,
                icon: Icons.location_city_rounded,
              ),
              KiviloSelectOption(
                value: 'LANDED',
                label: t.propertyTypeLanded,
                description: t.propertyTypeLandedDetail,
                icon: Icons.home_rounded,
              ),
              KiviloSelectOption(
                value: 'COMMERCIAL',
                label: t.propertyTypeCommercial,
                description: t.propertyTypeCommercialDetail,
                icon: Icons.store_rounded,
              ),
            ],
            onChanged: (value) => setState(() => _propertyType = value),
          ),
          const SizedBox(height: 20),
          Text(
            t.newFurnishing,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 4),
          Text(
            t.newFurnishingDetail,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          RadioGroup<bool>(
            groupValue: _fullyFurnished,
            onChanged: (value) => setState(() {
              _fullyFurnished = value;
              _error = null;
            }),
            child: Column(
              children: [
                RadioListTile<bool>(
                  value: true,
                  title: Text(t.newFullyFurnished),
                  contentPadding: EdgeInsets.zero,
                ),
                RadioListTile<bool>(
                  value: false,
                  title: Text(t.newNotFullyFurnished),
                  contentPadding: EdgeInsets.zero,
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          const Divider(),
          const SizedBox(height: 24),
          KiviloSectionHeading(
            title: t.newPeople,
            subtitle: t.newPeopleDetail,
          ),
          const SizedBox(height: 16),
          _textField('landlordName', t.newLandlordName, required: true),
          const SizedBox(height: 12),
          _textField(
            'landlordEmail',
            t.newLandlordEmail,
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 12),
          _textField('tenantName', t.newTenantName, required: true),
          const SizedBox(height: 12),
          _textField(
            'tenantEmail',
            t.newTenantEmail,
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 32),
          const Divider(),
          const SizedBox(height: 24),
          KiviloSectionHeading(
            title: t.newTenancy,
            subtitle: t.newTenancyDetail,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _dateCard(
                  t.newStarts,
                  _startDate,
                  () => _pickDate(true),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _dateCard(
                  t.newEnds,
                  _endDate,
                  () => _pickDate(false),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _textField(
            'monthlyRent',
            t.newMonthlyRent,
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 12),
          _textField(
            'deposit',
            t.newDeposit,
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 20),
          if (_error != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: KiviloColors.redSoft,
                borderRadius: BorderRadius.circular(12),
              ),
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
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: FilledButton(
            onPressed: _busy ? null : _create,
            child: Text(_busy ? t.creating : t.newCreate),
          ),
        ),
      ),
    )),
  ),
  );

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
