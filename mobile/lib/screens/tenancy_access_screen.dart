import 'package:flutter/material.dart';

import '../models/tenancy_access.dart';
import '../models/agency.dart';
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

  void _showError(Object error) {
    if (!mounted) return;
    setState(() {
      _error = plainError(error);
      if (error is ApiFailure &&
          const [401, 403, 404].contains(error.statusCode)) {
        // A fresh refusal supersedes the roster and controls previously loaded.
        _access = null;
      }
    });
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
      _showError(error);
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
      _showError(error);
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

  Future<void> _assignment(TenancyAccess access) async {
    if (_busy || _loading) return;
    final changes = await showKiviloDrawer<Map<String, dynamic>>(
      context: context,
      builder: (_) => _AssignmentDrawer(access: access),
    );
    if (!mounted || changes == null) return;
    await _applyAssignment(changes);
  }

  Future<void> _applyAssignment(Map<String, dynamic> changes) async {
    if (_busy || _loading) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final accessRemoved = await _api.assignTenancy(widget.tenancyId, changes);
      if (!mounted) return;
      if (accessRemoved) {
        Navigator.of(context).popUntil((route) => route.isFirst);
        return;
      }
      final access = await _api.tenancyAccess(widget.tenancyId);
      if (mounted) setState(() => _access = access);
    } catch (error) {
      _showError(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _moveToTeam() async {
    if (_busy || _loading) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    AgencyIndex? index;
    try {
      index = await _api.agencies();
    } catch (error) {
      _showError(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    if (!mounted || index == null) return;
    final agencyId = await showKiviloDrawer<String>(
      context: context,
      builder: (_) => _MoveToTeamDrawer(agencies: index!.agencies),
    );
    if (agencyId != null && mounted) {
      await _applyAssignment({'agencyId': agencyId});
    }
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
                        if (access.agency != null ||
                            access.canManageAssignment) ...[
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    access.agency?['name'] as String? ??
                                        'Personal tenancy',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    access.agency == null
                                        ? 'This work belongs to the lead agent. Moving it into a team gives its owners and managers access.'
                                        : 'Team owners and managers oversee this tenancy. Assigned agents and external collaborators can work on it.',
                                  ),
                                  if (access.canManageAssignment) ...[
                                    const SizedBox(height: 12),
                                    OutlinedButton(
                                      onPressed: disabled
                                          ? null
                                          : access.agency == null
                                          ? _moveToTeam
                                          : () => _assignment(access),
                                      child: Text(
                                        access.agency == null
                                            ? 'Move to team'
                                            : 'Assign team members',
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                        ],
                        Text(
                          access.label,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        if (access.visibility == 'PRIVATE' && access.agency == null) ...[
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
                                  access.agency == null ? 'Lead agent' : 'Responsible agent',
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
                          Text(
                            access.agency == null
                                ? 'Only the lead agent can add or remove collaborators.'
                                : 'The responsible agent and team managers can change access.',
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

class _AssignmentDrawer extends StatefulWidget {
  const _AssignmentDrawer({required this.access});
  final TenancyAccess access;
  @override
  State<_AssignmentDrawer> createState() => _AssignmentDrawerState();
}

class _AssignmentDrawerState extends State<_AssignmentDrawer> {
  late String? _lead = widget.access.leadAgent?.id;
  late final Set<String> _members = widget.access.collaborators
      .map((person) => person.stakeholderId)
      .where(
        (id) => widget.access.availableMembers.any((person) => person.id == id),
      )
      .toSet();
  final _search = TextEditingController();
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => KiviloDrawer(
    title: const Text('Assign team members'),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<String>(
          initialValue:
              widget.access.availableMembers.any((person) => person.id == _lead)
              ? _lead
              : null,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Responsible agent'),
          items: [
            for (final person in widget.access.availableMembers)
              DropdownMenuItem(value: person.id, child: Text(person.name)),
          ],
          onChanged: (value) => setState(() => _lead = value),
        ),
        const SizedBox(height: 12),
        const Text(
          'Changing the responsible agent hands over management without changing authorship or signed reports. External collaborators keep their existing access.',
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _search,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(labelText: 'Find a team member'),
        ),
        for (final person in widget.access.availableMembers.where(
          (person) => '${person.name} ${person.email ?? ''}'
              .toLowerCase()
              .contains(_search.text.trim().toLowerCase()),
        ))
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(person.name),
            subtitle: Text(
              person.id == _lead
                  ? 'Responsible agent'
                  : person.email ?? 'Team member',
            ),
            value: person.id == _lead || _members.contains(person.id),
            onChanged: person.id == _lead
                ? null
                : (selected) => setState(() {
                    if (selected == true) {
                      _members.add(person.id);
                    } else {
                      _members.remove(person.id);
                    }
                  }),
          ),
      ],
    ),
    actions: [
      OutlinedButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: _lead == null
            ? null
            : () => Navigator.pop(context, <String, dynamic>{
                'leadAgentId': _lead,
                'memberIds': _members.where((id) => id != _lead).toList(),
              }),
        child: const Text('Save assignment'),
      ),
    ],
  );
}

class _MoveToTeamDrawer extends StatefulWidget {
  const _MoveToTeamDrawer({required this.agencies});
  final List<AgencySummary> agencies;
  @override
  State<_MoveToTeamDrawer> createState() => _MoveToTeamDrawerState();
}

class _MoveToTeamDrawerState extends State<_MoveToTeamDrawer> {
  String? _agencyId;
  @override
  Widget build(BuildContext context) => KiviloDrawer(
    title: const Text('Move tenancy to team?'),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'This tenancy becomes team work. Owners and managers gain access and can reassign it. Existing collaborators, signed reports and authorship are preserved. Other personal tenancies stay personal.',
        ),
        const SizedBox(height: 16),
        if (widget.agencies.isEmpty)
          const Text('Create or join a team first in Account → Team.')
        else
          DropdownButtonFormField<String>(
            initialValue: _agencyId,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Team'),
            items: [
              for (final agency in widget.agencies)
                DropdownMenuItem(value: agency.id, child: Text(agency.name)),
            ],
            onChanged: (value) => setState(() => _agencyId = value),
          ),
      ],
    ),
    actions: [
      OutlinedButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: _agencyId == null
            ? null
            : () => Navigator.pop(context, _agencyId),
        child: const Text('Move to team'),
      ),
    ],
  );
}
