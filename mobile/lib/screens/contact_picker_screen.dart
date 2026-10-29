import 'package:flutter/material.dart';

import '../models/property_work.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';

/// Chooses a landlord or tenant this account already works with, to fill New
/// check-in's fields. Pops the chosen [Contact]; the fields stay editable.
class ContactPickerScreen extends StatefulWidget {
  const ContactPickerScreen({super.key, required this.api, required this.role});
  final Api api;

  /// LANDLORD or TENANT: people seen in that role are listed first.
  final String role;

  @override
  State<ContactPickerScreen> createState() => _ContactPickerScreenState();
}

class _ContactPickerScreenState extends State<ContactPickerScreen> {
  late Loading<List<Contact>> _loading = widget.api.load(widget.api.contacts);
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  static const _roleNames = {'LANDLORD': 'Landlord', 'TENANT': 'Tenant'};

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.role == 'LANDLORD' ? 'Choose the landlord' : 'Choose the tenant',
      ),
    ),
    body: KiviloContent(
      maxWidth: 720,
      child: StreamBuilder<List<Contact>>(
        stream: _loading.stream,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return KiviloMessage(
              icon: Icons.cloud_off_outlined,
              title: 'Could not load your contacts',
              body: plainError(snapshot.error!),
              actionLabel: 'Try again',
              onAction: () => setState(
                () => _loading = widget.api.load(
                  widget.api.contacts,
                  savedFirst: false,
                ),
              ),
            );
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.data!.isEmpty) {
            return const KiviloMessage(
              icon: Icons.person_outline,
              title: 'No contacts yet',
              body: 'Landlords and tenants on your tenancies appear here.',
            );
          }
          final query = _search.text.trim().toLowerCase();
          final shown =
              [
                    ...snapshot.data!.where(
                      (c) => c.roles.contains(widget.role),
                    ),
                    ...snapshot.data!.where(
                      (c) => !c.roles.contains(widget.role),
                    ),
                  ]
                  .where(
                    (contact) =>
                        query.isEmpty ||
                        contact.name.toLowerCase().contains(query) ||
                        (contact.email?.toLowerCase().contains(query) ?? false),
                  )
                  .toList();
          return ListView(
            padding: kiviloScreenPadding,
            children: [
              TextField(
                controller: _search,
                decoration: const InputDecoration(
                  labelText: 'Search',
                  hintText: 'Name or email',
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              if (shown.isEmpty)
                Text(
                  'No contact matches.',
                  style: Theme.of(context).textTheme.bodyMedium,
                )
              else
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    children: [
                      for (final (index, contact) in shown.indexed) ...[
                        if (index > 0) const Divider(height: 1),
                        ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 6,
                          ),
                          title: Text(contact.name),
                          subtitle: Text(
                            [
                              contact.email ?? 'No email',
                              contact.roles
                                  .map((role) => _roleNames[role] ?? role)
                                  .join(' and '),
                            ].join(' · '),
                          ),
                          trailing: const Icon(
                            Icons.chevron_right,
                            color: KiviloColors.subtle,
                          ),
                          onTap: () => Navigator.pop(context, contact),
                        ),
                      ],
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    ),
  );
}
