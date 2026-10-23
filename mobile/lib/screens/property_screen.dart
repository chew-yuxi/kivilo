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
import 'supporting_documents_screen.dart';

/// Where a property is, as a coloured pill. Shared by the list and the property page.
class PropertyStagePill extends StatelessWidget {
  const PropertyStagePill({super.key, required this.stage, required this.label});
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
  late Future<PropertyOverview> _future = _api.propertyOverview(
    widget.propertyId,
  );

  Future<void> _refresh() async {
    final next = _api.propertyOverview(widget.propertyId);
    setState(() {
      _future = next;
    });
    await next;
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
      title: FutureBuilder<PropertyOverview>(
        future: _future,
        builder: (context, snapshot) => PageContextTitle(
          title: 'Property',
          contextLabel: snapshot.data?.address ?? 'Property',
        ),
      ),
    ),
    body: KiviloContent(
      maxWidth: 840,
      child: FutureBuilder<PropertyOverview>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
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
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: kiviloScreenPadding,
              children: [
                Text(property.address, style: text.headlineMedium),
                const SizedBox(height: 8),
                Text('${current.tenant} · ${current.agencyName ?? 'Personal'}'),
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
                      'Open ${property.nextInspectionKind == 'CHECK_OUT' ? 'check-out' : 'check-in'}',
                    ),
                  ),
                ],
                for (final term in property.terms) ...[
                  const SizedBox(height: kiviloSectionGap),
                  KiviloSectionHeading(
                    title: term == current ? 'Current tenancy' : 'Earlier tenancy',
                    subtitle:
                        '${term.tenant} · ${shortDate(term.startDate)} to ${shortDate(term.endDate)}',
                  ),
                  const SizedBox(height: kiviloHeadingGap),
                  Card(
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      children: [
                        for (var i = 0; i < term.reports.length; i++) ...[
                          if (i > 0) const Divider(height: 1),
                          ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 4,
                            ),
                            leading: Icon(
                              term.reports[i].status == 'COMPLETED'
                                  ? Icons.fact_check
                                  : term.reports[i].kind == 'CHECK_IN'
                                  ? Icons.login_outlined
                                  : Icons.logout_outlined,
                              color: term.reports[i].status == 'COMPLETED'
                                  ? KiviloColors.green
                                  : KiviloColors.body,
                            ),
                            title: Text(term.reports[i].kindLabel),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: KiviloStatusPill(
                                  status: term.reports[i].status,
                                ),
                              ),
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => _open(
                              InspectionScreen(
                                id: term.reports[i].id,
                                api: _api,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (term.tenancy case final tenancy?) ...[
                    const SizedBox(height: kiviloButtonGap),
                    OutlinedButton.icon(
                      onPressed: () =>
                          _open(TenancyScreen(tenancy: tenancy, api: _api)),
                      icon: const Icon(Icons.build_outlined),
                      label: const Text('Repairs and assets'),
                    ),
                  ],
                  if (term.canOpenDocuments) ...[
                    const SizedBox(height: kiviloButtonGap),
                    OutlinedButton.icon(
                      onPressed: () => _open(SupportingDocumentsScreen(
                        tenancyId: term.tenancyId,
                        api: _api,
                      )),
                      icon: const Icon(Icons.description_outlined),
                      label: const Text('Documents'),
                    ),
                  ],
                ],
                const SizedBox(height: kiviloSectionGap),
                const KiviloSectionHeading(title: 'More'),
                const SizedBox(height: kiviloHeadingGap),
                if (property.canOpenTimeline) ...[
                  OutlinedButton.icon(
                    onPressed: () => _open(
                      PropertyTimelineScreen(
                        propertyId: property.id,
                        api: _api,
                      ),
                    ),
                    icon: const Icon(Icons.schedule_rounded),
                    label: const Text('Timeline'),
                  ),
                  const SizedBox(height: kiviloButtonGap),
                ],
                OutlinedButton.icon(
                  onPressed: () => _open(
                    PropertyHistoryScreen(propertyId: property.id, api: _api),
                  ),
                  icon: const Icon(Icons.history),
                  label: const Text('History'),
                ),
                const SizedBox(height: kiviloButtonGap),
                OutlinedButton.icon(
                  onPressed: () => _open(
                    PropertySettingsScreen(propertyId: property.id, api: _api),
                  ),
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Settings and danger zone'),
                ),
              ],
            ),
          );
        },
      ),
    ),
  );
}
