import 'package:flutter/material.dart';

import '../models/property_work.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';

class TenancyDetailsScreen extends StatefulWidget {
  const TenancyDetailsScreen({
    super.key,
    required this.property,
    required this.term,
    this.api,
  });

  final PropertyOverview property;
  final PropertyTerm term;
  final Api? api;

  @override
  State<TenancyDetailsScreen> createState() => _TenancyDetailsScreenState();
}

class _TenancyDetailsScreenState extends State<TenancyDetailsScreen> {
  final _form = GlobalKey<FormState>();
  late final _api = widget.api ?? Api();
  late final _line1 = TextEditingController(text: widget.property.line1);
  late final _unit = TextEditingController(text: widget.property.unit ?? '');
  late final _postalCode = TextEditingController(
    text: widget.property.postalCode,
  );
  late String _propertyType = widget.property.propertyType;
  late final _landlordName = TextEditingController(text: widget.term.landlord);
  late final _landlordEmail = TextEditingController(
    text: widget.term.landlordEmail ?? '',
  );
  late final _tenantName = TextEditingController(text: widget.term.tenant);
  late final _tenantEmail = TextEditingController(
    text: widget.term.tenantEmail ?? '',
  );
  late final _monthlyRent = TextEditingController(
    text: widget.term.monthlyRent ?? '0',
  );
  late final _deposit = TextEditingController(text: widget.term.deposit ?? '0');
  late DateTime _startDate = DateTime.parse(widget.term.startDate);
  late DateTime _endDate = DateTime.parse(widget.term.endDate);
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _line1.dispose();
    _unit.dispose();
    _postalCode.dispose();
    _landlordName.dispose();
    _landlordEmail.dispose();
    _tenantName.dispose();
    _tenantEmail.dispose();
    _monthlyRent.dispose();
    _deposit.dispose();
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
        _error = null;
      });
    }
  }

  String? _emailError(String? value) {
    final email = value?.trim() ?? '';
    if (email.isNotEmpty &&
        !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      return 'Enter a valid email address';
    }
    return null;
  }

  String? _moneyError(String? value) {
    if (!RegExp(r'^\d{1,8}(\.\d{1,2})?$').hasMatch(value?.trim() ?? '')) {
      return 'Enter a valid SGD amount with up to 2 decimals';
    }
    return null;
  }

  Future<void> _save() async {
    FocusManager.instance.primaryFocus?.unfocus();
    if (!_form.currentState!.validate()) return;
    if (!_endDate.isAfter(_startDate)) {
      setState(() => _error = 'The tenancy must end after it starts.');
      return;
    }
    final landlordEmail = _landlordEmail.text.trim().toLowerCase();
    final tenantEmail = _tenantEmail.text.trim().toLowerCase();
    if (landlordEmail.isNotEmpty && landlordEmail == tenantEmail) {
      setState(
        () =>
            _error = 'The landlord and tenant need different email addresses.',
      );
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Save tenancy changes?'),
        content: const Text(
          'These details identify the tenancy and its signing parties. Check them carefully before saving.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Save changes'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _api.updateTenancyDetails(widget.term.tenancyId, {
        'line1': _line1.text.trim(),
        'unit': _unit.text.trim().isEmpty ? null : _unit.text.trim(),
        'postalCode': _postalCode.text.trim(),
        'propertyType': _propertyType,
        'landlordName': _landlordName.text.trim(),
        'landlordEmail': landlordEmail.isEmpty ? null : landlordEmail,
        'tenantName': _tenantName.text.trim(),
        'tenantEmail': tenantEmail.isEmpty ? null : tenantEmail,
        'startDate': _iso(_startDate),
        'endDate': _iso(_endDate),
        'monthlyRent': _monthlyRent.text.trim(),
        'deposit': _deposit.text.trim(),
      });
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope<void>(
    canPop: !_busy,
    child: Scaffold(
      appBar: AppBar(title: const Text('Tenancy details')),
      body: KiviloContent(
        maxWidth: 720,
        child: Form(
          key: _form,
          child: ListView(
            padding: kiviloScreenPadding,
            children: [
              Text(
                widget.property.address,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 24),
              const KiviloSectionHeading(
                title: 'Property',
                subtitle: 'The address and type printed on the report',
              ),
              const SizedBox(height: kiviloHeadingGap),
              if (!widget.property.canEditPropertyDetails) ...[
                KiviloNotice(
                  tone: KiviloTone.info,
                  child: Text(
                    widget.property.propertyDetailsLockedReason ??
                        'These property details are available to view but cannot be edited.',
                  ),
                ),
                const SizedBox(height: 16),
              ],
              TextFormField(
                controller: _line1,
                readOnly: !widget.property.canEditPropertyDetails,
                decoration: const InputDecoration(labelText: 'Address'),
                validator: (value) => (value?.trim().isEmpty ?? true)
                    ? 'Enter the property address'
                    : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _unit,
                readOnly: !widget.property.canEditPropertyDetails,
                decoration: const InputDecoration(labelText: 'Unit (optional)'),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _postalCode,
                readOnly: !widget.property.canEditPropertyDetails,
                decoration: const InputDecoration(labelText: 'Postal code'),
                keyboardType: TextInputType.number,
                validator: (value) => (value?.trim().isEmpty ?? true)
                    ? 'Enter the postal code'
                    : null,
              ),
              const SizedBox(height: 16),
              IgnorePointer(
                ignoring: !widget.property.canEditPropertyDetails,
                child: KiviloSelectField<String>(
                  label: 'Property type',
                  value: _propertyType,
                  options: const [
                    KiviloSelectOption(
                      value: 'PRIVATE_NON_LANDED',
                      label: 'Private, non-landed',
                    ),
                    KiviloSelectOption(value: 'HDB', label: 'HDB'),
                    KiviloSelectOption(value: 'LANDED', label: 'Landed'),
                    KiviloSelectOption(value: 'COMMERCIAL', label: 'Commercial'),
                  ],
                  onChanged: (value) => setState(() => _propertyType = value),
                ),
              ),
              const SizedBox(height: 32),
              if (!widget.term.canEditDetails) ...[
                KiviloNotice(
                  tone: KiviloTone.info,
                  child: Text(
                    widget.term.detailsLockedReason ??
                        'These details are available to view but cannot be edited.',
                  ),
                ),
                const SizedBox(height: 24),
              ],
              const KiviloSectionHeading(
                title: 'People',
                subtitle:
                    'Add an email so each party can receive and sign the report',
              ),
              const SizedBox(height: kiviloHeadingGap),
              TextFormField(
                controller: _landlordName,
                readOnly: !widget.term.canEditDetails,
                decoration: const InputDecoration(labelText: 'Landlord name'),
                validator: (value) => (value?.trim().isEmpty ?? true)
                    ? 'Enter the landlord name'
                    : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _landlordEmail,
                readOnly: !widget.term.canEditDetails,
                decoration: const InputDecoration(
                  labelText: 'Landlord email (optional)',
                  hintText: 'Not provided',
                ),
                keyboardType: TextInputType.emailAddress,
                validator: _emailError,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _tenantName,
                readOnly: !widget.term.canEditDetails,
                decoration: const InputDecoration(labelText: 'Tenant name'),
                validator: (value) => (value?.trim().isEmpty ?? true)
                    ? 'Enter the tenant name'
                    : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _tenantEmail,
                readOnly: !widget.term.canEditDetails,
                decoration: const InputDecoration(
                  labelText: 'Tenant email (optional)',
                  hintText: 'Not provided',
                ),
                keyboardType: TextInputType.emailAddress,
                validator: _emailError,
              ),
              const SizedBox(height: 32),
              const KiviloSectionHeading(title: 'Tenancy'),
              const SizedBox(height: kiviloHeadingGap),
              Row(
                children: [
                  Expanded(
                    child: _dateButton(
                      'Starts',
                      _startDate,
                      () => _pickDate(true),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _dateButton(
                      'Ends',
                      _endDate,
                      () => _pickDate(false),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _monthlyRent,
                readOnly: !widget.term.canEditDetails,
                decoration: const InputDecoration(
                  labelText: 'Monthly rent (SGD)',
                ),
                keyboardType: TextInputType.number,
                validator: _moneyError,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _deposit,
                readOnly: !widget.term.canEditDetails,
                decoration: const InputDecoration(labelText: 'Deposit (SGD)'),
                keyboardType: TextInputType.number,
                validator: _moneyError,
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                KiviloNotice(tone: KiviloTone.error, child: Text(_error!)),
              ],
              if (widget.term.canEditDetails) ...[
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _busy ? null : _save,
                  child: Text(_busy ? 'Saving…' : 'Save details'),
                ),
              ],
              if (_busy) ...[
                const SizedBox(height: 12),
                const LinearProgressIndicator(),
              ],
            ],
          ),
        ),
      ),
    ),
  );

  Widget _dateButton(String label, DateTime date, VoidCallback onPressed) =>
      OutlinedButton(
        onPressed: _busy || !widget.term.canEditDetails ? null : onPressed,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            children: [
              Text(label),
              const SizedBox(height: 2),
              Text(_iso(date)),
            ],
          ),
        ),
      );
}
