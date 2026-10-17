import 'package:flutter/material.dart';

import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';

class NewInspectionScreen extends StatefulWidget {
  const NewInspectionScreen({super.key});

  @override
  State<NewInspectionScreen> createState() => _NewInspectionScreenState();
}

class _NewInspectionScreenState extends State<NewInspectionScreen> {
  final _form = GlobalKey<FormState>();
  final _api = Api();
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

  Future<void> _create() async {
    FocusManager.instance.primaryFocus?.unfocus();
    if (!_form.currentState!.validate()) return;
    if (_fullyFurnished == null) {
      setState(
        () => _error = 'Choose whether the property is fully furnished.',
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
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('New check-in')),
    body: KiviloContent(maxWidth: 720, child: Form(
      key: _form,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
        children: [
          Text(
            'Start with the essentials',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 6),
          Text(
            'Set up the property and tenancy. You can add rooms after this.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 32),
          const KiviloSectionHeading(
            title: 'Property',
            subtitle: 'Where the handover takes place',
          ),
          const SizedBox(height: 16),
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
            onChanged: (value) => setState(() => _propertyType = value),
          ),
          const SizedBox(height: 20),
          Text(
            'Furnishing (required)',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 4),
          Text(
            'Fully furnished rooms start with standard inventory rows. Other rooms start empty.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          RadioGroup<bool>(
            groupValue: _fullyFurnished,
            onChanged: (value) => setState(() {
              _fullyFurnished = value;
              _error = null;
            }),
            child: const Column(
              children: [
                RadioListTile<bool>(
                  value: true,
                  title: Text('Fully furnished'),
                  contentPadding: EdgeInsets.zero,
                ),
                RadioListTile<bool>(
                  value: false,
                  title: Text('Not fully furnished'),
                  contentPadding: EdgeInsets.zero,
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          const Divider(),
          const SizedBox(height: 24),
          const KiviloSectionHeading(
            title: 'People',
            subtitle: 'The landlord and tenant on the report',
          ),
          const SizedBox(height: 16),
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
          const SizedBox(height: 24),
          const KiviloSectionHeading(
            title: 'Tenancy',
            subtitle: 'Dates and agreed amounts',
          ),
          const SizedBox(height: 16),
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
            child: Text(_busy ? 'Creating…' : 'Create check-in'),
          ),
        ),
      ),
    )),
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
