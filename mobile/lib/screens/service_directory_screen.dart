import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../l10n/l10n.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';

// Placeholder partners until real ones are signed. They carry no phone number on
// purpose: a made-up number could ring a stranger.
List<({String name, IconData icon, String services, String hours})> get _partners => [
  (
    name: 'Pipewell Plumbing',
    icon: Icons.plumbing,
    services: t.partnerPipewell,
    hours: t.open24Hours,
  ),
  (
    name: 'Fernvale Pipeworks',
    icon: Icons.plumbing,
    services: t.partnerFernvale,
    hours: t.daily8to10,
  ),
  (
    name: 'Halcyon Locksmiths',
    icon: Icons.key_outlined,
    services: t.partnerHalcyon,
    hours: t.open24Hours,
  ),
  (
    name: 'Keyline Lock & Key',
    icon: Icons.key_outlined,
    services: t.partnerKeyline,
    hours: t.monSat9to7,
  ),
];

class ServiceDirectoryScreen extends StatelessWidget {
  const ServiceDirectoryScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(t.homeUrgentServices)),
    body: KiviloContent(maxWidth: 840, child: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: Theme.of(context).colorScheme.errorContainer,
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.local_police_outlined),
                title: Text(t.policeEmergency),
                subtitle: const Text('999'),
                trailing: const Icon(Icons.call_outlined),
                onTap: () => launchUrl(Uri.parse('tel:999')),
              ),
              ListTile(
                leading: const Icon(Icons.fire_truck_outlined),
                title: Text(t.fireAmbulance),
                subtitle: const Text('995'),
                trailing: const Icon(Icons.call_outlined),
                onTap: () => launchUrl(Uri.parse('tel:995')),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        KiviloSectionHeading(
          title: t.kiviloPartners,
          subtitle: t.kiviloPartnersDetail,
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
                SnackBar(
                  content: Text(t.bookingSoon),
                ),
              ),
            ),
          ),
        ],
      ],
    )),
  );
}
