import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/maintenance.dart';
import '../services/api.dart';

class ServiceDirectoryScreen extends StatefulWidget {
  const ServiceDirectoryScreen({super.key});

  @override
  State<ServiceDirectoryScreen> createState() => _ServiceDirectoryScreenState();
}

class _ServiceDirectoryScreenState extends State<ServiceDirectoryScreen> {
  final _api = Api();
  String? _category;
  late Future<List<ServiceProviderModel>> _future = _api.serviceProviders();

  void _filter(String? category) {
    setState(() {
      _category = category;
      _future = _api.serviceProviders(category: category);
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Urgent services')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: Theme.of(context).colorScheme.errorContainer,
          child: Column(children: [
            ListTile(
              leading: const Icon(Icons.local_police_outlined),
              title: const Text('Police emergency'),
              subtitle: const Text('999'),
              onTap: () => launchUrl(Uri.parse('tel:999')),
            ),
            ListTile(
              leading: const Icon(Icons.fire_truck_outlined),
              title: const Text('Fire or ambulance'),
              subtitle: const Text('995'),
              onTap: () => launchUrl(Uri.parse('tel:995')),
            ),
          ]),
        ),
        const Text(
          'Kivilo lists contacts only and does not guarantee availability, pricing, or workmanship.',
        ),
        const SizedBox(height: 12),
        SegmentedButton<String>(
          emptySelectionAllowed: true,
          segments: const [
            ButtonSegment(value: 'PLUMBING', label: Text('Plumbing')),
            ButtonSegment(value: 'LOCKSMITH', label: Text('Locksmith')),
          ],
          selected: _category == null ? <String>{} : {_category!},
          onSelectionChanged: (value) => _filter(value.isEmpty ? null : value.first),
        ),
        const SizedBox(height: 16),
        FutureBuilder<List<ServiceProviderModel>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) return Text('${snapshot.error}');
            final providers = snapshot.data!;
            if (providers.isEmpty) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Text('No currently verified providers match this category.'),
              );
            }
            return Column(children: [
              for (final provider in providers)
                Card(
                  child: ListTile(
                    title: Text(provider.name),
                    subtitle: Text([
                      provider.category.toLowerCase(),
                      if (provider.hours != null) provider.hours!,
                      'checked ${provider.lastVerifiedAt.substring(0, 10)}',
                    ].join(' · ')),
                    trailing: const Icon(Icons.call_outlined),
                    onTap: () => launchUrl(Uri.parse('tel:${provider.phone}')),
                  ),
                ),
            ]);
          },
        ),
      ],
    ),
  );
}
