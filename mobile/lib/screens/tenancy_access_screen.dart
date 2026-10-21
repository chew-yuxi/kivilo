import 'package:flutter/material.dart';

import '../models/tenancy_access.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';

class TenancyAccessScreen extends StatefulWidget {
  const TenancyAccessScreen({
    super.key,
    required this.tenancyId,
    required this.property,
    this.api,
  });

  final String tenancyId;
  final String property;
  final Api? api;

  @override
  State<TenancyAccessScreen> createState() => _TenancyAccessScreenState();
}

class _TenancyAccessScreenState extends State<TenancyAccessScreen> {
  late final _api = widget.api ?? Api();
  final _email = TextEditingController();
  TenancyAccess? _access;
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (_busy) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final access = await _api.tenancyAccess(widget.tenancyId);
      if (mounted) setState(() => _access = access);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _change(
    Future<void> Function() operation, {
    bool clearEmail = false,
  }) async {
    if (_busy || _loading) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await operation();
      final access = await _api.tenancyAccess(widget.tenancyId);
      if (!mounted) return;
      setState(() {
        _access = access;
        if (clearEmail) _email.clear();
      });
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _remove(
    String stakeholderId,
    String name, {
    bool reportsOnly = false,
  }) async {
    if (_busy || _loading) return;
    final confirmed = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text('Remove $name?'),
        content: Text(
          reportsOnly
              ? 'They will lose access to their previous reports for this tenancy. '
                    'Work they have already saved stays on the property.'
              : 'They will lose access to this tenancy and its inspections, updates '
                    'and repairs. Work they have already saved stays on the property.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove access'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await _change(
      () => _api.removeTenancyCollaborator(widget.tenancyId, stakeholderId),
    );
  }

  @override
  Widget build(BuildContext context) {
    final access = _access;
    final disabled = _busy || _loading;
    return PopScope<void>(
      canPop: !_busy,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            access?.scope == 'INSPECTION'
                ? 'Access to previous reports'
                : 'Property access',
          ),
          leading: Navigator.canPop(context)
              ? IconButton(
                  onPressed: _busy ? null : () => Navigator.pop(context),
                  icon: const BackButtonIcon(),
                  tooltip: MaterialLocalizations.of(context).backButtonTooltip,
                )
              : null,
        ),
        body: KiviloContent(
          child: _loading && access == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 40),
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      Text(
                        widget.property,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        access?.scope == 'INSPECTION'
                            ? 'Your access covers previous reports you worked on. '
                                  'The lead agent can add you as a collaborator to '
                                  'work on this tenancy.'
                            : 'Collaborators can capture photos, edit inventory and '
                                  'manage repairs for this tenancy. This grants no access '
                                  'to other tenancies or properties.',
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                        if (access == null)
                          TextButton(
                            onPressed: disabled ? null : _load,
                            child: const Text('Try again'),
                          ),
                      ],
                      if (access != null) ...[
                        const SizedBox(height: 24),
                        Text(
                          access.label,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        if (access.visibility == 'PRIVATE') ...[
                          const SizedBox(height: 6),
                          const Text(
                            'Only the lead agent can work on this tenancy.',
                          ),
                        ],
                        const SizedBox(height: 12),
                        if (access.leadAgent case final lead?)
                          Card(
                            child: ListTile(
                              leading: const Icon(Icons.person_outline),
                              title: Text(lead.name),
                              subtitle: Text(
                                [
                                  'Lead agent',
                                  if (lead.email != null) lead.email!,
                                ].join(' · '),
                              ),
                            ),
                          ),
                        for (final person in access.collaborators)
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    person.name,
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleSmall,
                                  ),
                                  if (person.email != null) ...[
                                    const SizedBox(height: 4),
                                    Text(person.email!),
                                  ],
                                  const SizedBox(height: 4),
                                  const Text('Can work on this tenancy'),
                                  if (access.canManageAccess)
                                    Align(
                                      alignment: Alignment.centerLeft,
                                      child: TextButton(
                                        onPressed: disabled
                                            ? null
                                            : () => _remove(
                                                person.stakeholderId,
                                                person.name,
                                              ),
                                        child: const Text('Remove'),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        if (access.inspectionOnly.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          Text(
                            'Previous reports only',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'These agents keep access to reports they previously '
                            'worked on. They cannot work on the rest of this tenancy.',
                          ),
                          for (final person in access.inspectionOnly)
                            Card(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    Text(
                                      person.name,
                                      style: Theme.of(
                                        context,
                                      ).textTheme.titleSmall,
                                    ),
                                    if (person.email != null)
                                      Text(person.email!),
                                    Text(
                                      '${person.inspectionIds.length} previous '
                                      '${person.inspectionIds.length == 1 ? 'report' : 'reports'}',
                                    ),
                                    if (access.canManageAccess)
                                      Align(
                                        alignment: Alignment.centerLeft,
                                        child: TextButton(
                                          onPressed: disabled
                                              ? null
                                              : () => _remove(
                                                  person.stakeholderId,
                                                  person.name,
                                                  reportsOnly: true,
                                                ),
                                          child: const Text('Remove'),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                        const SizedBox(height: 24),
                        if (access.canManageAccess) ...[
                          Text(
                            'Add a collaborator',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'They can open the property after signing in to '
                            'Kivilo with this email address.',
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _email,
                            enabled: !disabled,
                            keyboardType: TextInputType.emailAddress,
                            textCapitalization: TextCapitalization.none,
                            autocorrect: false,
                            decoration: const InputDecoration(
                              labelText: 'Email address',
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: disabled || _email.text.trim().isEmpty
                                ? null
                                : () => _change(
                                    () => _api.addTenancyCollaborator(
                                      widget.tenancyId,
                                      _email.text.trim().toLowerCase(),
                                    ),
                                    clearEmail: true,
                                  ),
                            child: Text(_busy ? 'Saving…' : 'Add collaborator'),
                          ),
                        ] else
                          const Text(
                            'Only the lead agent can add or remove collaborators.',
                          ),
                        if (_loading || _busy) ...[
                          const SizedBox(height: 16),
                          const LinearProgressIndicator(),
                        ],
                      ],
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}
