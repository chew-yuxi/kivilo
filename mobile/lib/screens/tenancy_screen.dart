import 'package:flutter/material.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import 'maintenance_case_screen.dart';
import 'new_maintenance_case_screen.dart';

class TenancyScreen extends StatefulWidget {
  const TenancyScreen({super.key, required this.tenancy});
  final TenancySummary tenancy;

  @override
  State<TenancyScreen> createState() => _TenancyScreenState();
}

class _TenancyScreenState extends State<TenancyScreen> {
  final _api = Api();
  late Future<(List<MaintenanceCaseSummary>, List<PropertyAssetSummary>)>
  _future = _load();

  Future<(List<MaintenanceCaseSummary>, List<PropertyAssetSummary>)>
  _load() async => (
    await _api.maintenanceCases(widget.tenancy.id),
    await _api.propertyAssets(widget.tenancy.propertyId),
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

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.tenancy.property),
      actions: [
        if (widget.tenancy.role != 'TENANT')
          IconButton(
            tooltip: 'Add property asset',
            icon: const Icon(Icons.add_home_work_outlined),
            onPressed: _addAsset,
          ),
      ],
    ),
    body: FutureBuilder<(List<MaintenanceCaseSummary>, List<PropertyAssetSummary>)>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('${snapshot.error}'));
        }
        final (cases, assets) = snapshot.data!;
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                color: Theme.of(context).colorScheme.errorContainer,
                child: const ListTile(
                  leading: Icon(Icons.emergency_outlined),
                  title: Text('Immediate danger?'),
                  subtitle: Text('Police 999 · Fire or ambulance 995'),
                ),
              ),
              FilledButton.icon(
                onPressed: () => _report(assets),
                icon: const Icon(Icons.add),
                label: const Text('Report a problem'),
              ),
              const SizedBox(height: 24),
              Text(
                'Maintenance',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              if (cases.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Text(
                    'No maintenance has been reported for this tenancy.',
                  ),
                ),
              for (final item in cases)
                Card(
                  child: ListTile(
                    title: Text(item.title),
                    subtitle: Text(
                      '${item.status.replaceAll('_', ' ').toLowerCase()}'
                      '${item.asset == null ? '' : ' · ${item.asset}'}'
                      '${item.repairAttempts == 0 ? '' : ' · ${item.repairAttempts} repair attempts'}',
                    ),
                    leading: Icon(
                      item.priority == 'SAFETY_EMERGENCY'
                          ? Icons.warning_amber
                          : Icons.build_outlined,
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      await Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) =>
                              MaintenanceCaseScreen(caseId: item.id),
                        ),
                      );
                      if (mounted) await _refresh();
                    },
                  ),
                ),
              if (assets.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text(
                  'Property assets',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                for (final asset in assets)
                  ListTile(
                    title: Text(asset.name),
                    subtitle: Text(
                      [
                        if (asset.roomLabel != null) asset.roomLabel!,
                        '${asset.repairVisitsLast365Days} repairs in 365 days',
                      ].join(' · '),
                    ),
                    trailing: asset.repairVisitsLast365Days >= 4
                        ? const Chip(label: Text('Repeat fault'))
                        : null,
                  ),
              ],
            ],
          ),
        );
      },
    ),
  );
}
