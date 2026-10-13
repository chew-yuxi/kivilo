import 'package:flutter/material.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';
import 'maintenance_case_screen.dart';
import 'new_maintenance_case_screen.dart';
import 'property_timeline_screen.dart';
import 'service_directory_screen.dart';

class TenancyScreen extends StatefulWidget {
  const TenancyScreen({super.key, required this.tenancy});
  final TenancySummary tenancy;

  @override
  State<TenancyScreen> createState() => _TenancyScreenState();
}

class _TenancyScreenState extends State<TenancyScreen> {
  final _api = Api();
  late Future<_TenancyData> _future = _load();

  Future<_TenancyData> _load() async => (
    await _api.maintenanceCases(widget.tenancy.id),
    await _api.propertyAssets(widget.tenancy.propertyId),
    await _api.tenancy(widget.tenancy.id),
  );

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  Future<void> _report(List<PropertyAssetSummary> assets) async {
    final id = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => NewMaintenanceCaseScreen(
          tenancyId: widget.tenancy.id,
          assets: assets,
        ),
      ),
    );
    if (!mounted || id == null) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MaintenanceCaseScreen(caseId: id),
      ),
    );
    if (mounted) await _refresh();
  }

  Future<void> _addAsset() async {
    final name = TextEditingController();
    final room = TextEditingController();
    final identifier = TextEditingController();
    var category = 'APPLIANCE';
    final submitted = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => KiviloDrawer(
          title: const Text('Add property asset'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Name'),
                ),
                KiviloSelectField<String>(
                  label: 'Category',
                  value: category,
                  options: const [
                    KiviloSelectOption(value: 'APPLIANCE', label: 'Appliance'),
                    KiviloSelectOption(value: 'FIXTURE', label: 'Fixture'),
                    KiviloSelectOption(value: 'FURNITURE', label: 'Furniture'),
                    KiviloSelectOption(value: 'SURFACE', label: 'Surface'),
                    KiviloSelectOption(value: 'SYSTEM', label: 'System'),
                    KiviloSelectOption(value: 'OTHER', label: 'Other'),
                  ],
                  onChanged: (value) => setDialogState(() => category = value),
                ),
                TextField(
                  controller: room,
                  decoration: const InputDecoration(
                    labelText: 'Room (optional)',
                  ),
                ),
                TextField(
                  controller: identifier,
                  decoration: const InputDecoration(
                    labelText: 'Make, model or serial (optional)',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
    if (submitted == true && name.text.trim().isNotEmpty) {
      await _api.createPropertyAsset(widget.tenancy.propertyId, {
        'name': name.text.trim(),
        'category': category,
        'roomLabel': room.text.trim().isEmpty ? null : room.text.trim(),
        'identifier': identifier.text.trim().isEmpty
            ? null
            : identifier.text.trim(),
        'inspectionItemId': null,
      });
      if (mounted) await _refresh();
    }
    name.dispose();
    room.dispose();
    identifier.dispose();
  }

  Future<void> _editCap(String? current) async {
    final cap = TextEditingController(text: current ?? '');
    final saved = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDrawerState) {
          final amount = cap.text.trim();
          final valid =
              amount.isEmpty || RegExp(r'^\d+(?:\.\d{1,2})?$').hasMatch(amount);
          return KiviloDrawer(
            title: const Text('Minor repair cap'),
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'The amount the tenant pays towards each minor repair under '
                  'the tenancy agreement. It prefills a split when someone '
                  'proposes who pays; the tenant still accepts every proposal.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: cap,
                  autofocus: true,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    labelText: 'Tenant pays up to',
                    prefixText: 'S\$ ',
                    helperText: 'Leave empty if the agreement has no cap',
                    errorText: valid ? null : 'Enter an amount like 150',
                  ),
                  onChanged: (_) => setDrawerState(() {}),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: valid ? () => Navigator.pop(context, true) : null,
                child: const Text('Save'),
              ),
            ],
          );
        },
      ),
    );
    final amount = cap.text.trim();
    cap.dispose();
    if (saved != true) return;
    await _api.updateTenancyTerms(widget.tenancy.id, {
      'minorRepairCap': amount.isEmpty ? null : amount,
    });
    if (mounted) await _refresh();
  }

  Future<void> _setAgentAuthority(bool value) async {
    await _api.updateTenancyTerms(widget.tenancy.id, {
      'agentMayAgreeCosts': value,
    });
    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.tenancy.property)),
    body: FutureBuilder<_TenancyData>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('${snapshot.error}'));
        }
        final (cases, assets, terms) = snapshot.data!;
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Property care',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 6),
              Text(
                'Report and track maintenance for this tenancy.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 20),
              Card(
                color: Theme.of(context).colorScheme.errorContainer,
                child: ListTile(
                  leading: const Icon(Icons.emergency_outlined),
                  title: const Text('Immediate danger?'),
                  subtitle: const Text('Police 999 · Fire or ambulance 995'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const ServiceDirectoryScreen(),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              FilledButton.icon(
                onPressed: () => _report(assets),
                icon: const Icon(Icons.add),
                label: const Text('Report a problem'),
              ),
              const SizedBox(height: 10),
              Card(
                child: ListTile(
                  leading: const Icon(
                    Icons.timeline,
                    color: KiviloColors.pinkDark,
                  ),
                  title: const Text('Property timeline'),
                  subtitle: const Text(
                    'Signed reports, repairs and agreed costs at this address',
                  ),
                  trailing: const Icon(
                    Icons.chevron_right,
                    color: KiviloColors.subtle,
                  ),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => PropertyTimelineScreen(
                        propertyId: widget.tenancy.propertyId,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              KiviloSectionHeading(
                title: 'Maintenance',
                subtitle: cases.isEmpty
                    ? 'Requests for this property will appear here'
                    : '${cases.length} ${cases.length == 1 ? 'request' : 'requests'}',
              ),
              const SizedBox(height: 12),
              if (cases.isEmpty) _emptyMaintenance(),
              for (var index = 0; index < cases.length; index++) ...[
                if (index > 0) const SizedBox(height: 10),
                Card(
                  child: ListTile(
                    title: Text(cases[index].title),
                    subtitle: Text(
                      '${cases[index].status.replaceAll('_', ' ').toLowerCase()}'
                      '${cases[index].asset == null ? '' : ' · ${cases[index].asset}'}'
                      '${cases[index].repairAttempts == 0 ? '' : ' · ${cases[index].repairAttempts} repair attempts'}',
                    ),
                    leading: Icon(
                      cases[index].priority == 'SAFETY_EMERGENCY'
                          ? Icons.warning_amber
                          : Icons.build_outlined,
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      await Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) =>
                              MaintenanceCaseScreen(caseId: cases[index].id),
                        ),
                      );
                      if (mounted) await _refresh();
                    },
                  ),
                ),
              ],
              if (terms.role != 'TENANT' || terms.minorRepairCap != null) ...[
                const SizedBox(height: 24),
                const KiviloSectionHeading(
                  title: 'Repair costs',
                  subtitle: 'Terms that shape who pays for a repair',
                ),
                const SizedBox(height: 12),
                _repairTerms(terms),
              ],
              if (assets.isNotEmpty || widget.tenancy.role != 'TENANT') ...[
                const SizedBox(height: 24),
                KiviloSectionHeading(
                  title: 'Property assets',
                  subtitle: 'Appliances and fixtures linked to maintenance',
                  action: widget.tenancy.role == 'TENANT'
                      ? null
                      : TextButton.icon(
                          onPressed: _addAsset,
                          icon: const Icon(Icons.add, size: 18),
                          label: const Text('Add asset'),
                        ),
                ),
                const SizedBox(height: 12),
                if (assets.isEmpty) _emptyAssets(),
                for (var index = 0; index < assets.length; index++) ...[
                  if (index > 0) const Divider(height: 1),
                  ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                    title: Text(assets[index].name),
                    subtitle: Text(
                      [
                        if (assets[index].roomLabel != null)
                          assets[index].roomLabel!,
                        '${assets[index].repairVisitsLast365Days} repairs in 365 days',
                      ].join(' · '),
                    ),
                    trailing: assets[index].repairVisitsLast365Days >= 4
                        ? const Chip(label: Text('Repeat fault'))
                        : null,
                  ),
                ],
              ],
            ],
          ),
        );
      },
    ),
  );

  Widget _repairTerms(TenancyDetail terms) => Card(
    child: Column(
      children: [
        ListTile(
          contentPadding: const EdgeInsets.fromLTRB(16, 6, 8, 6),
          title: const Text('Minor repair cap'),
          subtitle: Text(
            terms.minorRepairCap == null
                ? 'Not set'
                : 'Tenant pays up to S\$${terms.minorRepairCap} per repair',
          ),
          trailing: terms.canEditMinorRepairCap
              ? TextButton(
                  onPressed: () => _editCap(terms.minorRepairCap),
                  child: Text(terms.minorRepairCap == null ? 'Set' : 'Edit'),
                )
              : null,
        ),
        if (terms.role != 'TENANT') ...[
          const Divider(height: 1),
          SwitchListTile(
            contentPadding: const EdgeInsets.fromLTRB(16, 6, 12, 6),
            title: const Text('Agent can agree costs'),
            subtitle: Text(
              terms.canEditAgentAuthority
                  ? 'Lets the agent accept or reject cost proposals for you'
                  : 'Only the landlord can change this',
            ),
            value: terms.agentMayAgreeCosts,
            onChanged: terms.canEditAgentAuthority ? _setAgentAuthority : null,
          ),
        ],
      ],
    ),
  );

  Widget _emptyMaintenance() => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Icon(Icons.task_alt, color: KiviloColors.green, size: 32),
          const SizedBox(height: 12),
          Text(
            'No open requests',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'This tenancy has no reported maintenance problems.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    ),
  );

  Widget _emptyAssets() => Card(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          const Icon(
            Icons.inventory_2_outlined,
            color: KiviloColors.subtle,
            size: 28,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              'No assets have been added to this property yet.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    ),
  );
}

typedef _TenancyData = (
  List<MaintenanceCaseSummary>,
  List<PropertyAssetSummary>,
  TenancyDetail,
);
