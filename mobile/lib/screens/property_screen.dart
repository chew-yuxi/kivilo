import 'package:flutter/material.dart';

import '../models/property_work.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/page_context_title.dart';
import 'inspection_screen.dart';
import 'property_history_screen.dart';
import 'property_settings_screen.dart';
import 'property_timeline_screen.dart';
import 'tenancy_screen.dart';
import 'tenancy_access_screen.dart';
import 'tenancy_details_screen.dart';
import 'supporting_documents_screen.dart';

/// Where a property is, as a coloured pill. Shared by the list and the property page.
class PropertyStagePill extends StatelessWidget {
  const PropertyStagePill({
    super.key,
    required this.stage,
    required this.label,
  });
  final String stage;
  final String label;

  @override
  Widget build(BuildContext context) {
    final (color, background) = switch (stage) {
      'RUNNING' => (KiviloColors.green, KiviloColors.greenSoft),
      'CHECK_IN_AWAITING' ||
      'CHECK_OUT_AWAITING' => (KiviloColors.pinkDark, KiviloColors.pinkSoft),
      'ENDED' => (KiviloColors.muted, KiviloColors.canvas),
      _ => (KiviloColors.amber, KiviloColors.amberSoft),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

/// Everything at one address: every term's reports, newest first, and the way to its
/// repairs, timeline, history and settings. The server decides what this viewer may see.
class PropertyScreen extends StatefulWidget {
  const PropertyScreen({super.key, required this.propertyId, this.api});
  final String propertyId;
  final Api? api;

  @override
  State<PropertyScreen> createState() => _PropertyScreenState();
}

class _PropertyScreenState extends State<PropertyScreen> {
  late final _api = widget.api ?? Api();
  late Loading<PropertyOverview> _loading = _api.load(
    () => _api.propertyOverview(widget.propertyId),
    retainKey: 'property:${widget.propertyId}',
  );

  Future<void> _refresh() async {
    final next = _api.load(
      () => _api.propertyOverview(widget.propertyId),
      savedFirst: false,
      retainKey: 'property:${widget.propertyId}',
    );
    setState(() {
      _loading = next;
    });
    await next.fresh;
  }

  Future<void> _open(Widget screen) async {
    await Navigator.of(
      context,
    ).push<void>(MaterialPageRoute(builder: (_) => screen));
    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      centerTitle: false,
      toolbarHeight: 72,
      title: StreamBuilder<PropertyOverview>(
        stream: _loading.stream,
        builder: (context, snapshot) => PageContextTitle(
          title: 'Property',
          contextLabel: snapshot.data?.address ?? 'Property',
        ),
      ),
    ),
    body: KiviloContent(
      maxWidth: 840,
      child: StreamBuilder<PropertyOverview>(
        stream: _loading.stream,
        builder: (context, snapshot) {
          if (!snapshot.hasData && !snapshot.hasError) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return KiviloMessage(
              icon: Icons.cloud_off_outlined,
              title: 'Could not open this property',
              body: plainError(snapshot.error!),
              actionLabel: 'Try again',
              onAction: _refresh,
            );
          }
          final property = snapshot.data!;
          final text = Theme.of(context).textTheme;
          final current = property.terms.first;
          final accessTerms = property.terms
              .where((term) => term.tenancy?.role == 'AGENT')
              .toList();
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: kiviloScreenPadding,
              children: [
                Text(property.address, style: text.headlineMedium),
                const SizedBox(height: 8),
                Text(
                  '${current.tenant} · ${shortDate(current.startDate)} to ${shortDate(current.endDate)}',
                ),
                if (current.agencyName != null) ...[
                  const SizedBox(height: 3),
                  Text(current.agencyName!, style: text.bodySmall),
                ],
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: PropertyStagePill(
                    stage: property.stage,
                    label: property.stageLabel,
                  ),
                ),
                if (_api.offlineCopy) ...[
                  const SizedBox(height: 12),
                  const KiviloNotice(
                    tone: KiviloTone.warning,
                    child: Text('Offline. Showing what was last loaded.'),
                  ),
                ],
                if (property.nextInspectionId != null &&
                    property.state != 'TRASHED') ...[
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: () => _open(
                      InspectionScreen(
                        id: property.nextInspectionId!,
                        api: _api,
                      ),
                    ),
                    icon: const Icon(Icons.chevron_right, size: 20),
                    iconAlignment: IconAlignment.end,
                    label: Text(
                      'Continue ${property.nextInspectionKind == 'CHECK_OUT' ? 'check-out' : 'check-in'}',
                    ),
                  ),
                ],
                const SizedBox(height: kiviloSectionGap),
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: ListTile(
                    leading: const Icon(Icons.edit_outlined),
                    title: const Text('Tenancy details'),
                    subtitle: Text(
                      current.canEditDetails
                          ? [
                              if (current.landlordEmail == null)
                                'Add landlord email',
                              if (current.tenantEmail == null)
                                'Add tenant email',
                              if (current.landlordEmail != null &&
                                  current.tenantEmail != null)
                                'Emails, dates, rent and deposit',
                            ].join(' · ')
                          : current.detailsLockedReason ??
                                'Details cannot be edited',
                    ),
                    trailing: current.canEditDetails
                        ? const Icon(Icons.chevron_right)
                        : const Icon(Icons.lock_outline),
                    onTap: current.canEditDetails
                        ? () => _open(
                            TenancyDetailsScreen(
                              property: property.address,
                              term: current,
                              api: _api,
                            ),
                          )
                        : () => showDialog<void>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Tenancy details are locked'),
                              content: Text(
                                current.detailsLockedReason ??
                                    'These details cannot be edited.',
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context),
                                  child: const Text('Close'),
                                ),
                              ],
                            ),
                          ),
                  ),
                ),
                for (final term in property.terms) ...[
                  if (_termCard(term, property) case final card?) ...[
                    const SizedBox(height: kiviloSectionGap),
                    if (property.terms.length > 1) ...[
                      KiviloSectionHeading(
                        title: term == current
                            ? 'Current tenancy'
                            : 'Earlier tenancy',
                        subtitle:
                            '${term.tenant} · ${shortDate(term.startDate)} to ${shortDate(term.endDate)}',
                      ),
                      const SizedBox(height: kiviloHeadingGap),
                    ],
                    card,
                  ],
                ],
                if (current.tenancy case final tenancy?) ...[
                  const SizedBox(height: kiviloSectionGap),
                  TenancyScreen(tenancy: tenancy, api: _api, embedded: true),
                ],
                const SizedBox(height: kiviloSectionGap),
                const KiviloSectionHeading(title: 'More'),
                const SizedBox(height: kiviloHeadingGap),
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    children: [
                      if (property.canOpenTimeline) ...[
                        ListTile(
                          leading: const Icon(Icons.schedule_rounded),
                          title: const Text('Timeline'),
                          subtitle: const Text(
                            'Reports, updates, repairs and assets',
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => _open(
                            PropertyTimelineScreen(
                              propertyId: property.id,
                              api: _api,
                            ),
                          ),
                        ),
                        const Divider(height: 1),
                      ],
                      ListTile(
                        leading: const Icon(Icons.history),
                        title: const Text('History'),
                        subtitle: const Text('Changes made to this property'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => _open(
                          PropertyHistoryScreen(
                            propertyId: property.id,
                            api: _api,
                          ),
                        ),
                      ),
                      const Divider(height: 1),
                      for (final term in accessTerms) ...[
                        ListTile(
                          leading: const Icon(Icons.person_outline),
                          title: Text(
                            accessTerms.length == 1
                                ? 'Tenancy access'
                                : '${term.tenant} access',
                          ),
                          subtitle: Text(
                            accessTerms.length == 1
                                ? 'Manage who can work on this tenancy'
                                : '${shortDate(term.startDate)} to ${shortDate(term.endDate)}',
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => _open(
                            TenancyAccessScreen(
                              tenancyId: term.tenancyId,
                              property: property.address,
                              api: _api,
                            ),
                          ),
                        ),
                        const Divider(height: 1),
                      ],
                      ListTile(
                        leading: const Icon(Icons.edit_outlined),
                        title: Text(switch (property.state) {
                          'ARCHIVED' => 'Restore or delete property',
                          'TRASHED' => 'Restore property',
                          _ => 'Archive or delete property',
                        }),
                        subtitle: Text(switch (property.state) {
                          'ARCHIVED' =>
                            'Return it to active work or move it to trash',
                          'TRASHED' => 'Return it to active properties',
                          _ => 'Remove it from active work or move it to trash',
                        }),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => _open(
                          PropertySettingsScreen(
                            propertyId: property.id,
                            api: _api,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    ),
  );

  Widget? _termCard(PropertyTerm term, PropertyOverview property) {
    final reports = term.reports
        .where((report) => report.id != property.nextInspectionId)
        .toList();
    final rows = <Widget>[];

    void addRow(Widget row) {
      if (rows.isNotEmpty) rows.add(const Divider(height: 1));
      rows.add(row);
    }

    for (final report in reports) {
      addRow(
        ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 4,
          ),
          leading: Icon(
            report.status == 'COMPLETED'
                ? Icons.fact_check
                : report.kind == 'CHECK_IN'
                ? Icons.login_outlined
                : Icons.logout_outlined,
            color: report.status == 'COMPLETED'
                ? KiviloColors.green
                : KiviloColors.body,
          ),
          title: Text(report.kindLabel),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Align(
              alignment: Alignment.centerLeft,
              child: KiviloStatusPill(status: report.status),
            ),
          ),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _open(InspectionScreen(id: report.id, api: _api)),
        ),
      );
    }
    if (term.canOpenDocuments) {
      addRow(
        ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 4,
          ),
          leading: const Icon(Icons.description_outlined),
          title: const Text('Documents'),
          subtitle: const Text('Tenancy agreement and supporting files'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _open(
            SupportingDocumentsScreen(tenancyId: term.tenancyId, api: _api),
          ),
        ),
      );
    }
    if (rows.isEmpty) return null;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(children: rows),
    );
  }
}
