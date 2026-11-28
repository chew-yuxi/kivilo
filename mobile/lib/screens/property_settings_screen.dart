import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../models/property_settings.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';

String _count(Object? value, String one, String many) =>
    '$value ${value == 1 ? one : many}';

class PropertySettingsScreen extends StatefulWidget {
  const PropertySettingsScreen({super.key, required this.propertyId, this.api});
  final String propertyId;
  final Api? api;
  @override
  State<PropertySettingsScreen> createState() => _PropertySettingsScreenState();
}

class _PropertySettingsScreenState extends State<PropertySettingsScreen> {
  late final _api = widget.api ?? Api();
  late Loading<PropertySettings> _loading = _api.load(
    () => _api.propertySettings(widget.propertyId),
    retainKey: 'property-settings:${widget.propertyId}',
  );
  bool _busy = false;
  String? _error;

  Future<void> _refresh() async {
    final next = _api.load(
      () => _api.propertySettings(widget.propertyId),
      savedFirst: false,
      retainKey: 'property-settings:${widget.propertyId}',
    );
    setState(() {
      _loading = next;
    });
    await next.fresh;
  }

  void _locked(PropertySettings property, String action) => showLockedAction(
    context,
    action: action,
    who: t.theResponsibleAgentOrATeamOwnerLabel,
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
          _loading = _api.load(
            () async => updated,
            savedFirst: false,
            retainKey: 'property-settings:${widget.propertyId}',
          );
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
      appBar: AppBar(title: Text(t.propertyActions)),
      body: KiviloContent(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: StreamBuilder<PropertySettings>(
            stream: _loading.stream,
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
                      'ARCHIVED' => t.propertyArchived,
                      'TRASHED' => t.propertyInTrash,
                      _ => t.propertyActive,
                    }),
                    const SizedBox(height: 12),
                    Text(
                      [
                        _count(
                          property.counts['tenancies'],
                          t.tenancy,
                          t.tenancies,
                        ),
                        _count(
                          property.counts['inspections'],
                          t.inspectionLabel,
                          t.inspections,
                        ),
                        _count(
                          property.counts['photos'],
                          t.photoWord,
                          t.photosLabel,
                        ),
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
                      child: Text(t.tryAgain),
                    ),
                  ],
                  if (property != null) ...[
                    const SizedBox(height: kiviloSectionGap),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(switch (property.state) {
                              'ARCHIVED' => t.restoreOrDeleteProperty,
                              'TRASHED' => t.propertyRecovery,
                              _ => t.archiveOrDeleteProperty,
                            }, style: Theme.of(context).textTheme.titleLarge),
                            const SizedBox(height: 12),
                            if (property.state == 'TRASHED') ...[
                              Text(
                                property.trashExpiresAt == null
                                    ? t.propertyTrashedNoDate
                                    : t.propertyTrashedUntil(
                                        shortDate(property.trashExpiresAt!),
                                      ),
                              ),
                              const SizedBox(height: 16),
                              FilledButton(
                                onPressed: _busy
                                    ? null
                                    : property.canManage
                                    ? () => _change(property, 'restore')
                                    : () =>
                                          _locked(property, t.propertyRestore),
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
                                            ? t.propertyRestoreActive
                                            : t.propertyArchive,
                                      ),
                                child: Text(
                                  property.state == 'ARCHIVED'
                                      ? t.propertyRestoreActive
                                      : t.propertyArchive,
                                ),
                              ),
                              const SizedBox(height: 24),
                              Text(t.propertyDeleteBody),
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
                                    ? () => _locked(property, t.propertyDelete)
                                    : property.canDelete
                                    ? () => _change(property, 'trash')
                                    : null,
                                style: kiviloDangerOutlined,
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
                ? 'This affects ${_count(widget.property.counts['tenancies'], t.tenancy, t.tenancies)}, ${_count(widget.property.counts['inspections'], t.inspectionLabel, t.inspections)} and ${_count(widget.property.counts['photos'], t.photoWord, t.photosLabel)}. You have 30 days to restore them from Properties → Recently deleted.'
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
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(t.cancel),
        ),
        FilledButton(
          onPressed:
              deleting &&
                  _confirmation.text != widget.property.confirmationLabel
              ? null
              : () => Navigator.pop(context, _confirmation.text),
          style: deleting ? kiviloDangerFilled : null,
          child: Text(label),
        ),
      ],
    );
  }
}
