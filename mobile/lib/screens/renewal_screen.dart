import 'package:flutter/material.dart';

import '../services/api.dart';
import '../services/product_events.dart';
import '../ui/kivilo_layout.dart';

class RenewalScreen extends StatefulWidget {
  const RenewalScreen({super.key, required this.tenancyId, this.api});
  final String tenancyId;
  final Api? api;

  @override
  State<RenewalScreen> createState() => _RenewalScreenState();
}

class _RenewalScreenState extends State<RenewalScreen> {
  late final _api = widget.api ?? Api();
  final _form = GlobalKey<FormState>();
  final _rent = TextEditingController();
  final _deposit = TextEditingController();
  DateTime? _start;
  DateTime? _end;
  DateTime? _earliestStart;
  bool _busy = false;
  bool _keepCollaborators = false;
  String? _error;
  late final _future = _load();

  Future<Map<String, dynamic>> _load() async {
    final data = await _api.renewal(widget.tenancyId);
    final previousEnd = DateTime.parse(data['endDate'] as String);
    _earliestStart = DateTime(
      previousEnd.year,
      previousEnd.month,
      previousEnd.day + 1,
    );
    _start = _earliestStart;
    _end = DateTime(_start!.year + 2, _start!.month, _start!.day - 1);
    _rent.text = data['monthlyRent'] as String;
    _deposit.text = data['deposit'] as String;
    return data;
  }

  @override
  void dispose() {
    _rent.dispose();
    _deposit.dispose();
    super.dispose();
  }

  String _iso(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  Future<void> _date(bool start) async {
    final selected = await showDatePicker(
      context: context,
      initialDate: start ? _start! : _end!,
      firstDate: _earliestStart!,
      lastDate: DateTime(2100),
    );
    if (selected != null && mounted) {
      setState(() => start ? _start = selected : _end = selected);
    }
  }

  Future<void> _create() async {
    if (_busy) return;
    if (!_form.currentState!.validate()) return;
    if (!_end!.isAfter(_start!)) {
      setState(() => _error = 'The tenancy must end after it starts.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final id = await _api.createRenewal(widget.tenancyId, {
        'startDate': _iso(_start!),
        'endDate': _iso(_end!),
        'monthlyRent': _rent.text.trim(),
        'deposit': _deposit.text.trim(),
        'keepCollaborators': _keepCollaborators,
      });
      if (mounted) Navigator.pop(context, id);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _amount(TextEditingController controller, String label) =>
      TextFormField(
        controller: controller,
        enabled: !_busy,
        decoration: InputDecoration(labelText: label),
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        validator: (value) =>
            RegExp(r'^\d{1,8}(\.\d{1,2})?$').hasMatch(value?.trim() ?? '')
            ? null
            : 'Enter a valid SGD amount',
      );

  @override
  Widget build(BuildContext context) => ProductScreen(
    screen: ProductScreenName.renewal,
    child: Scaffold(
    appBar: AppBar(title: const Text('Renew tenancy')),
    body: KiviloContent(maxWidth: 720, child: FutureBuilder<Map<String, dynamic>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Center(child: Text(plainError(snapshot.error!)));
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final collaborators =
            (snapshot.data!['collaborators'] as List<dynamic>? ?? const [])
                .cast<Map<String, dynamic>>();
        return Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                snapshot.data!['property'] as String,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text('Same landlord and tenant · ${snapshot.data!['tenant']}'),
              const SizedBox(height: 24),
              OutlinedButton(
                onPressed: _busy ? null : () => _date(true),
                child: Text('Starts ${_iso(_start!)}'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: _busy ? null : () => _date(false),
                child: Text('Ends ${_iso(_end!)}'),
              ),
              const SizedBox(height: 16),
              _amount(_rent, 'Monthly rent (SGD)'),
              const SizedBox(height: 16),
              _amount(_deposit, 'Deposit (SGD)'),
              const SizedBox(height: 20),
              const Text(
                'Confirm these terms with both parties first. This creates a new tenancy and a draft check-in for the same property.',
              ),
              if (collaborators.isNotEmpty) ...[
                const SizedBox(height: 16),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _keepCollaborators,
                  onChanged: _busy
                      ? null
                      : (value) => setState(() => _keepCollaborators = value!),
                  controlAffinity: ListTileControlAffinity.leading,
                  title: Text(
                    'Keep sharing this renewal with ${collaborators.map((person) => person['name'] as String).join(', ')}',
                  ),
                  subtitle: const Text(
                    'Leave unchecked to keep the new tenancy private.',
                  ),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _busy ? null : _create,
                child: Text(_busy ? 'Creating…' : 'Create renewal check-in'),
              ),
            ],
          ),
        );
      },
    )),
  ),
  );
}
