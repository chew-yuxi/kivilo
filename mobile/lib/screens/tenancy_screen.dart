import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../models/inspection.dart';
import '../models/maintenance.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/kivilo_format.dart';
import '../ui/page_context_title.dart';
import '../ui/agreement_terms_view.dart';
import 'inspection_screen.dart';
import 'report_screen.dart';
import 'maintenance_case_screen.dart';
import 'new_maintenance_case_screen.dart';
import 'property_timeline_screen.dart';
import 'property_settings_screen.dart';
import 'service_directory_screen.dart';
import 'tenancy_access_screen.dart';
import 'supporting_documents_screen.dart';
import 'agreement_terms_screen.dart';

class TenancyScreen extends StatefulWidget {
  const TenancyScreen({
    super.key,
    required this.tenancy,
    this.currentInspection,
    this.api,
    this.embedded = false,
  });
  final TenancySummary tenancy;
  final InspectionSummary? currentInspection;
  final Api? api;
  final bool embedded;

  @override
  State<TenancyScreen> createState() => _TenancyScreenState();
}

class _TenancyScreenState extends State<TenancyScreen> {
  late final _api = widget.api ?? Api();
  bool _openingRepairTerms = false;
  late Loading<_TenancyData> _loading = _api.load(
    _load,
    retainKey: 'tenancy:${widget.tenancy.id}',
  );

  Future<_TenancyData> _load() async => (
    await _api.maintenanceCases(widget.tenancy.id),
    await _api.propertyAssets(widget.tenancy.propertyId),
    await _api.tenancy(widget.tenancy.id),
  );

  Future<void> _refresh() async {
    final next = _api.load(
      _load,
      savedFirst: false,
      retainKey: 'tenancy:${widget.tenancy.id}',
    );
    setState(() {
      _loading = next;
    });
    await next.fresh;
  }

  Future<void> _report(
    List<PropertyAssetSummary> assets,
    TenancyDetail terms,
  ) async {
    final id = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => NewMaintenanceCaseScreen(
          tenancyId: widget.tenancy.id,
          assets: assets,
          api: _api,
          moveInDefects: terms.moveInDefects,
        ),
      ),
    );
    if (!mounted || id == null) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MaintenanceCaseScreen(caseId: id, api: _api),
      ),
    );
    if (mounted) await _refresh();
  }

  Future<void> _reviewRepairTerms() async {
    final ownerId = _api.currentOwnerId;
    setState(() => _openingRepairTerms = true);
    try {
      final documents = await _api.supportingDocuments(
        widget.tenancy.id,
        ownerId: ownerId,
      );
      if (!mounted) return;
      final agreement = documents.agreement;
      await Navigator.of(context).push<Object?>(
        MaterialPageRoute(
          builder: (_) => agreement.canReview && agreement.currentFileId != null
              ? AgreementTermsScreen(
                  tenancyId: widget.tenancy.id,
                  agreement: agreement,
                  currency: documents.currency,
                  api: _api,
                  ownerId: ownerId,
                )
              : SupportingDocumentsScreen(
                  tenancyId: widget.tenancy.id,
                  api: _api,
                ),
        ),
      );
      if (mounted) await _refresh();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    } finally {
      if (mounted) setState(() => _openingRepairTerms = false);
    }
  }

  Future<void> _editAsset([PropertyAssetSummary? asset]) async {
    final name = TextEditingController(text: asset?.name ?? '');
    final room = TextEditingController(text: asset?.roomLabel ?? '');
    final identifier = TextEditingController(text: asset?.identifier ?? '');
    var category = asset?.category ?? 'APPLIANCE';
    final action = await showKiviloDrawer<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => KiviloDrawer(
          title: Text(asset == null ? t.assetAddTitle : t.editPropertyAsset),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: name,
                decoration: InputDecoration(labelText: t.assetName),
              ),
              const SizedBox(height: 16),
              KiviloSelectField<String>(
                label: t.assetCategory,
                value: category,
                options: [
                  KiviloSelectOption(
                    value: 'APPLIANCE',
                    label: t.assetAppliance,
                  ),
                  KiviloSelectOption(value: 'FIXTURE', label: t.assetFixture),
                  KiviloSelectOption(
                    value: 'FURNITURE',
                    label: t.assetFurniture,
                  ),
                  KiviloSelectOption(value: 'SURFACE', label: t.assetSurface),
                  KiviloSelectOption(value: 'SYSTEM', label: t.assetSystem),
                  KiviloSelectOption(value: 'OTHER', label: t.basisOther),
                ],
                onChanged: (value) => setDialogState(() => category = value),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: room,
                decoration: InputDecoration(labelText: t.assetRoomOptional),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: identifier,
                decoration: InputDecoration(
                  labelText: t.assetIdentifierOptional,
                ),
              ),
            ],
          ),
          actions: [
            if (asset != null)
              TextButton(
                onPressed: () => Navigator.pop(context, 'retire'),
                child: Text(t.retireAsset),
              ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(t.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, 'save'),
              child: Text(asset == null ? t.add : t.save),
            ),
          ],
        ),
      ),
    );
    if (action == 'save' && name.text.trim().isNotEmpty) {
      final details = <String, dynamic>{
        'name': name.text.trim(),
        'category': category,
        'roomLabel': room.text.trim().isEmpty ? null : room.text.trim(),
        'identifier': identifier.text.trim().isEmpty
            ? null
            : identifier.text.trim(),
      };
      if (asset == null) {
        await _api.createPropertyAsset(widget.tenancy.propertyId, {
          ...details,
          'inspectionItemId': null,
        });
      } else {
        await _api.updatePropertyAsset(widget.tenancy.propertyId, asset.id, {
          'action': 'update',
          ...details,
        });
      }
      if (mounted) await _refresh();
    } else if (action == 'retire' && asset != null && mounted) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(t.retireThisAsset),
          content: Text(
            '${asset.name} will no longer appear when reporting a new repair. '
            'Its repair and report history will be kept.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(t.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(t.retireAsset),
            ),
          ],
        ),
      );
      if (confirmed == true) {
        await _api.retirePropertyAsset(widget.tenancy.propertyId, asset.id);
        if (mounted) await _refresh();
      }
    }
    // The bottom sheet's reverse transition can still be reading its fields after
    // Navigator.pop completes. Dispose once that route is fully off screen.
    await Future<void>.delayed(const Duration(milliseconds: 300));
    name.dispose();
    room.dispose();
    identifier.dispose();
  }

  Future<void> _editCap(String? current, String currency) async {
    final cap = TextEditingController(text: current ?? '');
    final saved = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDrawerState) {
          final amount = cap.text.trim();
          final valid =
              amount.isEmpty || RegExp(r'^\d+(?:\.\d{1,2})?$').hasMatch(amount);
          return KiviloDrawer(
            title: Text(t.minorRepairCap),
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  t.minorRepairCapBody,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: cap,
                  autofocus: true,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    labelText: t.minorRepairCapLabel,
                    prefixText: '${currencySymbol(currency)} ',
                    helperText: t.minorRepairCapHelper,
                    errorText: valid ? null : t.minorRepairCapInvalid,
                  ),
                  onChanged: (_) => setDrawerState(() {}),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(t.cancel),
              ),
              FilledButton(
                onPressed: valid ? () => Navigator.pop(context, true) : null,
                child: Text(t.save),
              ),
            ],
          );
        },
      ),
    );
    final amount = cap.text.trim();
    cap.dispose();
    if (saved != true) return;
    await _api.updateTenancyTerms(widget.tenancy.id, {
      'minorRepairCap': amount.isEmpty ? null : amount,
    });
    if (mounted) await _refresh();
  }

  Future<void> _setAgentAuthority(bool value) async {
    await _api.updateTenancyTerms(widget.tenancy.id, {
      'agentMayAgreeCosts': value,
    });
    if (mounted) await _refresh();
  }

  Future<void> _editDefectWindow(int current, String country) async {
    var days = '$current';
    final result = await showKiviloDrawer<int>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDrawerState) {
          final value = int.tryParse(days.trim());
          final valid = value != null && value >= 0 && value <= 365;
          return KiviloDrawer(
            title: Text(t.defectPeriod),
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Use the period in the tenancy agreement. The tenancy start date is day 1, in ${countryName(country)} time. This is fixed when the tenant first signs the check-in.',
                ),
                const SizedBox(height: 16),
                TextFormField(
                  initialValue: days,
                  autofocus: true,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: t.defectPeriodDays,
                    helperText: t.defectPeriodHelper,
                    errorText: valid ? null : t.defectPeriodInvalid,
                  ),
                  onChanged: (value) => setDrawerState(() => days = value),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(t.cancel),
              ),
              FilledButton(
                onPressed: valid ? () => Navigator.pop(context, value) : null,
                child: Text(t.save),
              ),
            ],
          );
        },
      ),
    );
    if (result == null) return;
    try {
      await _api.updateTenancyTerms(widget.tenancy.id, {
        'defectWindowDays': result,
      });
      if (mounted) await _refresh();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = StreamBuilder<_TenancyData>(
      stream: _loading.stream,
      builder: (context, snapshot) {
        if (!snapshot.hasData && !snapshot.hasError) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return KiviloMessage(
            icon: Icons.cloud_off_outlined,
            title: widget.embedded
                ? t.couldNotLoadRepairsAndAssets
                : t.couldNotOpenThisProperty,
            body: plainError(snapshot.error!),
            actionLabel: 'Try again',
            onAction: _refresh,
          );
        }
        final (cases, assets, terms) = snapshot.data!;
        final children = <Widget>[
          if (!widget.embedded) ...[
            KiviloEyebrow(t.tenancyEyebrow),
            const SizedBox(height: 6),
            Text(
              widget.tenancy.property,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Text(
              t.tenancySubtitle,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: kiviloSectionGap),
            KiviloSectionHeading(
              title: t.tenancyRecord,
              subtitle: t.tenancyRecordDetail,
            ),
            const SizedBox(height: kiviloHeadingGap),
            if (terms.role == 'AGENT') ...[
              Card(
                child: ListTile(
                  leading: const Icon(Icons.person_outline),
                  title: Text(
                    terms.access?.canManageAccess == true
                        ? t.tenancyManageAccess
                        : t.tenancyPropertyAccess,
                  ),
                  subtitle: terms.access == null
                      ? null
                      : Text(terms.access!.label),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () async {
                    await Navigator.of(context).push<void>(
                      MaterialPageRoute(
                        builder: (_) => TenancyAccessScreen(
                          tenancyId: widget.tenancy.id,
                          property: widget.tenancy.property,
                          api: _api,
                        ),
                      ),
                    );
                    if (mounted) await _refresh();
                  },
                ),
              ),
              const SizedBox(height: 10),
            ],
            Card(
              child: ListTile(
                leading: const Icon(Icons.description_outlined),
                title: Text(t.documents),
                subtitle: Text(t.tenancyAgreementAndSupportingFiles),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context).push<void>(
                  MaterialPageRoute(
                    builder: (_) => SupportingDocumentsScreen(
                      tenancyId: widget.tenancy.id,
                      api: _api,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            if (widget.tenancy.role == 'AGENT' &&
                widget.currentInspection != null &&
                widget.currentInspection!.id != widget.tenancy.latestReportId &&
                ![
                  'AWAITING_SIGNATURE',
                  'COMPLETED',
                ].contains(widget.currentInspection!.status)) ...[
              Card(
                child: ListTile(
                  leading: const Icon(
                    Icons.edit_outlined,
                    color: KiviloColors.pinkDark,
                  ),
                  title: Text(
                    widget.currentInspection!.kind == 'CHECK_IN'
                        ? t.homeOpenCheckIn
                        : t.homeOpenCheckOut,
                  ),
                  subtitle: Text(t.tenancyOpenInspectionDetail),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () async {
                    await Navigator.of(context).push<void>(
                      MaterialPageRoute(
                        builder: (_) => InspectionScreen(
                          id: widget.currentInspection!.id,
                          api: _api,
                        ),
                      ),
                    );
                    if (mounted) await _refresh();
                  },
                ),
              ),
              const SizedBox(height: 10),
            ],
            if (widget.tenancy.latestReportId case final reportId?) ...[
              Card(
                child: ListTile(
                  leading: const Icon(
                    Icons.fact_check_outlined,
                    color: KiviloColors.pinkDark,
                  ),
                  title: Text(
                    widget.tenancy.latestReportKind == 'CHECK_OUT'
                        ? t.tenancyLatestCheckOut
                        : t.tenancyLatestCheckIn,
                  ),
                  subtitle: Text(t.tenancyViewReport),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () async {
                    await Navigator.of(context).push<void>(
                      MaterialPageRoute(
                        builder: (_) => widget.tenancy.role == 'AGENT'
                            ? InspectionScreen(id: reportId, api: _api)
                            : ReportScreen(id: reportId, api: _api),
                      ),
                    );
                    if (mounted) await _refresh();
                  },
                ),
              ),
              const SizedBox(height: 10),
            ],
            Card(
              child: ListTile(
                leading: const Icon(
                  Icons.history,
                  color: KiviloColors.pinkDark,
                ),
                title: Text(t.tenancyTimeline),
                subtitle: Text(t.tenancyTimelineDetail),
                trailing: const Icon(
                  Icons.chevron_right,
                  color: KiviloColors.subtle,
                ),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => PropertyTimelineScreen(
                      showPropertySettings: terms.role == 'AGENT',
                      propertyId: widget.tenancy.propertyId,
                      api: _api,
                    ),
                  ),
                ),
              ),
            ),
            if (terms.role == 'AGENT') ...[
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () async {
                  await Navigator.of(context).push<void>(
                    MaterialPageRoute(
                      builder: (_) => PropertySettingsScreen(
                        propertyId: widget.tenancy.propertyId,
                        api: _api,
                      ),
                    ),
                  );
                  if (mounted) await _refresh();
                },
                child: Text(t.propertySettings),
              ),
            ],
            const SizedBox(height: kiviloSectionGap),
          ],
          KiviloSectionHeading(
            title: t.tenancyCare,
            subtitle: t.tenancyCareDetail,
          ),
          const SizedBox(height: kiviloHeadingGap),
          Card(
            color: KiviloColors.canvas,
            child: ListTile(
              leading: const Icon(Icons.emergency_outlined),
              title: Text(t.tenancyDanger),
              subtitle: Text(t.tenancyDangerNumbers),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const ServiceDirectoryScreen(),
                ),
              ),
            ),
          ),
          const SizedBox(height: kiviloButtonGap),
          FilledButton.icon(
            onPressed: () => _report(assets, terms),
            icon: const Icon(Icons.add),
            label: Text(t.reportProblem),
          ),
          const SizedBox(height: kiviloButtonGap),
          if (terms.moveInDefects case final window?) ...[
            Card(
              child: ListTile(
                title: Text(t.defectPeriod),
                subtitle: Text(
                  window.deadline == null
                      ? t.defectPeriodDisabled
                      : '${window.windowDays} days · Report by ${calendarDate(window.deadline!)} (${countryName(terms.country)} time)',
                ),
                trailing: window.canEditWindow
                    ? TextButton(
                        onPressed: () =>
                            _editDefectWindow(window.windowDays, terms.country),
                        child: Text(t.edit),
                      )
                    : null,
              ),
            ),
            const SizedBox(height: 10),
          ],
          const SizedBox(height: kiviloSectionGap),
          KiviloSectionHeading(
            title: t.maintenance,
            subtitle: cases.isEmpty
                ? null
                : '${cases.length} ${cases.length == 1 ? t.request : t.requests}',
          ),
          const SizedBox(height: kiviloHeadingGap),
          if (cases.isEmpty) _emptyMaintenance(),
          for (var index = 0; index < cases.length; index++) ...[
            if (index > 0) const SizedBox(height: 10),
            Card(
              child: ListTile(
                title: Text(cases[index].title),
                subtitle: Text(
                  [
                    maintenanceStatusLabels[cases[index].status] ??
                        cases[index].status,
                    ?cases[index].asset,
                    if (cases[index].repairAttempts > 0)
                      t.repairAttempts(cases[index].repairAttempts),
                  ].join(' · '),
                ),
                leading: Icon(
                  cases[index].priority == 'SAFETY_EMERGENCY'
                      ? Icons.warning_amber
                      : Icons.build_outlined,
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => MaintenanceCaseScreen(
                        caseId: cases[index].id,
                        api: _api,
                      ),
                    ),
                  );
                  if (mounted) await _refresh();
                },
              ),
            ),
          ],
          if (terms.role != 'TENANT' || terms.minorRepairCap != null) ...[
            const SizedBox(height: kiviloSectionGap),
            KiviloSectionHeading(
              title: t.repairCosts,
              subtitle: t.repairCostsDetail,
            ),
            const SizedBox(height: kiviloHeadingGap),
            _repairTerms(terms),
          ],
          if (assets.isNotEmpty || widget.tenancy.role != 'TENANT') ...[
            const SizedBox(height: kiviloSectionGap),
            KiviloSectionHeading(
              title: t.assets,
              subtitle: t.assetsDetail,
              action: widget.tenancy.role == 'TENANT'
                  ? null
                  : TextButton.icon(
                      onPressed: _editAsset,
                      icon: const Icon(Icons.add, size: 18),
                      label: Text(t.assetAdd),
                    ),
            ),
            const SizedBox(height: kiviloHeadingGap),
            if (assets.isEmpty) _emptyAssets(),
            for (var index = 0; index < assets.length; index++) ...[
              if (index > 0) const Divider(height: 1),
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                title: Text(assets[index].name),
                subtitle: Text(
                  [
                    if (assets[index].roomLabel != null)
                      assets[index].roomLabel!,
                    if (assets[index].identifier != null)
                      assets[index].identifier!,
                    t.assetRepairs(assets[index].repairVisitsLast365Days),
                  ].join(' · '),
                ),
                trailing: widget.tenancy.role == 'TENANT'
                    ? (assets[index].repairVisitsLast365Days >= 4
                          ? Chip(label: Text(t.assetRepeatFault))
                          : null)
                    : Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (assets[index].repairVisitsLast365Days >= 4)
                            Chip(label: Text(t.assetRepeatFault)),
                          const Icon(Icons.chevron_right),
                        ],
                      ),
                onTap: widget.tenancy.role == 'TENANT'
                    ? null
                    : () => _editAsset(assets[index]),
              ),
            ],
          ],
        ];
        if (widget.embedded) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: children,
          );
        }
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(padding: kiviloScreenPadding, children: children),
        );
      },
    );
    if (widget.embedded) return body;
    return Scaffold(
      appBar: AppBar(
        centerTitle: false,
        toolbarHeight: 72,
        title: PageContextTitle(
          title: t.newProperty,
          contextLabel: widget.tenancy.property,
        ),
      ),
      body: KiviloContent(maxWidth: 840, child: body),
    );
  }

  Widget _repairTerms(TenancyDetail terms) => Card(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (terms.maintenanceTerms case final agreementTerms?) ...[
          Padding(
            padding: EdgeInsets.fromLTRB(
              16,
              16,
              16,
              terms.canEditMinorRepairCap ? 0 : 16,
            ),
            child: AgreementTermsView(
              terms: agreementTerms,
              currency: terms.currency,
            ),
          ),
          if (terms.canEditMinorRepairCap) ...[
            const SizedBox(height: kiviloButtonGap),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: OutlinedButton(
                onPressed: _openingRepairTerms ? null : _reviewRepairTerms,
                child: Text(
                  _openingRepairTerms ? t.opening : t.reviewRepairTerms,
                ),
              ),
            ),
          ],
        ] else
          ListTile(
            contentPadding: const EdgeInsets.fromLTRB(16, 6, 8, 6),
            title: Text(t.minorRepairCap),
            subtitle: Text(
              terms.minorRepairCap == null
                  ? t.notSet
                  : 'Tenant pays up to ${currencySymbol(terms.currency)}${terms.minorRepairCap} per repair',
            ),
            trailing: terms.canEditMinorRepairCap
                ? TextButton(
                    onPressed: () =>
                        _editCap(terms.minorRepairCap, terms.currency),
                    child: Text(terms.minorRepairCap == null ? t.set : t.edit),
                  )
                : null,
          ),
        if (terms.role != 'TENANT') ...[
          const Divider(height: 1),
          SwitchListTile(
            contentPadding: const EdgeInsets.fromLTRB(16, 6, 12, 6),
            title: Text(t.agentMayAgreeCosts),
            subtitle: Text(
              terms.canEditAgentAuthority
                  ? t.agentMayAgreeCostsOn
                  : t.agentMayAgreeCostsLandlordOnly,
            ),
            value: terms.agentMayAgreeCosts,
            onChanged: terms.canEditAgentAuthority ? _setAgentAuthority : null,
          ),
        ],
      ],
    ),
  );

  Widget _emptyMaintenance() => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Icon(Icons.task_alt, color: KiviloColors.green, size: 32),
          const SizedBox(height: 12),
          Text(
            t.noMaintenanceReported,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ],
      ),
    ),
  );

  Widget _emptyAssets() => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          const Icon(
            Icons.inventory_2_outlined,
            color: KiviloColors.subtle,
            size: 28,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              t.assetsEmpty,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    ),
  );
}

typedef _TenancyData = (
  List<MaintenanceCaseSummary>,
  List<PropertyAssetSummary>,
  TenancyDetail,
);
