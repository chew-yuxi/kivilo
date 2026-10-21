import 'package:flutter/material.dart';

import '../models/inspection.dart';
import '../models/maintenance.dart';
import '../services/api.dart';
import '../services/product_events.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/handover_guide.dart';
import '../ui/kivilo_illustration.dart';
import 'inspection_screen.dart';
import 'inspections_screen.dart';
import 'new_inspection_screen.dart';
import 'notifications_screen.dart';
import 'report_screen.dart';
import 'service_directory_screen.dart';
import 'settings_screen.dart';
import 'tenancy_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, this.api});
  final Api? api;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final _api = widget.api ?? Api();
  late Future<(UserProfile, List<TenancySummary>, List<InspectionSummary>)>
  _future = _load();
  int _tab = 0;

  /// Someone who is only a landlord or tenant: no inspections of their own and no deal
  /// they are the agent on. They get their tenancies, not an inspector's desk.
  bool _partyOnly = false;

  List<String> get _tabs => _partyOnly
      ? const ['home', 'account']
      : const ['home', 'inspections', 'account'];

  Future<(UserProfile, List<TenancySummary>, List<InspectionSummary>)>
  _load() async {
    final profile = _api.me();
    final tenancies = _api.tenancies();
    final inspections = _api.inspections();
    final loaded = (await profile, await tenancies, await inspections);
    final partyOnly =
        loaded.$1.roles.isNotEmpty &&
        !loaded.$1.roles.contains('AGENT') &&
        loaded.$3.isEmpty;
    if (mounted && partyOnly != _partyOnly) {
      setState(() {
        _partyOnly = partyOnly;
        _tab = 0;
      });
    }
    return loaded;
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _future = next;
    });
    await next;
  }

  Future<void> _create() async {
    final id = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const NewInspectionScreen()),
    );
    if (!mounted || id == null) return;
    await Navigator.of(
      context,
    ).push<void>(MaterialPageRoute(builder: (_) => InspectionScreen(id: id, api: _api)));
    if (mounted) await _refresh();
  }

  Future<void> _openReport(String id) async {
    await Navigator.of(
      context,
    ).push<void>(MaterialPageRoute(builder: (_) => ReportScreen(id: id, api: _api)));
    if (mounted) await _refresh();
  }

  Future<void> _openInspection(String id) async {
    await Navigator.of(
      context,
    ).push<void>(MaterialPageRoute(builder: (_) => InspectionScreen(id: id, api: _api)));
    if (mounted) await _refresh();
  }

  void _selectTab(int index) {
    if (index == _tab) return;
    setState(() => _tab = index);
    if (index == 0) _refresh();
  }

  @override
  Widget build(BuildContext context) => ProductScreen(
    screen: switch (_tabs[_tab]) {
      'inspections' => ProductScreenName.inspections,
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
                  children: [KiviloMark(size: 28), SizedBox(width: 10), Text('Home')],
                ),
                actions: [
                  IconButton(
                    tooltip: 'Notifications',
                    icon: const Icon(Icons.notifications_none_outlined),
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const NotificationsScreen(),
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
                            'inspections' => const NavigationRailDestination(
                              icon: Icon(Icons.fact_check_outlined),
                              selectedIcon: Icon(Icons.fact_check),
                              label: Text('Inspections'),
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
              child: switch (_tabs[_tab]) {
                'inspections' => InspectionsScreen(api: widget.api, trackView: false),
                'account' => SettingsScreen(
                  trackView: false,
                  onStartCheckIn: _partyOnly ? _create : null,
                ),
                _ => _overview(),
              },
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
                      'inspections' => const BottomNavigationBarItem(
                        icon: Icon(Icons.fact_check_outlined),
                        activeIcon: Icon(Icons.fact_check),
                        label: 'Inspections',
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
      child:
          FutureBuilder<
            (UserProfile, List<TenancySummary>, List<InspectionSummary>)
          >(
            future: _future,
            builder: (context, snapshot) {
              if (!snapshot.hasData && !snapshot.hasError) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(24),
                  children: [
                    const SizedBox(height: 80),
                    const Icon(
                      Icons.cloud_off_outlined,
                      size: 40,
                      color: KiviloColors.muted,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Could not load your workspace',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      plainError(snapshot.error!),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton(
                      onPressed: _refresh,
                      child: const Text('Try again'),
                    ),
                  ],
                );
              }

              final (profile, tenancies, inspections) = snapshot.data!;
              final inProgress = inspections.where(
                (item) => !['COMPLETED', 'AWAITING_SIGNATURE'].contains(item.status),
              );
              final awaiting = inspections.where(
                (item) => item.status == 'AWAITING_SIGNATURE',
              );
              final current = inProgress.firstOrNull ?? awaiting.firstOrNull;
              final firstName = profile.name.trim().split(RegExp(r'\s+')).first;
              final hour = DateTime.now().hour;
              final greeting = hour < 12
                  ? 'Good morning'
                  : hour < 18
                  ? 'Good afternoon'
                  : 'Good evening';

              return LayoutBuilder(
                builder: (context, constraints) {
                  final available = constraints.maxWidth - 32;
                  final columns = available >= 680 ? 2 : 1;
                  final cardWidth = (available - (columns - 1) * 16) / columns;
                  final nextStep = Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _workCard(current),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 12,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            '${inProgress.length} in progress · ${awaiting.length} awaiting signatures',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          TextButton.icon(
                            onPressed: () => _selectTab(1),
                            icon: const Icon(Icons.chevron_right, size: 18),
                            iconAlignment: IconAlignment.end,
                            label: const Text('View inspections'),
                          ),
                          if (current != null)
                            TextButton.icon(
                              onPressed: _create,
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text('New check-in'),
                            ),
                        ],
                      ),
                    ],
                  );
                  return ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
                    children: [
                      Text(
                        '$greeting, $firstName',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _partyOnly
                            ? 'Your reports, repairs and history, in one place.'
                            : 'A clear next step for every handover.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 24),
                      if (!_partyOnly) ...[
                        if (columns == 2)
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(child: nextStep),
                              const SizedBox(width: 24),
                              const Expanded(child: HandoverGuide()),
                            ],
                          )
                        else ...[
                          nextStep,
                          const SizedBox(height: 24),
                          const HandoverGuide(),
                        ],
                        const SizedBox(height: 32),
                      ],
                      if (tenancies.isNotEmpty) ...[
                        KiviloSectionHeading(
                          title: 'Your properties',
                          subtitle: 'Repairs, records and the people who live there.',
                        ),
                        const SizedBox(height: 12),
                      ],
                      if (tenancies.isEmpty && !_partyOnly)
                        _emptyProperties()
                      else
                        Wrap(
                          spacing: 16,
                          runSpacing: 12,
                          children: [
                            for (final tenancy in tenancies)
                              SizedBox(
                                width: cardWidth,
                                child: _partyOnly
                                    ? _partyCard(tenancy)
                                    : _propertyCard(
                                        tenancy,
                                        inspections
                                            .where(
                                              (inspection) =>
                                                  inspection.tenancyId ==
                                                  tenancy.id,
                                            )
                                            .toList(),
                                      ),
                              ),
                          ],
                        ),
                    ],
                  );
                },
              );
            },
          ),
    ),
  );

  Widget _workCard(InspectionSummary? current) {
    final awaiting = current?.status == 'AWAITING_SIGNATURE';
    final firstRoom = current != null && current.rooms == 0 && !awaiting;
    final compactArt = MediaQuery.sizeOf(context).height < 700 ||
        MediaQuery.textScalerOf(context).scale(14) > 18;
    final scene = awaiting
        ? KiviloScene.sign
        : current?.status == 'REVIEW'
        ? KiviloScene.inventory
        : current == null || firstRoom
        ? KiviloScene.handover
        : KiviloScene.capture;
    final eyebrow = Text(
      current == null
          ? 'YOUR NEXT HANDOVER'
          : awaiting
          ? 'WAITING FOR SIGNATURES'
          : 'YOUR NEXT STEP',
      style: const TextStyle(
        color: KiviloColors.pinkDark,
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.1,
      ),
    );
    return Card(
      color: KiviloColors.pinkSoft,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (compactArt)
              Row(
                children: [
                  Expanded(child: eyebrow),
                  const SizedBox(width: 12),
                  KiviloIllustration(scene: scene, width: 96, height: 64),
                ],
              )
            else ...[
              eyebrow,
              const SizedBox(height: 8),
              KiviloIllustration(
                scene: scene,
                height: 124,
              ),
            ],
            const SizedBox(height: 12),
            Text(
              current == null
                  ? 'Great handovers start\nwith a clear record.'
                  : awaiting
                  ? 'Bring everyone onto\nthe same page.'
                  : firstRoom
                  ? 'Start with the first room.'
                  : 'One room at a time.',
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            const SizedBox(height: 14),
            if (current != null) ...[
              Text(
                current.property,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                '${current.kindLabel} · ${current.tenant}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
            ],
            Text(
              current == null
                  ? 'Add the property and tenancy. We’ll guide you from the first photo to the signed report.'
                  : awaiting
                  ? 'The inventory is frozen. Check who still needs to sign, or send their signing email again.'
                  : firstRoom
                  ? 'Add a room, take photos, then write down what you find.'
                  : 'Open a room, choose an inventory item, then add photos and check its condition before reviewing the room.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: current == null
                  ? _create
                  : () => _openInspection(current.id),
              icon: const Icon(Icons.chevron_right, size: 20),
              iconAlignment: IconAlignment.end,
              label: Text(
                current == null
                    ? 'Start check-in'
                    : awaiting
                    ? 'Check signatures'
                    : firstRoom
                    ? 'Add your first room'
                    : 'Continue inspection',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _propertyCard(
    TenancySummary tenancy,
    List<InspectionSummary> inspections,
  ) {
    final target = inspections.firstOrNull;
    final current = inspections.where(
      (inspection) => !['AWAITING_SIGNATURE', 'COMPLETED'].contains(inspection.status),
    ).firstOrNull;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _openTenancy(tenancy, currentInspection: current),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: KiviloColors.canvas,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.home_outlined,
                      color: KiviloColors.body,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tenancy.property,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '${_roleLabel(tenancy.role)} · ${tenancy.tenant}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: KiviloColors.subtle),
                ],
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  TextButton(
                    onPressed: () => _openTenancy(tenancy, currentInspection: current),
                    child: const Text('Open property'),
                  ),
                  if (target != null)
                    TextButton(
                      onPressed: () => _openInspection(target.id),
                      child: Text('Open ${target.kindLabel.toLowerCase()}'),
                    )
                  else if (tenancy.latestReportId != null)
                    TextButton(
                      onPressed: () => _openReport(tenancy.latestReportId!),
                      child: const Text('View report'),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// A landlord's or tenant's tenancy: the report they agreed and the repairs since.
  Widget _partyCard(TenancySummary tenancy) {
    final text = Theme.of(context).textTheme;
    final reportId = tenancy.latestReportId;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _openTenancy(tenancy),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                tenancy.property,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: text.titleMedium,
              ),
              const SizedBox(height: 3),
              Text(
                tenancy.role == 'LANDLORD'
                    ? 'You are the landlord'
                    : 'You are the tenant',
                style: text.bodySmall,
              ),
              if (reportId == null) ...[
                const SizedBox(height: 12),
                Text(
                  'Your check-in report appears here once your agent sends it.',
                  style: text.bodySmall,
                ),
              ],
              const SizedBox(height: 14),
              // Stacked full width: half a card is too tight for "Review and sign" on a
              // small phone.
              if (reportId != null) ...[
                FilledButton(
                  onPressed: () => _openReport(reportId),
                  child: Text(
                    tenancy.awaitingMySignature
                        ? 'Review and sign'
                        : tenancy.latestReportKind == 'CHECK_OUT'
                        ? 'Check-out report'
                        : 'Check-in report',
                  ),
                ),
                const SizedBox(height: 8),
              ],
              OutlinedButton(
                onPressed: () => _openTenancy(tenancy),
                child: const Text('Repairs'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openTenancy(
    TenancySummary tenancy, {
    InspectionSummary? currentInspection,
  }) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => TenancyScreen(
          tenancy: tenancy,
          currentInspection: currentInspection,
          api: _api,
        ),
      ),
    );
    if (mounted) await _refresh();
  }

  Widget _emptyProperties() => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const KiviloIllustration(
            scene: KiviloScene.handover,
            width: 180,
            height: 100,
          ),
          const SizedBox(height: 12),
          Text(
            'No properties yet',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'Create a check-in to add your first property.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    ),
  );
}

String _roleLabel(String role) => switch (role) {
  'LANDLORD' => 'Landlord',
  'TENANT' => 'Tenant',
  'AGENT' => 'Agent',
  _ => role,
};
