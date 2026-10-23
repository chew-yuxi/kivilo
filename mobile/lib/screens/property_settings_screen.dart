import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../models/property_settings.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import 'tenancy_access_screen.dart';
import 'inspection_screen.dart';

class PropertySettingsScreen extends StatefulWidget {
  const PropertySettingsScreen({super.key, required this.propertyId, this.api});
  final String propertyId;
  final Api? api;
  @override
  State<PropertySettingsScreen> createState() => _PropertySettingsScreenState();
}

class _PropertySettingsScreenState extends State<PropertySettingsScreen> {
  late final _api = widget.api ?? Api();
  late Future<PropertySettings> _future = _api.propertySettings(
    widget.propertyId,
  );
  bool _busy = false;
  String? _error;

  Future<void> _refresh() async {
    final next = _api.propertySettings(widget.propertyId);
    setState(() {
      _future = next;
    });
    await next;
  }

  Future<void> _change(PropertySettings property, String action) async {
    if (_busy) return;
    final confirmation = await showKiviloDrawer<String>(
      context: context,
      builder: (_) => _PropertyChangeDrawer(property: property, action: action),
    );
    if (confirmation == null || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = await _api.changePropertyState(
        widget.propertyId,
        action,
        confirmation: action == 'trash' ? confirmation : null,
      );
      if (mounted) {
        setState(() {
          _future = Future.value(updated);
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope<void>(
    canPop: !_busy,
    child: Scaffold(
      appBar: AppBar(title: Text(t.propertySettings)),
      body: KiviloContent(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: FutureBuilder<PropertySettings>(
            future: _future,
            builder: (context, snapshot) {
              final property = snapshot.data;
              if (property == null && !snapshot.hasError) {
                return const Center(child: CircularProgressIndicator());
              }
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                children: [
                  if (property != null) ...[
                    Text(
                      property.label,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(switch (property.state) {
                      'ARCHIVED' => t.propertyArchived,
                      'TRASHED' => t.propertyInTrash,
                      _ => t.propertyActive,
                    }),
                    const SizedBox(height: 12),
                    Text(
                      t.propertyCounts(property.counts['tenancies'] as int, property.counts['inspections'] as int, property.counts['photos'] as int),
                    ),
                  ],
                  if (_error != null || snapshot.hasError) ...[
                    const SizedBox(height: 16),
                    Text(
                      _error ?? plainError(snapshot.error!),
                      style: const TextStyle(color: KiviloColors.red),
                    ),
                    OutlinedButton(
                      onPressed: _busy ? null : _refresh,
                      child: Text(t.tryAgain),
                    ),
                  ],
                  if (property != null) ...[
                    if (property.state != 'TRASHED') ...[
                      const SizedBox(height: 24),
                      KiviloSectionHeading(title: t.propertyTenancyAccess),
                      const SizedBox(height: 10),
                      for (final tenancy in property.tenancies) ...[
                        Card(
                          child: ListTile(
                            title: Text(
                              tenancy['agencyName'] as String? ??
                                  t.propertyPersonalTenancy,
                            ),
                            subtitle: Text(
                              t.propertyResponsibleAgent('${tenancy['leadAgentName']}'),
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: _busy
                                ? null
                                : () async {
                                    await Navigator.of(context).push<void>(
                                      MaterialPageRoute(
                                        builder: (_) => TenancyAccessScreen(
                                          tenancyId: tenancy['id'] as String,
                                          property: property.label,
                                          api: _api,
                                        ),
                                      ),
                                    );
                                    if (mounted) await _refresh();
                                  },
                          ),
                        ),
                        const SizedBox(height: 8),
                        for (final inspection
                            in (tenancy['inspections'] as List<dynamic>? ??
                                const [])) ...[
                          OutlinedButton(
                            onPressed: _busy
                                ? null
                                : () async {
                                    await Navigator.of(context).push<void>(
                                      MaterialPageRoute(
                                        builder: (_) => InspectionScreen(
                                          id:
                                              (inspection
                                                      as Map<
                                                        String,
                                                        dynamic
                                                      >)['id']
                                                  as String,
                                          api: _api,
                                        ),
                                      ),
                                    );
                                    if (mounted) await _refresh();
                                  },
                            child: Text(
                              inspection['kind'] == 'CHECK_OUT' ? t.propertyOpenCheckOutReport : t.propertyOpenCheckInReport,
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                      ],
                    ],
                    const SizedBox(height: 28),
                    Card(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: KiviloColors.red),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              t.propertyDangerZone,
                              style: Theme.of(context).textTheme.titleLarge
                                  ?.copyWith(color: KiviloColors.red),
                            ),
                            const SizedBox(height: 12),
                            if (!property.canManage)
                              Text(
                                t.propertyManageOnly,
                              ),
                            if (property.state == 'TRASHED') ...[
                              Text(
                                property.trashExpiresAt == null ? t.propertyTrashedNoDate : t.propertyTrashedUntil(shortDate(property.trashExpiresAt!)),
                              ),
                              const SizedBox(height: 16),
                              FilledButton(
                                onPressed: property.canManage && !_busy
                                    ? () => _change(property, 'restore')
                                    : null,
                                child: Text(t.propertyRestore),
                              ),
                            ] else ...[
                              Text(
                                property.state == 'ARCHIVED'
                                    ? t.propertyArchivedBody
                                    : t.propertyArchiveBody,
                              ),
                              const SizedBox(height: 12),
                              OutlinedButton(
                                onPressed: property.canManage && !_busy
                                    ? () => _change(
                                        property,
                                        property.state == 'ARCHIVED'
                                            ? 'unarchive'
                                            : 'archive',
                                      )
                                    : null,
                                child: Text(
                                  property.state == 'ARCHIVED'
                                      ? t.propertyRestoreActive
                                      : t.propertyArchive,
                                ),
                              ),
                              const SizedBox(height: 24),
                              Text(
                                t.propertyDeleteBody,
                              ),
                              if (property.deleteBlockedReason != null) ...[
                                const SizedBox(height: 8),
                                Text(
                                  property.deleteBlockedReason!,
                                  style: const TextStyle(
                                    color: KiviloColors.red,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 12),
                              OutlinedButton(
                                onPressed:
                                    property.canManage &&
                                        property.canDelete &&
                                        !_busy
                                    ? () => _change(property, 'trash')
                                    : null,
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: KiviloColors.red,
                                  side: const BorderSide(
                                    color: KiviloColors.red,
                                  ),
                                ),
                                child: Text(t.propertyDelete),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                  if (_busy) ...[
                    const SizedBox(height: 16),
                    const LinearProgressIndicator(),
                  ],
                ],
              );
            },
          ),
        ),
      ),
    ),
  );
}

class _PropertyChangeDrawer extends StatefulWidget {
  const _PropertyChangeDrawer({required this.property, required this.action});
  final PropertySettings property;
  final String action;
  @override
  State<_PropertyChangeDrawer> createState() => _PropertyChangeDrawerState();
}

class _PropertyChangeDrawerState extends State<_PropertyChangeDrawer> {
  final _confirmation = TextEditingController();
  @override
  void dispose() {
    _confirmation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final deleting = widget.action == 'trash';
    final archiving = widget.action == 'archive';
    final label = deleting
        ? t.propertyMoveToTrash
        : archiving
        ? t.propertyArchive
        : t.propertyRestore;
    return KiviloDrawer(
      title: Text(t.questionTitle(label)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            widget.property.label,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          Text(
            deleting
                ? t.propertyTrashBody(widget.property.counts['tenancies'] as int, widget.property.counts['inspections'] as int, widget.property.counts['photos'] as int)
                : archiving
                ? t.propertyArchiveConfirmBody
                : t.propertyRestoreConfirmBody,
          ),
          if (deleting) ...[
            const SizedBox(height: 16),
            Text(t.propertyTypeToConfirm(widget.property.confirmationLabel)),
            const SizedBox(height: 12),
            TextField(
              controller: _confirmation,
              autocorrect: false,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(labelText: t.propertyAddress),
            ),
          ],
        ],
      ),
      actions: [
        OutlinedButton(
          onPressed: () => Navigator.pop(context),
          child: Text(t.cancel),
        ),
        FilledButton(
          onPressed:
              deleting &&
                  _confirmation.text != widget.property.confirmationLabel
              ? null
              : () => Navigator.pop(context, _confirmation.text),
          style: deleting
              ? FilledButton.styleFrom(backgroundColor: KiviloColors.red)
              : null,
          child: Text(label),
        ),
      ],
    );
  }
}

class PropertiesScreen extends StatefulWidget {
  const PropertiesScreen({super.key, this.api});
  final Api? api;
  @override
  State<PropertiesScreen> createState() => _PropertiesScreenState();
}

class _PropertiesScreenState extends State<PropertiesScreen> {
  late final _api = widget.api ?? Api();
  String _state = 'active';
  String? _error;
  late Future<List<PropertyEntry>> _future = _api.properties();
  Future<void> _refresh() async {
    final next = _api.properties(state: _state);
    setState(() {
      _future = next;
      _error = null;
    });
    try {
      await next;
    } catch (error) {
      if (mounted && identical(_future, next)) {
        setState(() => _error = plainError(error));
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(t.settingsProperties)),
    body: KiviloContent(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: KiviloSegmentedControl<String>(
              value: _state,
              options: [
                KiviloSegmentOption(value: 'active', label: t.propertiesActive),
                KiviloSegmentOption(value: 'archived', label: t.propertyArchived),
                KiviloSegmentOption(value: 'trash', label: t.propertiesTrash),
              ],
              onChanged: (value) {
                setState(() => _state = value!);
                _refresh();
              },
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: FutureBuilder<List<PropertyEntry>>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  return ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    children: [
                      if (snapshot.hasError) ...[
                        Text(
                          _error ?? plainError(snapshot.error!),
                          style: const TextStyle(color: KiviloColors.red),
                        ),
                        OutlinedButton(
                          onPressed: _refresh,
                          child: Text(t.tryAgain),
                        ),
                      ],
                      if (snapshot.hasData && snapshot.data!.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(
                            _state == 'active'
                                ? t.propertiesNoActive
                                : _state == 'archived'
                                ? t.propertiesNoArchived
                                : t.propertiesTrashEmpty,
                            textAlign: TextAlign.center,
                          ),
                        ),
                      for (final property
                          in snapshot.data ?? <PropertyEntry>[]) ...[
                        Card(
                          child: ListTile(
                            contentPadding: const EdgeInsets.all(16),
                            title: Text(property.label),
                            subtitle: Text(
                              [t.propertyListCounts(property.tenancyCount, property.inspectionCount), if (property.trashExpiresAt != null) t.propertyRestoreBefore(shortDate(property.trashExpiresAt!))].join('\n'),
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () async {
                              await Navigator.of(context).push<void>(
                                MaterialPageRoute(
                                  builder: (_) => PropertySettingsScreen(
                                    propertyId: property.id,
                                    api: _api,
                                  ),
                                ),
                              );
                              if (mounted) await _refresh();
                            },
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                    ],
                  );
                },
              ),
            ),
          ),
        ],
      ),
    ),
  );
}
