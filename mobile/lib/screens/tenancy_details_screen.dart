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

  final String property;
  final PropertyTerm term;
  final Api? api;

  @override
  State<TenancyDetailsScreen> createState() => _TenancyDetailsScreenState();
}

class _TenancyDetailsScreenState extends State<TenancyDetailsScreen> {
  final _form = GlobalKey<FormState>();
  late final _api = widget.api ?? Api();
  late final _landlordEmail = TextEditingController(
    text: widget.term.landlordEmail ?? '',
  );
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
    _landlordEmail.dispose();
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
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _api.updateTenancyDetails(widget.term.tenancyId, {
        'landlordEmail': landlordEmail.isEmpty ? null : landlordEmail,
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
                widget.property,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 24),
              const KiviloSectionHeading(
                title: 'People',
                subtitle:
                    'Add an email so each party can receive and sign the report',
              ),
              const SizedBox(height: kiviloHeadingGap),
              Text(widget.term.landlord),
              const SizedBox(height: 6),
              TextFormField(
                controller: _landlordEmail,
                decoration: const InputDecoration(
                  labelText: 'Landlord email (optional)',
                ),
                keyboardType: TextInputType.emailAddress,
                validator: _emailError,
              ),
              const SizedBox(height: 16),
              Text(widget.term.tenant),
              const SizedBox(height: 6),
              TextFormField(
                controller: _tenantEmail,
                decoration: const InputDecoration(
                  labelText: 'Tenant email (optional)',
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
                decoration: const InputDecoration(
                  labelText: 'Monthly rent (SGD)',
                ),
                keyboardType: TextInputType.number,
                validator: _moneyError,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _deposit,
                decoration: const InputDecoration(labelText: 'Deposit (SGD)'),
                keyboardType: TextInputType.number,
                validator: _moneyError,
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                KiviloNotice(tone: KiviloTone.error, child: Text(_error!)),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _busy ? null : _save,
                child: Text(_busy ? 'Saving…' : 'Save details'),
              ),
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
        onPressed: _busy ? null : onPressed,
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
