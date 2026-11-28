import '../l10n/l10n.dart';
import 'package:flutter/material.dart';

import '../models/property_work.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';

/// Chooses a property for a new tenancy: those whose tenancies this account manages.
/// Pops the chosen [StartableProperty]. The server rechecks the same rule on create.
class PropertyPickerScreen extends StatefulWidget {
  const PropertyPickerScreen({super.key, required this.api});
  final Api api;

  @override
  State<PropertyPickerScreen> createState() => _PropertyPickerScreenState();
}

class _PropertyPickerScreenState extends State<PropertyPickerScreen> {
  late Loading<List<StartableProperty>> _loading = widget.api.load(
    widget.api.startableProperties,
  );
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _retry() => setState(
    () => _loading = widget.api.load(
      widget.api.startableProperties,
      savedFirst: false,
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(t.chooseAProperty)),
    body: KiviloContent(
      maxWidth: 720,
      child: StreamBuilder<List<StartableProperty>>(
        stream: _loading.stream,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return KiviloMessage(
              icon: Icons.cloud_off_outlined,
              title: t.couldNotLoadYourProperties,
              body: plainError(snapshot.error!),
              actionLabel: 'Try again',
              onAction: _retry,
            );
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final all = snapshot.data!;
          if (all.isEmpty) {
            return KiviloMessage(
              icon: Icons.apartment_rounded,
              title: t.homeNoProperties,
              body:
                  'Properties you manage appear here once they have a tenancy.',
            );
          }
          final query = _search.text.trim().toLowerCase();
          final shown = all
              .where(
                (property) =>
                    query.isEmpty ||
                    property.address.toLowerCase().contains(query) ||
                    property.lastTenant.toLowerCase().contains(query),
              )
              .toList();
          final text = Theme.of(context).textTheme;
          return ListView(
            padding: kiviloScreenPadding,
            children: [
              TextField(
                controller: _search,
                decoration: InputDecoration(
                  labelText: t.search,
                  hintText: t.addressPostalCodeOrLastTenant,
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              if (shown.isEmpty)
                Text(t.noPropertyMatches, style: text.bodyMedium)
              else
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    children: [
                      for (final (index, property) in shown.indexed) ...[
                        if (index > 0) const Divider(height: 1),
                        ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 6,
                          ),
                          title: Text(property.address),
                          subtitle: Text(
                            [
                              t.previousTenantName(property.lastTenant),
                              'until ${calendarDate(property.lastEndDate)}',
                              property.agencyName ?? 'Personal',
                            ].join(' · '),
                          ),
                          trailing: const Icon(
                            Icons.chevron_right,
                            color: KiviloColors.subtle,
                          ),
                          onTap: () => Navigator.pop(context, property),
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
