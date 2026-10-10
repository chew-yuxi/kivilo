import 'package:flutter/material.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import 'inspections_screen.dart';
import 'notifications_screen.dart';
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
  late Future<(UserProfile, List<TenancySummary>)> _future = _load();

  Future<(UserProfile, List<TenancySummary>)> _load() async =>
      (await _api.me(), await _api.tenancies());

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Kivilo'),
      actions: [
        IconButton(
          tooltip: 'Notifications',
          icon: const Icon(Icons.notifications_none),
          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(
            builder: (_) => const NotificationsScreen(),
          )),
        ),
        IconButton(
          tooltip: 'Urgent services',
          icon: const Icon(Icons.home_repair_service_outlined),
          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(
            builder: (_) => const ServiceDirectoryScreen(),
          )),
        ),
        IconButton(
          tooltip: 'Settings',
          icon: const Icon(Icons.settings_outlined),
          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(
            builder: (_) => const SettingsScreen(),
          )),
        ),
      ],
    ),
    body: RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<(UserProfile, List<TenancySummary>)>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ListView(children: [
              const SizedBox(height: 100),
              ListTile(
                title: const Text('Could not load Kivilo'),
                subtitle: Text('${snapshot.error}'),
              ),
            ]);
          }
          final (profile, tenancies) = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Hello, ${profile.name}',
                  style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text(profile.roles.isEmpty
                  ? 'No tenancy is linked to this account yet.'
                  : profile.roles.map(_roleLabel).join(' · ')),
              const SizedBox(height: 24),
              Text('Your tenancies',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              for (final tenancy in tenancies)
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.home_outlined),
                    title: Text(tenancy.property),
                    subtitle: Text(
                      '${_roleLabel(tenancy.role)} · ${tenancy.maintenanceCases} maintenance case${tenancy.maintenanceCases == 1 ? '' : 's'}',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      await Navigator.of(context).push(MaterialPageRoute<void>(
                        builder: (_) => TenancyScreen(tenancy: tenancy),
                      ));
                      if (mounted) await _refresh();
                    },
                  ),
                ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                icon: const Icon(Icons.fact_check_outlined),
                label: const Text('Inspections'),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const InspectionsScreen()),
                ),
              ),
            ],
          );
        },
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
