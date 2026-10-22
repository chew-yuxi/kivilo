import 'package:flutter/material.dart';

import '../models/inspection.dart';
import '../models/agency.dart';
import '../services/api.dart';
import '../services/product_events.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_illustration.dart';
import '../ui/kivilo_theme.dart';
import 'inspection_screen.dart';
import 'new_inspection_screen.dart';
import 'renewal_reminders.dart';

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
  const InspectionsScreen({super.key, this.api, this.trackView = true});
  final Api? api;
  final bool trackView;

  @override
  State<InspectionsScreen> createState() => _InspectionsScreenState();
}

class _InspectionsScreenState extends State<InspectionsScreen> {
  late final _api = widget.api ?? Api();
  late Future<List<InspectionSummary>> _future = _api.inspections();
  final _search = TextEditingController();
  _InspectionFilter _filter = _InspectionFilter.all;
  int _renewalsVersion = 0;
  AgencySummary? _agency;
  AgencyDetail? _teamDetail;
  String? _assigneeId;
  String? _workError;
  bool _choosingTeam = false;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    final next = _agency == null && _assigneeId == null
        ? _api.inspections()
        : _api.inspectionWork(agencyId: _agency?.id, assigneeId: _assigneeId);
    setState(() {
      _future = next;
      _workError = null;
      _renewalsVersion += 1;
    });
    try {
      await next;
    } catch (error) {
      // The FutureBuilder shows the failed request; callbacks such as filter
      // changes must also finish without an unhandled asynchronous failure.
      if (mounted && identical(_future, next)) {
        setState(() => _workError = plainError(error));
      }
    }
  }

  Future<void> _returnToMyWork() async {
    setState(() {
      _agency = null;
      _teamDetail = null;
      _assigneeId = null;
      _workError = null;
    });
    await _refresh();
  }

  Future<void> _chooseTeam() async {
    if (_choosingTeam) return;
    setState(() {
      _choosingTeam = true;
      _workError = null;
    });
    try {
      final index = await _api.agencies();
      if (!mounted) return;
      setState(() => _choosingTeam = false);
      final agency = await showKiviloDrawer<AgencySummary>(
        context: context,
        builder: (context) => KiviloDrawer(
          title: const Text('Choose a team'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (index.agencies.isEmpty)
                const Text('Create or join a team in Account → Team.'),
              for (final agency in index.agencies)
                ListTile(
                  title: Text(agency.name),
                  subtitle: Text(agencyRoleLabel(agency.role)),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pop(context, agency),
                ),
            ],
          ),
          actions: [
            OutlinedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
          ],
        ),
      );
      if (agency == null || !mounted) return;
      setState(() => _choosingTeam = true);
      final detail = await _api.agency(agency.id);
      if (!mounted) return;
      setState(() {
        _agency = agency;
        _teamDetail = detail;
        _assigneeId = null;
      });
      await _refresh();
    } catch (error) {
      if (mounted) setState(() => _workError = plainError(error));
    } finally {
      if (mounted) setState(() => _choosingTeam = false);
    }
  }

  Future<void> _create() async {
    final id = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => NewInspectionScreen(api: _api)),
    );
    if (!mounted || id == null) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => InspectionScreen(id: id, api: _api)),
    );
    if (mounted) await _refresh();
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
    appBar: AppBar(title: const Text('Inspections')),
    floatingActionButton: FloatingActionButton.extended(
      onPressed: _create,
      backgroundColor: KiviloColors.pink,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.add),
      label: const Text('New check-in'),
    ),
    body: KiviloContent(
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
                  children: [
                    OutlinedButton(
                      onPressed: _refresh,
                      child: const Text('Try again'),
                    ),
                    if (_agency != null) ...[
                      const SizedBox(height: 8),
                      OutlinedButton(
                        onPressed: _returnToMyWork,
                        child: const Text('Return to My work'),
                      ),
                    ],
                  ],
                ),
              );
            }

            final inspections = snapshot.data!;
            final query = _search.text
                .trim()
                .toLowerCase()
                .replaceAll(RegExp(r'[\s_-]+'), ' ');
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
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 112),
                  children: [
                    Text(
                      'Inspections',
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Your check-in and check-out reports, all in one place.',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 20),
                    KiviloSegmentedControl<String>(
                      value: _agency == null ? 'mine' : 'team',
                      options: const [
                        KiviloSegmentOption(value: 'mine', label: 'My work'),
                        KiviloSegmentOption(
                          value: 'team',
                          label: 'Team work',
                        ),
                      ],
                      onChanged: _choosingTeam
                          ? null
                          : (value) {
                              if (value == 'team') {
                                _chooseTeam();
                              } else {
                                _returnToMyWork();
                              }
                            },
                    ),
                    if (_agency != null) ...[
                      const SizedBox(height: 12),
                      OutlinedButton(
                        onPressed: _choosingTeam ? null : _chooseTeam,
                        child: Text('Team: ${_agency!.name}'),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        key: ValueKey('assignee:${_agency!.id}:$_assigneeId'),
                        initialValue: _assigneeId ?? '',
                        decoration: const InputDecoration(
                          labelText: 'Responsible agent',
                        ),
                        items: [
                          const DropdownMenuItem(
                            value: '',
                            child: Text('All agents'),
                          ),
                          for (final member in _teamDetail!.members.where(
                            (member) => member.active,
                          ))
                            DropdownMenuItem(
                              value: member.stakeholderId,
                              child: Text(member.name),
                            ),
                        ],
                        onChanged: (value) {
                          setState(
                            () => _assigneeId = value == '' ? null : value,
                          );
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
                    if (_choosingTeam) ...[
                      const SizedBox(height: 12),
                      const LinearProgressIndicator(),
                    ],
                    RenewalReminders(
                      key: ValueKey(_renewalsVersion),
                      api: _api,
                      onRenewed: _refresh,
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
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
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
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
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
                      const SizedBox(height: 24),
                      Text(
                        '${visible.length} ${visible.length == 1 ? 'report' : 'reports'}'
                        '${query.isNotEmpty || _filter != _InspectionFilter.all ? ' found' : ''}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 12),
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
                                  style: Theme.of(context).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Try another property or tenant, or change your filters.',
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 12),
                                TextButton(
                                  onPressed: () => setState(() {
                                    _search.clear();
                                    _filter = _InspectionFilter.all;
                                  }),
                                  child: const Text('Show all inspections'),
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
    ),
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
            FilledButton.icon(
              onPressed: _create,
              icon: const Icon(Icons.add),
              label: const Text('Start check-in'),
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
            action,
          ],
        ),
      ),
    ],
  );
}
