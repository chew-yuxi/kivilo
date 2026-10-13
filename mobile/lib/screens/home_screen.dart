import 'package:flutter/material.dart';

import '../models/inspection.dart';
import '../models/maintenance.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';
import 'inspection_screen.dart';
import 'inspections_screen.dart';
import 'new_inspection_screen.dart';
import 'notifications_screen.dart';
import 'report_screen.dart';
import 'service_directory_screen.dart';
import 'settings_screen.dart';
import 'tenancy_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = Api();
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
    setState(() => _future = next);
    await next;
  }

  Future<void> _create() async {
    final id = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const NewInspectionScreen()),
    );
    if (!mounted || id == null) return;
    await Navigator.of(
      context,
    ).push<void>(MaterialPageRoute(builder: (_) => InspectionScreen(id: id)));
    if (mounted) await _refresh();
  }

  Future<void> _openReport(String id) async {
    await Navigator.of(
      context,
    ).push<void>(MaterialPageRoute(builder: (_) => ReportScreen(id: id)));
    if (mounted) await _refresh();
  }

  Future<void> _openInspection(String id) async {
    await Navigator.of(
      context,
    ).push<void>(MaterialPageRoute(builder: (_) => InspectionScreen(id: id)));
    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: _tab == 0
        ? AppBar(
            centerTitle: false,
            titleSpacing: 16,
            title: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [KiviloMark(), SizedBox(width: 10), Text('Kivilo')],
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
    body: switch (_tabs[_tab]) {
      'inspections' => const InspectionsScreen(),
      'account' => SettingsScreen(onStartCheckIn: _partyOnly ? _create : null),
      _ => _overview(),
    },
    bottomNavigationBar: BottomNavigationBar(
      currentIndex: _tab,
      onTap: (index) {
        if (index == _tab) return;
        setState(() => _tab = index);
        if (index == 0) _refresh();
      },
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

  Widget _overview() => RefreshIndicator(
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
                    '${snapshot.error}',
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
            final active = inspections.where(
              (item) => item.status != 'COMPLETED',
            );
            final current = active.isEmpty ? null : active.first;
            final firstName = profile.name.trim().split(RegExp(r'\s+')).first;
            final hour = DateTime.now().hour;
            final greeting = hour < 12
                ? 'Good morning'
                : hour < 18
                ? 'Good afternoon'
                : 'Good evening';

            if (_partyOnly) {
              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
                children: [
                  Text(
                    '$greeting, $firstName',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Your reports, repairs and history, in one place.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),
                  for (final tenancy in tenancies) ...[
                    _partyCard(tenancy),
                    const SizedBox(height: 12),
                  ],
                ],
              );
            }

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
              children: [
                Text(
                  '$greeting, $firstName',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'Your handovers, all in one place.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                _workCard(current),
                const SizedBox(height: 12),
                _quickAction(
                  icon: Icons.add_home_work_outlined,
                  title: 'New check-in',
                  subtitle: 'Start a room-by-room property report',
                  onTap: _create,
                ),
                const SizedBox(height: 28),
                KiviloSectionHeading(
                  title: 'Your properties',
                  subtitle: tenancies.isEmpty
                      ? null
                      : '${tenancies.length} active ${tenancies.length == 1 ? 'tenancy' : 'tenancies'}',
                ),
                const SizedBox(height: 12),
                if (tenancies.isEmpty)
                  _emptyProperties()
                else
                  for (final tenancy in tenancies) ...[
                    _propertyCard(
                      tenancy,
                      inspections
                          .where(
                            (inspection) => inspection.tenancyId == tenancy.id,
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 10),
                  ],
              ],
            );
          },
        ),
  );

  Widget _workCard(InspectionSummary? current) => Card(
    color: KiviloColors.canvas,
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            current == null
                ? 'READY FOR YOUR NEXT HANDOVER'
                : 'PICK UP WHERE YOU LEFT OFF',
            style: const TextStyle(
              color: KiviloColors.muted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            current?.property ?? 'A clearer record starts here.',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            current == null
                ? 'Capture each room, write its inventory, then sign with both parties.'
                : '${current.kindLabel} · ${current.tenant} · ${current.rooms} ${current.rooms == 1 ? 'room' : 'rooms'}',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: current == null
                ? _create
                : () => _openInspection(current.id),
            child: Text(
              current == null ? 'Start check-in' : 'Continue inspection',
            ),
          ),
        ],
      ),
    ),
  );

  Widget _quickAction({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) => Card(
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: KiviloColors.pinkSoft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: KiviloColors.pinkDark),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 3),
                  Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: KiviloColors.subtle),
          ],
        ),
      ),
    ),
  );

  Widget _propertyCard(
    TenancySummary tenancy,
    List<InspectionSummary> inspections,
  ) {
    final active = inspections
        .where((inspection) => inspection.status != 'COMPLETED')
        .firstOrNull;
    final target = active ?? inspections.firstOrNull;
    final actionLabel = active == null ? 'View latest report' : 'Resume';
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: target == null
            ? () => _openTenancy(tenancy)
            : () => _openInspection(target.id),
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
                      color: active == null
                          ? KiviloColors.canvas
                          : KiviloColors.pinkSoft,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      active == null
                          ? Icons.home_outlined
                          : Icons.fact_check_outlined,
                      color: active == null
                          ? KiviloColors.body
                          : KiviloColors.pinkDark,
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
                          active == null
                              ? '${_roleLabel(tenancy.role)} · ${tenancy.inspections} ${tenancy.inspections == 1 ? 'inspection' : 'inspections'}'
                              : '${active.kindLabel} in progress · ${active.rooms} ${active.rooms == 1 ? 'room' : 'rooms'}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: KiviloColors.subtle),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  if (target != null)
                    Expanded(
                      child: FilledButton(
                        onPressed: () => _openInspection(target.id),
                        child: Text(actionLabel),
                      ),
                    )
                  else if (tenancy.latestReportId != null)
                    Expanded(
                      child: FilledButton(
                        onPressed: () => _openReport(tenancy.latestReportId!),
                        child: const Text('View report'),
                      ),
                    ),
                  if (target != null || tenancy.latestReportId != null)
                    const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _openTenancy(tenancy),
                      child: const Text('Maintenance'),
                    ),
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
              Row(
                children: [
                  if (reportId != null) ...[
                    Expanded(
                      child: FilledButton(
                        onPressed: () => _openReport(reportId),
                        child: Text(
                          tenancy.latestReportKind == 'CHECK_OUT'
                              ? 'Check-out report'
                              : 'Check-in report',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _openTenancy(tenancy),
                      child: const Text('Repairs'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openTenancy(TenancySummary tenancy) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => TenancyScreen(tenancy: tenancy)),
    );
    if (mounted) await _refresh();
  }

  Widget _emptyProperties() => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Icon(Icons.home_outlined, color: KiviloColors.subtle, size: 32),
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
