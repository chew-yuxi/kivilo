import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../ui/kivilo_components.dart';

// Placeholder partners until real ones are signed. They carry no phone number on
// purpose: a made-up number could ring a stranger.
const _partners = [
  (
    name: 'Pipewell Plumbing',
    icon: Icons.plumbing,
    services: 'Leaks, blocked drains, water heaters',
    hours: 'Open 24 hours',
  ),
  (
    name: 'Fernvale Pipeworks',
    icon: Icons.plumbing,
    services: 'Burst pipes, toilets, taps and mixers',
    hours: 'Daily 8am to 10pm',
  ),
  (
    name: 'Halcyon Locksmiths',
    icon: Icons.key_outlined,
    services: 'Lockouts, lock changes, digital locks',
    hours: 'Open 24 hours',
  ),
  (
    name: 'Keyline Lock & Key',
    icon: Icons.key_outlined,
    services: 'Gate locks, key cutting, safes',
    hours: 'Mon to Sat 9am to 7pm',
  ),
];

class ServiceDirectoryScreen extends StatelessWidget {
  const ServiceDirectoryScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Urgent services')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: Theme.of(context).colorScheme.errorContainer,
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.local_police_outlined),
                title: const Text('Police emergency'),
                subtitle: const Text('999'),
                trailing: const Icon(Icons.call_outlined),
                onTap: () => launchUrl(Uri.parse('tel:999')),
              ),
              ListTile(
                leading: const Icon(Icons.fire_truck_outlined),
                title: const Text('Fire or ambulance'),
                subtitle: const Text('995'),
                trailing: const Icon(Icons.call_outlined),
                onTap: () => launchUrl(Uri.parse('tel:995')),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const KiviloSectionHeading(
          title: 'Kivilo partners',
          subtitle: 'Plumbers and locksmiths we work with',
        ),
        const SizedBox(height: 12),
        for (var index = 0; index < _partners.length; index++) ...[
          if (index > 0) const SizedBox(height: 10),
          Card(
            clipBehavior: Clip.antiAlias,
            child: ListTile(
              leading: Icon(_partners[index].icon),
              title: Text(_partners[index].name),
              subtitle: Text(
                '${_partners[index].services}\n${_partners[index].hours}',
              ),
              isThreeLine: true,
              trailing: const Icon(Icons.chevron_right),
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Booking through Kivilo opens soon.'),
                ),
              ),
            ),
          ),
        ],
      ],
    ),
  );
}
