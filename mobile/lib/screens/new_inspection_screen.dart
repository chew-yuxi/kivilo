import 'package:flutter/material.dart';

import '../services/api.dart';

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
    if (!_form.currentState!.validate()) return;
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
      if (mounted) setState(() => _error = '$error');
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
      labelText: label,
      border: const OutlineInputBorder(),
    ),
    keyboardType: keyboardType,
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
    body: Form(
      key: _form,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Property',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
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
          DropdownButtonFormField<String>(
            initialValue: _propertyType,
            decoration: const InputDecoration(
              labelText: 'Property type',
              border: OutlineInputBorder(),
            ),
            items: const [
              DropdownMenuItem(
                value: 'PRIVATE_NON_LANDED',
                child: Text('Private, non-landed'),
              ),
              DropdownMenuItem(value: 'HDB', child: Text('HDB')),
              DropdownMenuItem(value: 'LANDED', child: Text('Landed')),
              DropdownMenuItem(value: 'COMMERCIAL', child: Text('Commercial')),
            ],
            onChanged: (value) => setState(() => _propertyType = value!),
          ),
          const SizedBox(height: 24),
          const Text(
            'Parties',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
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
          const SizedBox(height: 24),
          const Text(
            'Tenancy',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          ListTile(
            title: const Text('Starts'),
            subtitle: Text(_iso(_startDate)),
            trailing: const Icon(Icons.calendar_today),
            onTap: () => _pickDate(true),
          ),
          ListTile(
            title: const Text('Ends'),
            subtitle: Text(_iso(_endDate)),
            trailing: const Icon(Icons.calendar_today),
            onTap: () => _pickDate(false),
          ),
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
          const SizedBox(height: 16),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          FilledButton(
            onPressed: _busy ? null : _create,
            child: Text(_busy ? 'Creating…' : 'Create check-in'),
          ),
        ],
      ),
    ),
  );
}
