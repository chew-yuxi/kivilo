import 'package:flutter/material.dart';

import '../models/agency.dart';
import '../services/workspace.dart';
import '../ui/workspace_picker.dart';
import '../services/api.dart';
import '../services/product_events.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_illustration.dart';
import '../ui/kivilo_theme.dart';
import '../models/property_work.dart';
import 'inspection_screen.dart';
import 'property_screen.dart';
import 'new_inspection_screen.dart';
import 'renewal_reminders.dart';
import 'team_screen.dart';

/// Filters on a property's current stage. Archived and Recently deleted are separate
/// lists the server returns on their own, so choosing one fetches it.
enum _PropertyFilter {
  all('All'),
  inProgress('In progress'),
  awaiting('Awaiting signatures'),
  checkOutDue('Check-out due'),
  running('Running'),
  ended('Ended'),
  archived('Archived', state: 'archived'),
  trash('Recently deleted', state: 'trash');

  const _PropertyFilter(this.label, {this.state = 'active'});
  final String label;
  final String state;

  bool includes(PropertyWorkItem property) => switch (this) {
    all || archived || trash => true,
    inProgress => const {
      'CHECK_IN_IN_PROGRESS',
      'CHECK_OUT_IN_PROGRESS',
    }.contains(property.stage),
    awaiting => const {
      'CHECK_IN_AWAITING',
      'CHECK_OUT_AWAITING',
    }.contains(property.stage),
    checkOutDue => property.stage == 'CHECK_OUT_DUE',
    running => property.stage == 'RUNNING',
    ended => property.stage == 'ENDED',
  };
}

/// One card per property, at the stage of its newest term, in the chosen workspace.
class PropertiesScreen extends StatefulWidget {
  const PropertiesScreen({
    super.key,
    this.api,
    this.trackView = true,
    this.workspace,
  });
  final Workspace? workspace;
  final Api? api;
  final bool trackView;

  @override
  State<PropertiesScreen> createState() => _PropertiesScreenState();
}

class _PropertiesScreenState extends State<PropertiesScreen> {
  late final _api = widget.api ?? Api();
  late final _workspace = widget.workspace ?? Workspace(_api);
  late Loading<List<PropertyWorkItem>> _loading = _api.load(_load);
  /// Bumped whenever a different list is asked for (workspace, agent, archived or
  /// deleted), so the previous list's rows never show while the new one loads.
  int _scope = 0;
  final _search = TextEditingController();
  _PropertyFilter _filter = _PropertyFilter.all;
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

  Future<List<PropertyWorkItem>> _load() async {
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
    return _api.propertyWork(
      agencyId: agency?.id,
      personal: _workspace.personal,
      assigneeId: _assigneeId,
      state: _filter.state,
    );
  }

  /// The same list keeps showing while it refreshes; a different list starts blank
  /// and shows its own saved copy, if there is one.
  Future<void> _refresh({bool newScope = false}) async {
    final next = _api.load(_load, savedFirst: newScope);
    setState(() {
      _loading = next;
      if (newScope) _scope++;
      _workError = null;
      _renewalsVersion += 1;
    });
    try {
      await next.fresh;
    } catch (error) {
      // The list renders the failure; callback errors also need handling.
      if (mounted && identical(_loading, next)) {
        setState(() => _workError = plainError(error));
      }
    }
  }

  Future<void> _selectWorkspace(String value) async {
    try {
      await _workspace.select(value);
      if (!mounted) return;
      _assigneeId = null;
      await _refresh(newScope: true);
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
      if (mounted) await _refresh(newScope: selected != null);
    } catch (error) {
      if (mounted) setState(() => _workError = plainError(error));
    }
  }

  Future<void> _create() async {
    if (_creating) return;
    setState(() => _creating = true);
    try {
      await _loading.fresh;
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

  Future<void> _openProperty(String id) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => PropertyScreen(propertyId: id, api: _api)),
    );
    if (mounted) await _refresh();
  }

  void _selectFilter(_PropertyFilter filter) {
    final refetch = filter.state != _filter.state;
    setState(() => _filter = filter);
    if (refetch) _refresh(newScope: true);
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
        child: StreamBuilder<List<PropertyWorkItem>>(
          key: ValueKey(_scope),
          stream: _loading.stream,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return KiviloMessage(
                icon: Icons.cloud_off_outlined,
                title: 'Could not load properties',
                body: plainError(snapshot.error!),
                actionLabel: 'Try again',
                onAction: _refresh,
                extra: _workspace.all
                    ? null
                    : Padding(
                        padding: const EdgeInsets.only(top: kiviloButtonGap),
                        child: OutlinedButton(
                          onPressed: () => _selectWorkspace('all'),
                          child: const Text('Show all properties'),
                        ),
                      ),
              );
            }

            // A spinner only when there is nothing to show yet.
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final properties = snapshot.data!;
            final query = _search.text.trim().toLowerCase().replaceAll(
              RegExp(r'[\s_-]+'),
              ' ',
            );
            final visible = properties.where((property) {
              final text =
                  '${property.address} ${property.tenant} ${property.stageLabel}'
                      .toLowerCase()
                      .replaceAll(RegExp(r'[\s_-]+'), ' ');
              return _filter.includes(property) && text.contains(query);
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
                      'Properties',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Every property you work, and where each one is at.',
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
                          _refresh(newScope: true);
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
                      KiviloNotice(
                        tone: KiviloTone.warning,
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
                    ],
                    const SizedBox(height: 16),
                    if (properties.isEmpty && _filter.state == 'active')
                      _messageCard()
                    else ...[
                      TextField(
                        controller: _search,
                        onChanged: (_) => setState(() {}),
                        textInputAction: TextInputAction.search,
                        onSubmitted: (_) => FocusScope.of(context).unfocus(),
                        decoration: InputDecoration(
                          labelText: 'Search properties',
                          hintText: 'Address, tenant or stage',
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
                          for (final filter in _PropertyFilter.values)
                            ChoiceChip(
                              label: Text(
                                // Counts describe the list on screen; Archived and
                                // Recently deleted are fetched when chosen.
                                filter.state != 'active' || _filter.state != 'active'
                                    ? filter.label
                                    : '${filter.label} · ${properties.where(filter.includes).length}',
                              ),
                              selected: _filter == filter,
                              onSelected: (_) => _selectFilter(filter),
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
                        '${visible.length} ${visible.length == 1 ? 'property' : 'properties'}'
                        '${query.isNotEmpty || _filter != _PropertyFilter.all ? ' found' : ''}',
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
                                  _filter == _PropertyFilter.trash
                                      ? 'Nothing in Recently deleted'
                                      : _filter == _PropertyFilter.archived
                                      ? 'No archived properties'
                                      : 'No matching properties',
                                  textAlign: TextAlign.center,
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Try another address or tenant, or change your filters.',
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: double.infinity,
                                  child: TextButton(
                                    onPressed: () {
                                      _search.clear();
                                      _selectFilter(_PropertyFilter.all);
                                    },
                                    child: const Text('Show all properties'),
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
                            for (final property in visible)
                              SizedBox(
                                width: cardWidth,
                                child: _propertyCard(property),
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

  Widget _propertyCard(PropertyWorkItem property) => Card(
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => _openProperty(property.id),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    property.address,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${property.tenant} · ${property.agencyName ?? 'Personal'}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  if (property.leadAgentName != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Responsible: ${property.leadAgentName}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                  const SizedBox(height: 12),
                  PropertyStagePill(
                    stage: property.stage,
                    label: property.state == 'TRASHED'
                        ? 'Recently deleted'
                        : property.state == 'ARCHIVED'
                        ? 'Archived · ${property.stageLabel}'
                        : property.stageLabel,
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: KiviloColors.subtle),
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
            'No properties yet',
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
}
