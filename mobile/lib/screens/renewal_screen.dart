import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../services/api.dart';
import '../services/product_events.dart';
import '../ui/tenancy_period.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';

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

  /// The last check-in's room names, which the next term's check-in starts with
  /// unless the agent unticks them or removes one.
  final _rooms = <String>[];
  bool _useRooms = true;
  String? _error;
  late Future<Map<String, dynamic>> _future = _load();

  Future<Map<String, dynamic>> _load() async {
    final data = await _api.renewal(widget.tenancyId);
    final previousEnd = DateTime.parse(data['endDate'] as String);
    _earliestStart = DateTime(
      previousEnd.year,
      previousEnd.month,
      previousEnd.day + 1,
    );
    _start = _earliestStart;
    _termYears = 2;
    _end = tenancyEndDate(_start!, _termYears);
    _rent.text = data['monthlyRent'] as String;
    _deposit.text = data['deposit'] as String;
    _rooms
      ..clear()
      ..addAll(((data['rooms'] as List<dynamic>?) ?? const []).cast<String>());
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

  int _termYears = 2;

  Future<void> _date(bool start) async {
    final selected = await pickTenancyDate(
      context,
      start ? _start! : _end!,
      earliest: _earliestStart,
    );
    if (selected != null && mounted) {
      setState(() {
        if (start) {
          _start = selected;
          if (_termYears > 0) _end = tenancyEndDate(selected, _termYears);
        } else {
          _termYears = 0;
          _end = selected;
        }
      });
    }
  }

  Future<void> _create() async {
    if (_busy) return;
    if (!_form.currentState!.validate()) return;
    if (!_end!.isAfter(_start!)) {
      setState(() => _error = t.newEndAfterStart);
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
        'preservesBlankAmounts': true,
        'monthlyRent': _rent.text.trim(),
        'deposit': _deposit.text.trim(),
        'keepCollaborators': _keepCollaborators,
        if (_useRooms) 'rooms': _rooms,
      });
      if (mounted) Navigator.pop(context, id);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _amount(
    TextEditingController controller,
    String label,
    String currency,
  ) => TextFormField(
    controller: controller,
    enabled: !_busy,
    decoration: InputDecoration(labelText: label),
    keyboardType: const TextInputType.numberWithOptions(decimal: true),
    validator: (value) =>
        RegExp(r'^\d{1,8}(\.\d{1,2})?$').hasMatch(value?.trim() ?? '')
        ? null
        : 'Enter a valid $currency amount',
  );

  @override
  Widget build(BuildContext context) => ProductScreen(
    screen: ProductScreenName.renewal,
    child: Scaffold(
      appBar: AppBar(title: Text(t.renewTenancy)),
      body: KiviloContent(
        maxWidth: 720,
        child: FutureBuilder<Map<String, dynamic>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return KiviloMessage(
                icon: Icons.cloud_off_outlined,
                title: t.couldNotOpenThisRenewal,
                body: plainError(snapshot.error!),
                actionLabel: 'Try again',
                onAction: () => setState(() {
                  _future = _load();
                }),
              );
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final collaborators =
                (snapshot.data!['collaborators'] as List<dynamic>? ?? const [])
                    .cast<Map<String, dynamic>>();
            final currency = currencyOf(snapshot.data!);
            return Form(
              key: _form,
              child: ListView(
                padding: kiviloScreenPadding,
                children: [
                  Text(
                    snapshot.data!['property'] as String,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(t.sameParties('${snapshot.data!['tenant']}')),
                  const SizedBox(height: 24),
                  TenancyLengthPicker(
                    years: _termYears,
                    onChanged: _busy ? null : (years) => setState(() {
                      _termYears = years;
                      if (years > 0) _end = tenancyEndDate(_start!, years);
                    }),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.calendar_today_outlined),
                    onPressed: _busy ? null : () => _date(true),
                    label: Text(t.startsOn(_iso(_start!))),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.calendar_today_outlined),
                    onPressed: _busy ? null : () => _date(false),
                    label: Text(t.endsOn(_iso(_end!))),
                  ),
                  const SizedBox(height: 16),
                  _amount(_rent, t.newMonthlyRent(currency), currency),
                  const SizedBox(height: 16),
                  _amount(_deposit, t.newDeposit(currency), currency),
                  const SizedBox(height: 20),
                  Text(t.renewalConfirm),
                  if (_rooms.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _useRooms,
                      onChanged: _busy
                          ? null
                          : (value) => setState(() => _useRooms = value!),
                      controlAffinity: ListTileControlAffinity.leading,
                      title: Text(t.startWithTheRoomsFromTheLast),
                      subtitle: Text(t.namesOnlyTheNewCheckInRecords),
                    ),
                    if (_useRooms)
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final (index, name) in _rooms.indexed)
                            InputChip(
                              label: Text(name),
                              deleteIcon: const Icon(Icons.close, size: 18),
                              onDeleted: _busy
                                  ? null
                                  : () =>
                                        setState(() => _rooms.removeAt(index)),
                            ),
                        ],
                      ),
                  ],
                  if (collaborators.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _keepCollaborators,
                      onChanged: _busy
                          ? null
                          : (value) =>
                                setState(() => _keepCollaborators = value!),
                      controlAffinity: ListTileControlAffinity.leading,
                      title: Text(
                        t.keepSharingRenewal(
                          collaborators
                              .map((person) => person['name'] as String)
                              .join(t.listSeparator),
                        ),
                      ),
                      subtitle: Text(t.renewalPrivate),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _busy ? null : _create,
                    child: Text(_busy ? t.creating : t.createRenewal),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    ),
  );
}
