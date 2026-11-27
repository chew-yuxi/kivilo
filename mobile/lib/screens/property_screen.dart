import '../l10n/l10n.dart';
import 'package:flutter/material.dart';

import '../models/cdd.dart';
import '../models/property_work.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/page_context_title.dart';
import 'cdd_screen.dart';
import 'inspection_screen.dart';
import 'property_history_screen.dart';
import 'property_settings_screen.dart';
import 'property_timeline_screen.dart';
import 'tenancy_screen.dart';
import 'tenancy_access_screen.dart';
import 'tenancy_details_screen.dart';
import 'supporting_documents_screen.dart';
import 'property_card.dart';

/// Where a property is, as a coloured pill. Shared by the list and the property page.
/// A stage's text and fill colours, shared by the pill and the property card.
(Color, Color) propertyStageColors(String stage) => switch (stage) {
  'RUNNING' => (KiviloColors.green, KiviloColors.greenSoft),
  'CHECK_IN_AWAITING' ||
  'CHECK_OUT_AWAITING' => (KiviloColors.pinkDark, KiviloColors.pinkSoft),
  'ENDED' => (KiviloColors.muted, KiviloColors.canvas),
  _ => (KiviloColors.amber, KiviloColors.amberSoft),
};

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
    final (color, background) = propertyStageColors(stage);
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
          title: t.newProperty,
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
              title: t.couldNotOpenThisProperty,
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
                // The current tenancy, its people and what is next, before anything else.
                Text('Landlord: ${current.landlord}', style: text.bodyMedium),
                Text('Tenant: ${current.tenant}', style: text.bodyMedium),
                const SizedBox(height: 3),
                Text(
                  [
                    '${shortDate(current.startDate)} to ${shortDate(current.endDate)}',
                    ?current.agencyName,
                  ].join(' · '),
                  style: text.bodySmall,
                ),
                const SizedBox(height: 12),
                PropertyNextStep(
                  stage: property.state == 'TRASHED' ? 'ENDED' : property.stage,
                  label: switch (property.state) {
                    'TRASHED' => t.recentlyDeleted,
                    'ARCHIVED' => 'Archived · ${property.stageLabel}',
                    _ => property.nextStep ?? property.stageLabel,
                  },
                  attention: property.attention,
                ),
                if (_api.offlineCopy) ...[
                  const SizedBox(height: 12),
                  KiviloNotice(
                    tone: KiviloTone.warning,
                    child: Text(t.offlineShowingWhatWasLastLoaded),
                  ),
                ],
                for (final term in property.terms) ...[
                  if (_termCard(term, property) case final card?) ...[
                    const SizedBox(height: kiviloSectionGap),
                    KiviloSectionHeading(
                      title: term == current
                          ? t.reportsAndDocuments
                          : t.earlierTenancy,
                      subtitle: term == current
                          ? t.thisTenancysReportsDetailsAndPaperwork
                          : '${term.tenant} · ${shortDate(term.startDate)} to ${shortDate(term.endDate)}',
                    ),
                    const SizedBox(height: kiviloHeadingGap),
                    card,
                  ],
                ],
                if (current.tenancy case final tenancy?) ...[
                  const SizedBox(height: kiviloSectionGap),
                  TenancyScreen(tenancy: tenancy, api: _api, embedded: true),
                ],
                const SizedBox(height: kiviloSectionGap),
                KiviloSectionHeading(title: t.more),
                const SizedBox(height: kiviloHeadingGap),
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    children: [
                      if (property.canOpenTimeline) ...[
                        ListTile(
                          leading: const Icon(Icons.schedule_rounded),
                          title: Text(t.tenancyTimeline),
                          subtitle: Text(t.whatHappenedHereOverTheYearsReports),
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
                        title: Text(t.changeLog),
                        subtitle: Text(t.whoChangedWhatInKiviloAndWhen),
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
                                ? t.propertyTenancyAccess
                                : '${term.tenant} access',
                          ),
                          subtitle: Text(
                            accessTerms.length == 1
                                ? t.manageWhoCanWorkOnThisTenancy
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
                          'ARCHIVED' => t.restoreOrDeleteProperty,
                          'TRASHED' => t.propertyRestore,
                          _ => t.archiveOrDeleteProperty,
                        }),
                        subtitle: Text(switch (property.state) {
                          'ARCHIVED' => t.returnItToActiveWorkOrMove,
                          'TRASHED' => t.returnItToActiveProperties,
                          _ => t.removeItFromActiveWorkOrMove,
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

  Widget _partyCheckRow(
    PropertyTerm term,
    String role,
    String name,
    PartyCheck? check,
  ) {
    final who = role == 'LANDLORD' ? 'Landlord' : 'Tenant';
    final (icon, color, status) = switch (check) {
      null => (
        Icons.add,
        KiviloColors.pinkDark,
        'Not verified yet · CEA requires it before signing',
      ),
      PartyCheck(verified: true) => (
        Icons.check_circle,
        KiviloColors.green,
        'Verified ${check.completedAt == null ? '' : shortDate(check.completedAt!.toIso8601String())}'
            .trim(),
      ),
      PartyCheck(status: 'ESCALATED') => (
        Icons.error_outline,
        KiviloColors.red,
        'Stopped: confirmed match',
      ),
      PartyCheck(needsCorrection: true) => (
        Icons.warning_amber_outlined,
        KiviloColors.amber,
        'Details need correcting',
      ),
      PartyCheck(status: 'NEEDS_REVIEW') => (
        Icons.fact_check_outlined,
        KiviloColors.pinkDark,
        'Needs your review',
      ),
      PartyCheck(:final requestedAt) => (
        Icons.schedule_rounded,
        KiviloColors.muted,
        requestedAt == null
            ? 'Waiting for $name'
            : 'Waiting for $name · ${_waited(requestedAt)}',
      ),
    };
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Icon(icon, color: color),
      title: Text('$who identity · $name'),
      subtitle: Text(
        status,
        style: TextStyle(color: color == KiviloColors.muted ? null : color),
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => check == null
          ? _startCheck(term, role, name)
          : _open(CddCaseScreen(id: check.caseId, api: _api)),
    );
  }

  static String _waited(DateTime since) {
    final days = DateTime.now().difference(since).inDays;
    return days == 0
        ? 'form sent today'
        : 'form sent ${days == 1 ? 'a day' : '$days days'} ago';
  }

  Future<void> _startCheck(PropertyTerm term, String role, String name) async {
    final sure = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text('Verify $name?'),
        content: Text(t.kiviloEmailsThemAShortIdentityForm),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(t.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(t.verify),
          ),
        ],
      ),
    );
    if (sure != true || !mounted) return;
    try {
      final started = await _api.verifyTenancy(term.tenancyId, roles: [role]);
      if (!mounted) return;
      if (started.isEmpty) return await _refresh();
      await _open(CddCaseScreen(id: started.first.caseId, api: _api));
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    }
  }

  Widget? _termCard(PropertyTerm term, PropertyOverview property) {
    final reports = term.reports
        .where(
          (report) =>
              report.id != property.nextInspectionId ||
              property.state != 'TRASHED',
        )
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
          title: Text(
            report.status == 'COMPLETED'
                ? 'View ${report.kind == 'CHECK_OUT' ? t.checkOutLabel : t.checkInLabel} report'
                : report.status == 'AWAITING_SIGNATURE'
                ? 'View ${report.kind == 'CHECK_OUT' ? t.checkOutLabel : t.checkInLabel} signatures'
                : report.id == property.nextInspectionId
                ? 'Continue ${report.kind == 'CHECK_OUT' ? t.checkOutLabel : t.checkInLabel}'
                : report.kindLabel,
          ),
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
    // CEA due diligence on each party, where the deal is (operators' preview).
    if (term.verification case final verification?) {
      for (final (role, name, check) in [
        ('LANDLORD', term.landlord, verification.landlord),
        ('TENANT', term.tenant, verification.tenant),
      ]) {
        addRow(_partyCheckRow(term, role, name, check));
      }
    }
    if (term == property.terms.first) {
      addRow(
        ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 4,
          ),
          leading: Icon(
            term.canEditDetails
                ? Icons.edit_outlined
                : Icons.description_outlined,
          ),
          title: Text(t.tenancyDetails),
          subtitle: Text(
            [
              if (term.canEditDetails && term.landlordEmail == null)
                t.landlordEmailNotProvided,
              if (term.canEditDetails && term.tenantEmail == null)
                t.tenantEmailNotProvided,
              if (!term.canEditDetails ||
                  (term.landlordEmail != null && term.tenantEmail != null))
                t.peopleDatesRentAndDeposit,
            ].join(' · '),
          ),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _open(
            TenancyDetailsScreen(property: property, term: term, api: _api),
          ),
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
          title: Text(t.documents),
          subtitle: Text(t.tenancyAgreementAndSupportingFiles),
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
