import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../models/tenancy_access.dart';
import '../models/agency.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';

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
        title: Text(t.accessRemoveTitle(name)),
        content: Text(
          reportsOnly ? t.accessRemoveReportsBody : t.accessRemoveBody,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(t.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: kiviloDangerFilled,
            child: Text(t.accessRemove),
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

  /// Everyone working the tenancy sees its access actions; the ones they cannot take
  /// name who can.
  void _locked(TenancyAccess access, String action) => showLockedAction(
    context,
    action: action,
    who: access.agency == null
        ? t.theLeadAgent
        : t.theResponsibleAgentOrATeamOwner,
    askNames: access.askNames,
  );

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
                ? t.accessPreviousReports
                : t.tenancyPropertyAccess,
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
                    padding: kiviloScreenPadding,
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      Text(
                        widget.property,
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        access?.scope == 'INSPECTION'
                            ? t.accessReportsOnlyIntro
                            : t.accessIntro,
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          style: const TextStyle(color: KiviloColors.red),
                        ),
                        if (access == null) ...[
                          const SizedBox(height: kiviloButtonGap),
                          OutlinedButton(
                            onPressed: disabled ? null : _load,
                            child: Text(t.tryAgain),
                          ),
                        ],
                      ],
                      if (access != null) ...[
                        const SizedBox(height: 24),
                        if (access.agency != null ||
                            access.canManageAssignment ||
                            access.scope == 'TENANCY') ...[
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    access.agency?['name'] as String? ??
                                        t.propertyPersonalTenancy,
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    access.agency == null
                                        ? t.accessPersonalDetail
                                        : t.accessTeamDetail,
                                  ),
                                  if (access.canManageAssignment ||
                                      access.scope == 'TENANCY') ...[
                                    const SizedBox(height: 12),
                                    OutlinedButton(
                                      onPressed: disabled
                                          ? null
                                          : !access.canManageAssignment
                                          ? () => _locked(
                                              access,
                                              access.agency == null
                                                  ? t.accessMoveToTeam
                                                  : t.accessAssignMembers,
                                            )
                                          : access.agency == null
                                          ? _moveToTeam
                                          : () => _assignment(access),
                                      child: Text(
                                        access.agency == null
                                            ? t.accessMoveToTeam
                                            : t.accessAssignMembers,
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
                        if (access.visibility == 'PRIVATE' &&
                            access.agency == null) ...[
                          const SizedBox(height: 6),
                          Text(t.accessLeadOnly),
                        ],
                        const SizedBox(height: 12),
                        if (access.leadAgent case final lead?)
                          Card(
                            child: ListTile(
                              leading: const Icon(Icons.person_outline),
                              title: Text(lead.name),
                              subtitle: Text(
                                [
                                  access.agency == null
                                      ? t.accessLeadAgent
                                      : t.inspectionsResponsibleAgent,
                                  if (lead.email != null) lead.email!,
                                ].join(' · '),
                              ),
                            ),
                          ),
                        for (final person in access.collaborators) ...[
                          const SizedBox(height: kiviloButtonGap),
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
                                  Text(t.accessCanWork),
                                  if (access.canManageAccess ||
                                      access.scope == 'TENANCY') ...[
                                    const SizedBox(height: kiviloButtonGap),
                                    SizedBox(
                                      width: double.infinity,
                                      child: OutlinedButton(
                                        onPressed: disabled
                                            ? null
                                            : !access.canManageAccess
                                            ? () => _locked(
                                                access,
                                                'Remove ${person.name}',
                                              )
                                            : () => _remove(
                                                person.stakeholderId,
                                                person.name,
                                              ),
                                        style: kiviloDangerOutlined,
                                        child: Text(t.accessRemove),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        ],
                        if (access.inspectionOnly.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          Text(
                            t.accessPreviousReportsOnly,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          Text(t.accessPreviousReportsDetail),
                          for (final person in access.inspectionOnly) ...[
                            const SizedBox(height: kiviloButtonGap),
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
                                      t.accessPreviousReportCount(
                                        person.inspectionIds.length,
                                      ),
                                    ),
                                    if (access.canManageAccess ||
                                        access.scope == 'TENANCY') ...[
                                      const SizedBox(height: kiviloButtonGap),
                                      SizedBox(
                                        width: double.infinity,
                                        child: OutlinedButton(
                                          onPressed: disabled
                                              ? null
                                              : !access.canManageAccess
                                              ? () => _locked(
                                                  access,
                                                  'Remove ${person.name}',
                                                )
                                              : () => _remove(
                                                  person.stakeholderId,
                                                  person.name,
                                                  reportsOnly: true,
                                                ),
                                          style: kiviloDangerOutlined,
                                          child: Text(t.accessRemove),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ],
                        const SizedBox(height: 24),
                        if (access.canManageAccess) ...[
                          Text(
                            t.accessAddCollaboratorTitle,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          Text(t.accessAddCollaboratorDetail),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _email,
                            enabled: !disabled,
                            keyboardType: TextInputType.emailAddress,
                            textCapitalization: TextCapitalization.none,
                            autocorrect: false,
                            decoration: InputDecoration(
                              labelText: t.teamEmailAddress,
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
                            child: Text(
                              _busy ? t.saving : t.accessAddCollaborator,
                            ),
                          ),
                        ] else if (access.scope == 'TENANCY')
                          OutlinedButton(
                            onPressed: disabled
                                ? null
                                : () => _locked(
                                    access,
                                    t.accessAddCollaboratorTitle,
                                  ),
                            child: Text(t.accessAddCollaboratorTitle),
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
    title: Text(t.accessAssignMembers),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        KiviloSelectField<String?>(
          label: t.inspectionsResponsibleAgent,
          value:
              widget.access.availableMembers.any((person) => person.id == _lead)
              ? _lead
              : null,
          options: [
            KiviloSelectOption<String?>(value: null, label: t.teamChooseMember),
            for (final person in widget.access.availableMembers)
              KiviloSelectOption<String?>(value: person.id, label: person.name),
          ],
          onChanged: (value) => setState(() => _lead = value),
        ),
        const SizedBox(height: 12),
        Text(t.accessHandoverDetail),
        const SizedBox(height: 16),
        TextField(
          controller: _search,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(labelText: t.accessFindMember),
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
                  ? t.inspectionsResponsibleAgent
                  : person.email ?? t.accessTeamMember,
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
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: Text(t.cancel),
      ),
      FilledButton(
        onPressed: _lead == null
            ? null
            : () => Navigator.pop(context, <String, dynamic>{
                'leadAgentId': _lead,
                'memberIds': _members.where((id) => id != _lead).toList(),
              }),
        child: Text(t.accessSaveAssignment),
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
    title: Text(t.accessMoveTitle),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(t.accessMoveBody),
        const SizedBox(height: 16),
        if (widget.agencies.isEmpty)
          Text(t.accessCreateTeamFirst)
        else
          KiviloSelectField<String?>(
            label: t.settingsTeam,
            value: _agencyId,
            options: [
              KiviloSelectOption<String?>(
                value: null,
                label: t.accessChooseTeam,
              ),
              for (final agency in widget.agencies)
                KiviloSelectOption<String?>(
                  value: agency.id,
                  label: agency.name,
                ),
            ],
            onChanged: (value) => setState(() => _agencyId = value),
          ),
      ],
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: Text(t.cancel),
      ),
      FilledButton(
        onPressed: _agencyId == null
            ? null
            : () => Navigator.pop(context, _agencyId),
        child: Text(t.accessMoveToTeam),
      ),
    ],
  );
}
