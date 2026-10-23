import 'package:flutter/material.dart';

import '../models/property_settings.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import 'property_history_screen.dart';
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

  String _count(Object? value, String one, String many) =>
      '$value ${value == 1 ? one : many}';

  void _locked(PropertySettings property, String action) => showLockedAction(
    context,
    action: action,
    who: 'the responsible agent or a team owner or manager for every tenancy here',
    askNames: property.askNames,
  );

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
      appBar: AppBar(title: const Text('Property settings')),
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
                padding: kiviloScreenPadding,
                children: [
                  if (property != null) ...[
                    Text(
                      property.label,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(switch (property.state) {
                      'ARCHIVED' => 'Archived',
                      'TRASHED' => 'In trash',
                      _ => 'Active property',
                    }),
                    const SizedBox(height: 12),
                    Text(
                      [
                        _count(property.counts['tenancies'], 'tenancy', 'tenancies'),
                        _count(property.counts['inspections'], 'inspection', 'inspections'),
                        _count(property.counts['photos'], 'photo', 'photos'),
                      ].join(' · '),
                    ),
                  ],
                  if (_error != null || snapshot.hasError) ...[
                    const SizedBox(height: 16),
                    Text(
                      _error ?? plainError(snapshot.error!),
                      style: const TextStyle(color: KiviloColors.red),
                    ),
                    const SizedBox(height: kiviloButtonGap),
                    OutlinedButton(
                      onPressed: _busy ? null : _refresh,
                      child: const Text('Try again'),
                    ),
                  ],
                  if (property != null) ...[
                    if (property.state != 'TRASHED') ...[
                      const SizedBox(height: kiviloSectionGap),
                      const KiviloSectionHeading(title: 'Tenancy access'),
                      const SizedBox(height: kiviloHeadingGap),
                      for (final tenancy in property.tenancies) ...[
                        Card(
                          child: ListTile(
                            title: Text(
                              tenancy['agencyName'] as String? ??
                                  'Personal tenancy',
                            ),
                            subtitle: Text(
                              'Responsible agent: ${tenancy['leadAgentName']}',
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
                              'Open ${inspection['kind'] == 'CHECK_OUT' ? 'check-out' : 'check-in'} report',
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                      ],
                    ],
                    const SizedBox(height: kiviloSectionGap),
                    const KiviloSectionHeading(
                      title: 'History',
                      subtitle:
                          'Every change and deletion, with who made it. Deleted items can be restored for 30 days.',
                    ),
                    const SizedBox(height: kiviloHeadingGap),
                    OutlinedButton.icon(
                      onPressed: () => Navigator.of(context).push<void>(
                        MaterialPageRoute(
                          builder: (_) => PropertyHistoryScreen(
                            propertyId: widget.propertyId,
                            api: _api,
                          ),
                        ),
                      ),
                      icon: const Icon(Icons.history),
                      label: const Text('View history'),
                    ),
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
                              'Danger zone',
                              style: Theme.of(context).textTheme.titleLarge
                                  ?.copyWith(color: KiviloColors.red),
                            ),
                            const SizedBox(height: 12),
                            if (property.state == 'TRASHED') ...[
                              Text(
                                'This property is hidden from active work. ${property.trashExpiresAt == null ? 'Restore it before its recovery period ends.' : 'Restore before ${shortDate(property.trashExpiresAt!)}. After that, eligible records and media are permanently removed.'}',
                              ),
                              const SizedBox(height: 16),
                              FilledButton(
                                onPressed: _busy
                                    ? null
                                    : property.canManage
                                    ? () => _change(property, 'restore')
                                    : () => _locked(property, 'Restore property'),
                                child: const Text('Restore property'),
                              ),
                            ] else ...[
                              Text(
                                property.state == 'ARCHIVED'
                                    ? 'This property is outside the active portfolio. Its records and reports are preserved.'
                                    : 'Archive removes this address from active work and preserves its reports and history. You can restore it later.',
                              ),
                              const SizedBox(height: 12),
                              OutlinedButton(
                                onPressed: _busy
                                    ? null
                                    : property.canManage
                                    ? () => _change(
                                        property,
                                        property.state == 'ARCHIVED'
                                            ? 'unarchive'
                                            : 'archive',
                                      )
                                    : () => _locked(
                                        property,
                                        property.state == 'ARCHIVED'
                                            ? 'Restore to active properties'
                                            : 'Archive property',
                                      ),
                                child: Text(
                                  property.state == 'ARCHIVED'
                                      ? 'Restore to active properties'
                                      : 'Archive property',
                                ),
                              ),
                              const SizedBox(height: 24),
                              const Text(
                                'Delete a mistaken or draft-only property. It moves to trash for 30 days before eligible records and media are permanently removed.',
                              ),
                              if (property.canManage &&
                                  property.deleteBlockedReason != null) ...[
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
                                onPressed: _busy
                                    ? null
                                    : !property.canManage
                                    ? () => _locked(property, 'Delete property')
                                    : property.canDelete
                                    ? () => _change(property, 'trash')
                                    : null,
                                style: kiviloDangerOutlined,
                                child: const Text('Delete property'),
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
        ? 'Move to trash'
        : archiving
        ? 'Archive property'
        : 'Restore property';
    return KiviloDrawer(
      title: Text('$label?'),
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
                ? 'This affects ${widget.property.counts['tenancies']} tenancies, ${widget.property.counts['inspections']} inspections and ${widget.property.counts['photos']} photos. You have 30 days to restore them from Properties → Trash.'
                : archiving
                ? 'This removes the property from active work for everyone with access. Reports and evidence remain available in Archived properties.'
                : 'This restores the property and its saved work to their previous state.',
          ),
          if (deleting) ...[
            const SizedBox(height: 16),
            Text('Type “${widget.property.confirmationLabel}” to confirm.'),
            const SizedBox(height: 12),
            TextField(
              controller: _confirmation,
              autocorrect: false,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: 'Property address'),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed:
              deleting &&
                  _confirmation.text != widget.property.confirmationLabel
              ? null
              : () => Navigator.pop(context, _confirmation.text),
          style: deleting
              ? kiviloDangerFilled
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
    appBar: AppBar(title: const Text('Properties')),
    body: KiviloContent(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: KiviloSegmentedControl<String>(
              value: _state,
              options: const [
                KiviloSegmentOption(value: 'active', label: 'Active'),
                KiviloSegmentOption(value: 'archived', label: 'Archived'),
                KiviloSegmentOption(value: 'trash', label: 'Trash'),
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
                          child: const Text('Try again'),
                        ),
                      ],
                      if (snapshot.hasData && snapshot.data!.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(
                            _state == 'active'
                                ? 'No active properties.'
                                : _state == 'archived'
                                ? 'No archived properties.'
                                : 'Trash is empty.',
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
                              '${property.tenancyCount} tenancies · ${property.inspectionCount} inspections${property.trashExpiresAt == null ? '' : '\nRestore before ${shortDate(property.trashExpiresAt!)}'}',
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
