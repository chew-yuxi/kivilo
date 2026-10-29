import 'package:flutter/material.dart';

import '../models/home_tasks.dart';
import '../services/api.dart';
import '../services/workspace.dart';
import '../ui/workspace_picker.dart';
import '../services/product_events.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/handover_guide.dart';
import '../ui/kivilo_illustration.dart';
import 'cdd_screen.dart';
import 'inspection_screen.dart';
import 'home_tasks.dart';
import 'party_homes_screen.dart';
import 'properties_screen.dart';
import 'new_inspection_screen.dart';
import 'notifications_screen.dart';
import 'service_directory_screen.dart';
import 'settings_screen.dart';
import 'team_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, this.api});
  final Api? api;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final _api = widget.api ?? Api();
  late final _workspace = Workspace(_api)..addListener(_contextChanged);
  late Loading<HomeTasks> _loading = _api.load(_load);

  /// Bumped when the context changes, so one context's work never shows while
  /// another's loads.
  int _scope = 0;
  int _tab = 0;
  final Set<String> _visitedTabs = {'home'};

  static const _tabs = ['home', 'properties', 'account'];

  @override
  void dispose() {
    _workspace.removeListener(_contextChanged);
    super.dispose();
  }

  Future<HomeTasks> _load() async {
    await _workspace.refresh();
    return _fetch();
  }

  /// The tasks for the context selected now. "View all" reads the same route.
  Future<HomeTasks> _fetch() async {
    final party = _workspace.party;
    try {
      return await _api.homeTasks(
        context: party == null ? 'work' : party.toLowerCase(),
        agencyId: party == null ? _workspace.agency?.id : null,
        personal: party == null && _workspace.personal,
      );
    } on ApiFailure catch (error) {
      // No connection and no Home saved yet: an app updated while offline. Its
      // inspectors still need their unfinished reports, which the work list before
      // Home saved on this phone. Any answer from the server is shown as it is.
      if (error.statusCode != null || party != null) rethrow;
      final saved = await _api.inspections();
      return HomeTasks(
        tasks: [
          for (final inspection in saved)
            if (inspection.status != 'AWAITING_SIGNATURE' &&
                inspection.status != 'COMPLETED')
              HomeTask(
                id: 'inspection:${inspection.id}',
                group: 'ACTION',
                kind: 'CONTINUE_INSPECTION',
                capacity: 'AGENT',
                propertyId: '',
                property: inspection.property,
                tenancyId: inspection.tenancyId ?? '',
                title: inspection.kind == 'CHECK_OUT'
                    ? 'Continue the check-out'
                    : 'Continue the check-in',
                person: inspection.tenant,
                href: '/inspections/${inspection.id}',
              ),
        ],
      );
    }
  }

  void _contextChanged() {
    if (mounted) _refresh(newScope: true);
  }

  Future<void> _selectWorkspace(String value) async {
    try {
      await _workspace.select(value);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
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
      final before = _workspace.value;
      if (selected != null) await _workspace.select(selected);
      // A changed selection refreshes through the listener.
      if (mounted && _workspace.value == before) await _refresh();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    }
  }

  /// The same context keeps showing while it refreshes; another starts blank and
  /// shows its own saved copy, if there is one.
  Future<void> _refresh({bool newScope = false}) async {
    final next = _api.load(_load, savedFirst: newScope);
    setState(() {
      _loading = next;
      if (newScope) _scope++;
    });
    try {
      await next.fresh;
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    }
  }

  Future<void> _create() async {
    final id = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => NewInspectionScreen(
          api: _api,
          initialAgency: _workspace.all
              ? _workspace.index.agencies.firstOrNull
              : _workspace.agency,
        ),
      ),
    );
    if (!mounted || id == null) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => InspectionScreen(id: id, api: _api),
      ),
    );
    if (mounted) await _refresh();
  }

  Future<void> _open(HomeTask task) async {
    await openHomeTask(context, _api, task);
    if (mounted) await _refresh();
  }

  Future<void> _viewAll(String group) async {
    final fetch = _fetch;
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) =>
            HomeTaskListScreen(api: _api, group: group, fetch: fetch),
      ),
    );
    if (mounted) await _refresh();
  }

  void _selectTab(int index) {
    if (index == _tab) return;
    setState(() {
      _tab = index;
      _visitedTabs.add(_tabs[index]);
    });
  }

  @override
  Widget build(BuildContext context) => ProductScreen(
    screen: switch (_tabs[_tab]) {
      'properties' => ProductScreenName.inspections,
      'account' => ProductScreenName.account,
      _ => null,
    },
    child: LayoutBuilder(
    builder: (context, constraints) {
      final tablet = constraints.maxWidth >= kiviloTabletBreakpoint;
      return Scaffold(
        appBar: _tab == 0
            ? AppBar(
                centerTitle: false,
                titleSpacing: 16,
                title: const Row(
                  mainAxisSize: MainAxisSize.min,
                    children: [
                      KiviloMark(size: 28),
                      SizedBox(width: 10),
                      Text('Home'),
                    ],
                ),
                actions: [
                  IconButton(
                    tooltip: 'Notifications',
                    icon: const Icon(Icons.notifications_none_outlined),
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => NotificationsScreen(api: _api),
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Urgent services',
                    icon: const Icon(Icons.home_repair_service_outlined),
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const ServiceDirectoryScreen(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
              )
            : null,
        body: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Keep the content in the same slot when an iPad window is resized.
            SafeArea(
              top: _tab != 0,
              child: tablet
                  ? NavigationRail(
                      selectedIndex: _tab,
                      onDestinationSelected: _selectTab,
                      labelType: NavigationRailLabelType.all,
                      destinations: [
                        for (final tab in _tabs)
                          switch (tab) {
                            'properties' => const NavigationRailDestination(
                              icon: Icon(Icons.apartment_rounded),
                              selectedIcon: Icon(Icons.apartment_rounded),
                              label: Text('Properties'),
                            ),
                            'account' => const NavigationRailDestination(
                              icon: Icon(Icons.person_outline),
                              selectedIcon: Icon(Icons.person),
                              label: Text('Account'),
                            ),
                            _ => const NavigationRailDestination(
                              icon: Icon(Icons.home_outlined),
                              selectedIcon: Icon(Icons.home),
                              label: Text('Home'),
                            ),
                          },
                      ],
                    )
                  : const SizedBox.shrink(),
            ),
            Expanded(
              child: IndexedStack(
                index: _tab,
                children: [
                  for (final tab in _tabs)
                    KeyedSubtree(
                      key: ValueKey('main-tab-$tab'),
                      child: !_visitedTabs.contains(tab)
                          ? const SizedBox.shrink()
                          : switch (tab) {
                              'properties' => _workspace.party == null
                                  ? PropertiesScreen(
                                      api: _api,
                                      trackView: false,
                                      workspace: _workspace,
                                    )
                                  : PartyHomesScreen(
                                      key: ValueKey(_workspace.party),
                                      api: _api,
                                      workspace: _workspace,
                                    ),
                              'account' => SettingsScreen(
                                api: _api,
                                trackView: false,
                                onStartCheckIn: _workspace.hasWork
                                    ? null
                                    : _create,
                              ),
                              _ => _overview(),
                            },
                    ),
                ],
              ),
            ),
          ],
        ),
        bottomNavigationBar: tablet
            ? null
            : BottomNavigationBar(
                currentIndex: _tab,
                onTap: _selectTab,
                items: [
                  for (final tab in _tabs)
                    switch (tab) {
                      'properties' => const BottomNavigationBarItem(
                        icon: Icon(Icons.apartment_rounded),
                        activeIcon: Icon(Icons.apartment_rounded),
                        label: 'Properties',
                      ),
                      'account' => const BottomNavigationBarItem(
                        icon: Icon(Icons.person_outline),
                        activeIcon: Icon(Icons.person),
                        label: 'Account',
                      ),
                      _ => const BottomNavigationBarItem(
                        icon: Icon(Icons.home_outlined),
                        activeIcon: Icon(Icons.home),
                        label: 'Home',
                      ),
                    },
                ],
              ),
      );
    },
  ),
  );

  Widget _overview() => KiviloContent(
    maxWidth: 1200,
    child: RefreshIndicator(
      onRefresh: _refresh,
      child: StreamBuilder<HomeTasks>(
        key: ValueKey(_scope),
        stream: _loading.stream,
        builder: (context, snapshot) {
          // A failure is never shown as an empty list: there is no all-clear here.
          if (snapshot.hasError) {
            return KiviloMessage(
              icon: Icons.cloud_off_outlined,
              title: 'Could not load your tasks',
              body: plainError(snapshot.error!),
              actionLabel: 'Try again',
              onAction: _refresh,
              extra: _workspace.party != null || _workspace.all
                  ? null
                  : Padding(
                      padding: const EdgeInsets.only(top: kiviloButtonGap),
                      child: OutlinedButton(
                        onPressed: () => _selectWorkspace('all'),
                        child: const Text('Show all my work'),
                      ),
                    ),
            );
          }

          // A spinner only when there is nothing to show yet.
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final data = snapshot.data!;
          final text = Theme.of(context).textTheme;
          final work = _workspace.party == null;
          final firstUse = work && !_workspace.contexts.work;
          final open = data.tasks.where(
            (task) => work && !firstUse && task.kind == 'CONTINUE_INSPECTION',
          );
          final latest = open.isEmpty
              ? null
              : open.reduce(
                  (a, b) => (b.date ?? '').compareTo(a.date ?? '') > 0 ? b : a,
                );
          final name = _workspace.profile?.name.trim() ?? '';
          final firstName = name.split(RegExp(r'\s+')).first;
          final hour = DateTime.now().hour;
          final greeting = hour < 12
              ? 'Good morning'
              : hour < 18
              ? 'Good afternoon'
              : 'Good evening';
          final groups = [
            for (final group in homeTaskGroups.keys)
              if (data.group(group).any((task) => task.id != latest?.id)) group,
          ];
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: kiviloScreenPadding,
            children: [
              Text(
                firstName.isEmpty ? greeting : '$greeting, $firstName',
                style: text.headlineMedium,
              ),
              const SizedBox(height: 4),
              Text(
                switch (_workspace.party) {
                  'LANDLORD' => 'Tasks for your properties.',
                  'TENANT' => 'Tasks for your rented homes.',
                  _ => 'Your tasks, updates and upcoming deadlines.',
                },
                style: text.bodyMedium,
              ),
              if (_workspace.showPicker) ...[
                const SizedBox(height: 16),
                WorkspacePicker(
                  workspace: _workspace,
                  onChanged: _selectWorkspace,
                  onTeams: _teams,
                ),
              ],
              if (_api.offlineCopy) ...[
                const SizedBox(height: 12),
                const KiviloNotice(
                  tone: KiviloTone.warning,
                  child: Text(
                    'Offline. Showing tasks as they were last loaded; '
                    'some may already be done.',
                  ),
                ),
              ] else if (snapshot.connectionState != ConnectionState.done) ...[
                const SizedBox(height: 12),
                Semantics(
                  liveRegion: true,
                  child: Text('Checking for updates…', style: text.bodySmall),
                ),
              ],
              if (work) ...[
                const SizedBox(height: 16),
                firstUse ? _startCard() : _shortcuts(latest),
              ],
              for (final group in groups) ...[
                const SizedBox(height: kiviloSectionGap),
                HomeTaskSection(
                  group: group,
                  tasks: data.group(group),
                  excludedTaskId: latest?.id,
                  truncated: data.truncated,
                  onOpen: _open,
                  onViewAll: () => _viewAll(group),
                ),
              ],
              if (groups.isEmpty && latest == null && !firstUse) ...[
                const SizedBox(height: kiviloSectionGap),
                _allClear(),
              ] else if (!groups.contains('ACTION') && latest == null && !firstUse) ...[
                const SizedBox(height: kiviloSectionGap),
                Text(
                  'Nothing needs your action right now.',
                  style: text.bodyMedium,
                ),
              ],
              // The lessons are for someone who has not started yet; afterwards they
              // live in Account, below the work rather than in front of it.
              if (firstUse) ...[
                const SizedBox(height: kiviloSectionGap),
                const HandoverGuide(),
              ],
            ],
          );
        },
      ),
    ),
  );

  /// The newest inspection still open, and a new one: the two things an agent does
  /// most, without repeating the rows below.
  Widget _shortcuts(HomeTask? latest) {
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (latest != null) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const KiviloEyebrow('Continue where you left off'),
                  const SizedBox(height: 8),
                  Text(
                    latest.property,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: text.titleMedium,
                  ),
                  if (latest.person != null) ...[
                    const SizedBox(height: 2),
                    Text(latest.person!, style: text.bodySmall),
                  ],
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: () => _open(latest),
                    icon: const Icon(Icons.chevron_right, size: 20),
                    iconAlignment: IconAlignment.end,
                    label: Text(latest.title),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: kiviloButtonGap),
          OutlinedButton.icon(
            onPressed: _create,
            icon: const Icon(Icons.add, size: 18),
            label: const Text('New check-in'),
          ),
        ] else
          FilledButton.icon(
            onPressed: _create,
            icon: const Icon(Icons.add, size: 20),
            label: const Text('New check-in'),
          ),
        const SizedBox(height: kiviloButtonGap),
        OutlinedButton.icon(
          onPressed: () => Navigator.of(context).push<void>(
            MaterialPageRoute(builder: (_) => CddListScreen(api: _api)),
          ),
          icon: const Icon(Icons.fact_check_outlined, size: 18),
          label: const Text('Due diligence'),
        ),
      ],
    );
  }

  /// Before any work: one clear way in.
  Widget _startCard() => Card(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const KiviloEyebrow('Your first handover'),
          const SizedBox(height: 8),
          const KiviloIllustration(scene: KiviloScene.handover, height: 110),
          const SizedBox(height: 8),
          Text(
            'Great handovers start with a clear record.',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Add the property and tenancy. We’ll guide you from the first photo '
            'to the signed report. You can accept team invitations in Account.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _create,
            icon: const Icon(Icons.chevron_right, size: 20),
            iconAlignment: IconAlignment.end,
            label: const Text('Start check-in'),
          ),
        ],
      ),
    ),
  );

  Widget _allClear() => Card(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, color: KiviloColors.green),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'You’re all caught up',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 2),
                Text(
                  'Nothing is waiting on you or anyone else here.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
