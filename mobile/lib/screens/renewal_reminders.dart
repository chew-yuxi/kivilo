import 'package:flutter/material.dart';

import '../models/renewal.dart';
import '../services/api.dart';
import '../ui/kivilo_theme.dart';
import 'inspection_screen.dart';
import 'renewal_screen.dart';

class RenewalReminders extends StatefulWidget {
  const RenewalReminders({
    super.key,
    this.onRenewed,
    this.api,
    this.agencyId,
    this.personal = false,
  });
  final String? agencyId;
  final bool personal;
  final Api? api;
  final Future<void> Function()? onRenewed;

  @override
  State<RenewalReminders> createState() => _RenewalRemindersState();
}

class _RenewalRemindersState extends State<RenewalReminders> {
  late final _api = widget.api ?? Api();
  late final _future = widget.agencyId == null && !widget.personal
      ? _api.renewals()
      : _api.renewalWork(agencyId: widget.agencyId, personal: widget.personal);
  final _hidden = <String>{};
  String? _busy;

  Future<void> _respond(String id, String choice) async {
    setState(() => _busy = id);
    try {
      await _api.respondToRenewal(id, choice);
      if (mounted) setState(() => _hidden.add(id));
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _start(String id) async {
    final inspectionId = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => RenewalScreen(tenancyId: id)),
    );
    if (!mounted || inspectionId == null) return;
    setState(() => _hidden.add(id));
    await Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => InspectionScreen(id: inspectionId)),
    );
    if (mounted) await widget.onRenewed?.call();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<List<RenewalReminder>>(
    future: _future,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return Padding(
          padding: const EdgeInsets.only(top: 16),
          child: Text(
            'Renewal reminders could not be loaded. Pull down to try again.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        );
      }
      if (!snapshot.hasData) return const SizedBox.shrink();
      return Column(
        children: [
          for (final reminder in snapshot.data!.where(
            (value) => !_hidden.contains(value.id),
          ))
            Card(
              margin: const EdgeInsets.only(top: 16),
              color: KiviloColors.amberSoft,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Renewal due',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                        IconButton(
                          tooltip: 'Dismiss renewal reminder',
                          onPressed: _busy == null
                              ? () => _respond(reminder.id, 'DISMISSED')
                              : null,
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                    Text(reminder.property),
                    const SizedBox(height: 4),
                    Text(
                      '${reminder.tenant} · Tenancy ends ${reminder.endDate}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      children: [
                        FilledButton(
                          onPressed: _busy == null
                              ? () => _start(reminder.id)
                              : null,
                          child: const Text('Start renewal'),
                        ),
                        TextButton(
                          onPressed: _busy == null
                              ? () => _respond(reminder.id, 'NOT_RENEWING')
                              : null,
                          child: const Text('Not renewing'),
                        ),
                        TextButton(
                          onPressed: _busy == null
                              ? () => _respond(reminder.id, 'LATER')
                              : null,
                          child: const Text('Remind me in a week'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      );
    },
  );
}
