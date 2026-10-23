import 'package:flutter/material.dart';

import '../models/inspection.dart';
import '../models/agency.dart';
import '../services/workspace.dart';
import '../ui/workspace_picker.dart';
import '../services/api.dart';
import '../services/product_events.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_illustration.dart';
import '../ui/kivilo_theme.dart';
import 'inspection_screen.dart';
import 'new_inspection_screen.dart';
import 'renewal_reminders.dart';
import 'team_screen.dart';

enum _InspectionFilter {
  all('All'),
  inProgress('In progress'),
  awaitingSignature('Awaiting signature'),
  completed('Completed');

  const _InspectionFilter(this.label);
  final String label;

  bool includes(String status) => switch (this) {
    all => true,
    inProgress => const {
      'DRAFT',
      'CAPTURING',
      'PROCESSING',
      'REVIEW',
      'FAILED',
    }.contains(status),
    awaitingSignature => status == 'AWAITING_SIGNATURE',
    completed => status == 'COMPLETED',
  };
}

class InspectionsScreen extends StatefulWidget {
  const InspectionsScreen({
    super.key,
    this.api,
    this.trackView = true,
    this.workspace,
  });
  final Workspace? workspace;
  final Api? api;
  final bool trackView;

  @override
  State<InspectionsScreen> createState() => _InspectionsScreenState();
}

class _InspectionsScreenState extends State<InspectionsScreen> {
  late final _api = widget.api ?? Api();
  late final _workspace = widget.workspace ?? Workspace(_api);
  late Future<List<InspectionSummary>> _future = _load();
  final _search = TextEditingController();
  _InspectionFilter _filter = _InspectionFilter.all;
  int _renewalsVersion = 0;
  bool _creating = false;
  AgencySummary? get _agency => _workspace.agency;
  AgencyDetail? _teamDetail;
  String? _assigneeId;
  String? _workError;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<List<InspectionSummary>> _load() async {
    final previous = _workspace.value;
    await _workspace.refresh();
    if (_workspace.value != previous) _assigneeId = null;
    final agency = _agency;
    _teamDetail = agency == null ? null : await _api.agency(agency.id);
    if (_teamDetail?.canManage != true) {
      _assigneeId = null;
    } else if (_assigneeId != null &&
        !_teamDetail!.members.any(
          (member) => member.active && member.stakeholderId == _assigneeId,
        )) {
      _assigneeId = null;
    }
    return _workspace.all
        ? _api.inspections()
        : _api.inspectionWork(
            agencyId: agency?.id,
            personal: _workspace.personal,
            assigneeId: _assigneeId,
          );
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _future = next;
      _workError = null;
      _renewalsVersion += 1;
    });
    try {
      await next;
    } catch (error) {
      // FutureBuilder renders the failure; callback errors also need handling.
      if (mounted && identical(_future, next)) {
        setState(() => _workError = plainError(error));
      }
    }
  }

  Future<void> _selectWorkspace(String value) async {
    try {
      await _workspace.select(value);
      if (!mounted) return;
      _assigneeId = null;
      await _refresh();
    } catch (error) {
      if (mounted) setState(() => _workError = plainError(error));
    }
  }

  Future<void> _teams() async {
    final selected = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => TeamScreen(api: _api, selectWorkspace: true),
      ),
    );
    if (!mounted) return;
    try {
      await _workspace.refresh();
      if (selected != null) await _workspace.select(selected);
      if (mounted) await _refresh();
    } catch (error) {
      if (mounted) setState(() => _workError = plainError(error));
    }
  }

  Future<void> _create() async {
    if (_creating) return;
    setState(() => _creating = true);
    try {
      await _future;
      if (!mounted) return;
      final agency = _workspace.all
          ? _workspace.index.agencies.firstOrNull
          : _agency;
      final id = await Navigator.of(context).push<String>(
        MaterialPageRoute(
          builder: (_) => NewInspectionScreen(api: _api, initialAgency: agency),
        ),
      );
      if (!mounted || id == null) return;
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => InspectionScreen(id: id, api: _api),
        ),
      );
      if (mounted) await _refresh();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Future<void> _openInspection(String id) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => InspectionScreen(id: id, api: _api)),
    );
    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) => ProductScreen(
    screen: ProductScreenName.inspections,
    active: widget.trackView,
    child: Scaffold(
    appBar: ModalRoute.of(context)?.canPop == true ? AppBar() : null,
    floatingActionButton: FloatingActionButton.extended(
      onPressed: _creating ? null : _create,
      backgroundColor: KiviloColors.pink,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.add),
      label: const Text('New check-in'),
    ),
    body: SafeArea(
      bottom: false,
      child: KiviloContent(
      maxWidth: 1200,
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<InspectionSummary>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _message(
                icon: Icons.cloud_off_outlined,
                title: 'Could not load inspections',
                body: plainError(snapshot.error!),
                action: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    OutlinedButton(
                      onPressed: _refresh,
                      child: const Text('Try again'),
                    ),
                    if (!_workspace.all) ...[
                      const SizedBox(height: kiviloButtonGap),
                      OutlinedButton(
                        onPressed: () => _selectWorkspace('all'),
                        child: const Text('Show all properties'),
                      ),
                    ],
                  ],
                ),
              );
            }

            final inspections = snapshot.data!;
              final query = _search.text.trim().toLowerCase().replaceAll(
                RegExp(r'[\s_-]+'),
                ' ',
              );
            final visible = inspections.where((inspection) {
              final text =
                  '${inspection.property} ${inspection.tenant} ${inspection.kindLabel}'
                      .toLowerCase()
                      .replaceAll(RegExp(r'[\s_-]+'), ' ');
              return _filter.includes(inspection.status) && text.contains(query);
            }).toList();
            return LayoutBuilder(
              builder: (context, constraints) {
                final available = constraints.maxWidth - 32;
                final columns = available >= 680 ? 2 : 1;
                final cardWidth = (available - (columns - 1) * 16) / columns;
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 112),
                  children: [
                    Text(
                      'Inspections',
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Your check-in and check-out reports, all in one place.',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 16),
                    WorkspacePicker(
                      workspace: _workspace,
                      onChanged: _selectWorkspace,
                      onTeams: _teams,
                    ),
                    if (_teamDetail?.canManage == true) ...[
                      const SizedBox(height: 12),
                      KiviloSelectField<String?>(
                        label: 'Responsible agent',
                        value: _assigneeId,
                        options: [
                          const KiviloSelectOption<String?>(
                            value: null,
                            label: 'All agents',
                          ),
                          for (final member in _teamDetail!.members.where(
                            (member) => member.active,
                          ))
                            KiviloSelectOption<String?>(
                              value: member.stakeholderId,
                              label: member.name,
                            ),
                        ],
                        onChanged: (value) {
                          setState(() => _assigneeId = value);
                          _refresh();
                        },
                      ),
                      const SizedBox(height: 8),
                      const Text('Shows team work your account can access.'),
                    ],
                    if (_workError != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _workError!,
                        style: const TextStyle(color: KiviloColors.red),
                      ),
                    ],
                    RenewalReminders(
                      key: ValueKey(_renewalsVersion),
                      api: _api,
                      onRenewed: _refresh,
                      agencyId: _agency?.id,
                      personal: _workspace.personal,
                    ),
                    if (_api.offlineCopy) ...[
                      const SizedBox(height: 18),
                      Card(
                        color: KiviloColors.amberSoft,
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.cloud_off_outlined,
                                color: KiviloColors.amber,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Offline. Showing what was last loaded; you can keep taking photos.',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodyMedium,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    if (inspections.isEmpty)
                      _messageCard()
                    else ...[
                      TextField(
                        controller: _search,
                        onChanged: (_) => setState(() {}),
                        textInputAction: TextInputAction.search,
                        onSubmitted: (_) => FocusScope.of(context).unfocus(),
                        decoration: InputDecoration(
                          labelText: 'Search inspections',
                          hintText: 'Property, tenant or check-in / check-out',
                          suffixIcon: _search.text.isEmpty
                              ? null
                              : IconButton(
                                  tooltip: 'Clear search',
                                  onPressed: () => setState(_search.clear),
                                  icon: const Icon(Icons.close),
                                ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      // One scrolling row, so the filters never take a second line.
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                        spacing: 8,
                        children: [
                          for (final filter in _InspectionFilter.values)
                            ChoiceChip(
                              label: Text(
                                '${filter.label} · ${inspections.where((inspection) => filter.includes(inspection.status)).length}',
                              ),
                              selected: _filter == filter,
                              onSelected: (_) => setState(() => _filter = filter),
                              selectedColor: KiviloColors.ink,
                              backgroundColor: Colors.white,
                              checkmarkColor: Colors.white,
                              labelStyle: TextStyle(
                                color: _filter == filter
                                    ? Colors.white
                                    : KiviloColors.body,
                                fontWeight: FontWeight.w600,
                              ),
                              side: BorderSide(
                                color: _filter == filter
                                    ? KiviloColors.ink
                                    : KiviloColors.border,
                              ),
                            ),
                        ],
                      ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '${visible.length} ${visible.length == 1 ? 'report' : 'reports'}'
                        '${query.isNotEmpty || _filter != _InspectionFilter.all ? ' found' : ''}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 8),
                      if (visible.isEmpty)
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              children: [
                                const Icon(
                                  Icons.inventory_2_outlined,
                                  size: 32,
                                  color: KiviloColors.muted,
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'No matching inspections',
                                  textAlign: TextAlign.center,
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Try another property or tenant, or change your filters.',
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: double.infinity,
                                  child: TextButton(
                                    onPressed: () => setState(() {
                                      _search.clear();
                                      _filter = _InspectionFilter.all;
                                    }),
                                    child: const Text('Show all inspections'),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      if (visible.isNotEmpty)
                        Wrap(
                          spacing: 16,
                          runSpacing: 16,
                          children: [
                            for (final inspection in visible)
                              SizedBox(
                                width: cardWidth,
                                child: _inspectionCard(inspection),
                              ),
                          ],
                        ),
                    ],
                  ],
                );
              },
            );
          },
        ),
      ),
    )),
  ),
  );

  Widget _inspectionCard(InspectionSummary inspection) => Card(
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => _openInspection(inspection.id),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: KiviloColors.canvas,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                inspection.kind == 'CHECK_IN'
                    ? Icons.login_outlined
                    : Icons.logout_outlined,
                size: 21,
                color: KiviloColors.body,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    inspection.kindLabel,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    inspection.property,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    inspection.tenant,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  if (inspection.leadAgent != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Responsible: ${inspection.leadAgent!['name']}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      KiviloStatusPill(status: inspection.status),
                      Text(
                        '${inspection.rooms} ${inspection.rooms == 1 ? 'room' : 'rooms'}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(top: 10),
              child: Icon(Icons.chevron_right, color: KiviloColors.subtle),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _messageCard() => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const KiviloIllustration(
            scene: KiviloScene.handover,
            width: 200,
            height: 120,
          ),
          const SizedBox(height: 14),
          Text(
            'No inspections yet',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            _api.offlineCopy
                ? 'Connect to create a new check-in.'
                : 'Start a check-in for your next handover. Your inventory, photos and signed report will live here.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          if (!_api.offlineCopy) ...[
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _create,
                icon: const Icon(Icons.add),
                label: const Text('Start check-in'),
              ),
            ),
          ],
        ],
      ),
    ),
  );

  Widget _message({
    required IconData icon,
    required String title,
    required String body,
    required Widget action,
  }) => ListView(
    physics: const AlwaysScrollableScrollPhysics(),
    children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(32, 80, 32, 32),
        child: Column(
          children: [
            Icon(icon, size: 36, color: KiviloColors.subtle),
            const SizedBox(height: 14),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(body, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            SizedBox(width: double.infinity, child: action),
          ],
        ),
      ),
    ],
  );
}
