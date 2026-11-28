import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../models/agency.dart';
import '../models/maintenance.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import 'tenancy_access_screen.dart';
import 'branding_drawer.dart';

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key, this.api, this.selectWorkspace = false});
  final bool selectWorkspace;
  final Api? api;
  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  late final _api = widget.api ?? Api();
  late Loading<AgencyIndex> _loading = _api.load(
    _api.agencies,
    retainKey: 'agencies',
  );
  bool _busy = false;
  String? _error;

  Future<void> _refresh() async {
    final next = _api.load(
      _api.agencies,
      savedFirst: false,
      retainKey: 'agencies',
    );
    setState(() {
      _loading = next;
    });
    await next.fresh;
  }

  Future<void> _answer(AgencyInvitation invitation, bool accept) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _api.answerAgencyInvitation(
        invitation.agencyId,
        invitation.id,
        accept: accept,
      );
      await _refresh();
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _create() async {
    final name = await _nameDrawer(
      context,
      title: t.teamCreateTitle,
      initial: '',
    );
    if (!mounted || name == null || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final agency = await _api.createAgency(name);
      if (!mounted) return;
      await _open(agency.id);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _open(String id) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => TeamDetailScreen(id: id, api: _api),
      ),
    );
    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(t.settingsTeam)),
    body: KiviloContent(
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: StreamBuilder<AgencyIndex>(
          stream: _loading.stream,
          builder: (context, snapshot) {
            if (!snapshot.hasData && !snapshot.hasError) {
              return const Center(child: CircularProgressIndicator());
            }
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: kiviloScreenPadding,
              children: [
                Text(
                  t.teamWorkTogether,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                Text(t.teamIntro),
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
                for (final invitation
                    in snapshot.data?.invitations ?? <AgencyInvitation>[]) ...[
                  const SizedBox(height: 20),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            t.teamInvitationTo(invitation.agencyName),
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          Text(
                            t.teamInvitationRole(
                              agencyRoleLabel(invitation.role),
                              shortDate(invitation.expiresAt),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(t.teamJoinDetail),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: _busy
                                ? null
                                : () => _answer(invitation, true),
                            child: Text(t.teamJoin),
                          ),
                          const SizedBox(height: kiviloButtonGap),
                          OutlinedButton(
                            onPressed: _busy
                                ? null
                                : () => _answer(invitation, false),
                            child: Text(t.teamDecline),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                for (final agency
                    in snapshot.data?.agencies ?? <AgencySummary>[]) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(16),
                      leading: const Icon(Icons.person_outline),
                      title: Text(agency.name),
                      subtitle: Text(
                        '${agencyRoleLabel(agency.role)} · ${agency.memberCount} ${agency.memberCount == 1 ? t.member : t.members}',
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: _busy
                          ? null
                          : widget.selectWorkspace
                          ? () => Navigator.pop(context, agency.id)
                          : () => _open(agency.id),
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: _busy ? null : _create,
                  icon: const Icon(Icons.add),
                  label: Text(t.teamCreate),
                ),
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
  );
}

class TeamDetailScreen extends StatefulWidget {
  const TeamDetailScreen({super.key, required this.id, this.api});
  final String id;
  final Api? api;
  @override
  State<TeamDetailScreen> createState() => _TeamDetailScreenState();
}

class _TeamDetailScreenState extends State<TeamDetailScreen> {
  late final _api = widget.api ?? Api();
  late Loading<AgencyDetail> _loading = _api.load(
    () => _api.agency(widget.id),
    retainKey: 'agency:${widget.id}',
  );
  bool _busy = false;
  bool _leaving = false;
  String? _error;

  Future<void> _refresh() async {
    final next = _api.load(
      () => _api.agency(widget.id),
      savedFirst: false,
      retainKey: 'agency:${widget.id}',
    );
    setState(() {
      _loading = next;
    });
    await next.fresh;
  }

  Future<void> _change(Future<void> Function() operation) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await operation();
      if (mounted && !_leaving) await _refresh();
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _invite() async {
    final invitation = await showKiviloDrawer<(String, String)>(
      context: context,
      builder: (_) => const _InviteDrawer(),
    );
    if (invitation == null || !mounted) return;
    await _change(
      () => _api.inviteAgencyMember(widget.id, invitation.$1, invitation.$2),
    );
  }

  Future<void> _editBranding(AgencyDetail agency) async {
    if (!agency.canManage) {
      _locked(agency, t.editReportBranding);
      return;
    }
    // Names the register the responsible agent's number is on.
    final profile = await _api.me();
    if (!mounted) return;
    final saved = await showKiviloDrawer<AgentBranding>(
      context: context,
      builder: (_) => BrandingDrawer(
        api: _api,
        current: agency.branding,
        teamId: agency.id,
        teamName: agency.name,
        country: profile.country,
      ),
    );
    if (saved != null && mounted) await _refresh();
  }

  Future<void> _rename(AgencyDetail agency) async {
    if (!agency.canManage) {
      _locked(agency, t.teamRename);
      return;
    }
    final name = await _nameDrawer(
      context,
      title: t.teamRename,
      initial: agency.name,
    );
    if (name != null && mounted && name != agency.name) {
      await _change(() => _api.renameAgency(widget.id, name));
    }
  }

  /// An agent sees every team action; the ones they cannot take name who can.
  void _locked(AgencyDetail agency, String action, {bool ownersOnly = false}) =>
      showLockedAction(
        context,
        action: action,
        who: ownersOnly ? t.aTeamOwner : t.aTeamOwnerOrManager,
        askNames: [
          for (final member in agency.members)
            if (member.active &&
                (ownersOnly
                    ? member.role == 'OWNER'
                    : member.role == 'OWNER' || member.role == 'MANAGER'))
              member.name,
        ],
      );

  Future<void> _manage(AgencyDetail agency, AgencyMember member) async {
    final change = await showKiviloDrawer<Map<String, dynamic>>(
      context: context,
      builder: (_) => _MemberDrawer(agency: agency, member: member),
    );
    if (change == null || !mounted) return;
    await _change(() async {
      final accessRemoved = await _api.changeAgencyMember(
        widget.id,
        member.id,
        change,
      );
      if (accessRemoved && mounted) {
        _leaving = true;
        Navigator.of(context).pop();
      }
    });
  }

  @override
  Widget build(BuildContext context) => PopScope<void>(
    canPop: !_busy,
    child: Scaffold(
      appBar: AppBar(title: Text(t.settingsTeam)),
      body: KiviloContent(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: StreamBuilder<AgencyDetail>(
            stream: _loading.stream,
            builder: (context, snapshot) {
              final agency = snapshot.data;
              if (agency == null && !snapshot.hasError) {
                return const Center(child: CircularProgressIndicator());
              }
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: kiviloScreenPadding,
                children: [
                  if (agency != null) ...[
                    Text(
                      agency.name,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(t.teamRoleSummary(agencyRoleLabel(agency.role))),
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
                  if (agency != null) ...[
                    const SizedBox(height: 20),
                    KiviloSectionHeading(title: t.teamDetails),
                    const SizedBox(height: kiviloHeadingGap),
                    Card(
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 6,
                        ),
                        title: Text(t.teamName),
                        subtitle: Text(agency.name),
                        trailing: TextButton(
                          key: const Key('edit-team-name'),
                          onPressed: _busy ? null : () => _rename(agency),
                          child: Text(t.edit),
                        ),
                        onTap: _busy ? null : () => _rename(agency),
                      ),
                    ),
                    const SizedBox(height: kiviloSectionGap),
                    KiviloSectionHeading(
                      title: t.settingsBranding,
                      subtitle: t.theTeamIdentityShownOnItsReports,
                    ),
                    const SizedBox(height: kiviloHeadingGap),
                    Card(
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 6,
                        ),
                        leading: SizedBox.square(
                          dimension: 44,
                          child: agency.branding.logoUrl == null
                              ? const Icon(Icons.store_rounded)
                              : Image.network(
                                  agency.branding.logoUrl!,
                                  fit: BoxFit.contain,
                                ),
                        ),
                        title: Text(agency.name),
                        subtitle: Text(
                          agency.branding.agencyLicence == null
                              ? t.addAgencyLicenceAndLogo
                              : 'Licence ${agency.branding.agencyLicence}',
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: _busy ? null : () => _editBranding(agency),
                      ),
                    ),
                    const SizedBox(height: kiviloSectionGap),
                    FilledButton.icon(
                      onPressed: _busy
                          ? null
                          : agency.canManage
                          ? _invite
                          : () => _locked(agency, t.teamInviteMember),
                      icon: const Icon(Icons.add),
                      label: Text(t.teamInviteMember),
                    ),
                    const SizedBox(height: kiviloSectionGap),
                    KiviloSectionHeading(title: t.teamMembersAndInvitations),
                    const SizedBox(height: kiviloHeadingGap),
                    for (final member in agency.members) ...[
                      Card(
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          title: Text(member.name),
                          subtitle: Text(
                            [
                              if (member.email != null) member.email!,
                              '${agencyRoleLabel(member.role)} · ${member.active
                                  ? t.teamMemberActive
                                  : member.status == 'INVITED'
                                  ? t.teamInvitationPending
                                  : t.teamMemberRemoved}',
                              if (member.active)
                                '${member.assignedTenancies} assigned ${member.assignedTenancies == 1 ? t.tenancy : t.tenancies}',
                              if (!member.active && member.expiresAt != null)
                                t.teamExpires(shortDate(member.expiresAt!)),
                            ].join('\n'),
                          ),
                          trailing: member.status != 'REMOVED'
                              ? const Icon(Icons.chevron_right)
                              : null,
                          onTap: member.status == 'REMOVED' || _busy
                              ? null
                              : agency.canManage
                              ? () => _manage(agency, member)
                              : () => _locked(
                                  agency,
                                  'Manage ${member.name}',
                                  ownersOnly: member.role == 'OWNER',
                                ),
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],
                    const SizedBox(height: kiviloSectionGap),
                    KiviloSectionHeading(title: t.propertyAssignments),
                    const SizedBox(height: kiviloHeadingGap),
                    if (agency.tenancies.isEmpty) Text(t.teamNoProperties),
                    for (final tenancy in agency.tenancies) ...[
                      Card(
                        child: ListTile(
                          title: Text(tenancy['property'] as String),
                          subtitle: Text(
                            'Manage assignment · ${tenancy['leadAgentName']}',
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: _busy
                              ? null
                              : () async {
                                  await Navigator.of(context).push<void>(
                                    MaterialPageRoute(
                                      builder: (_) => TenancyAccessScreen(
                                        tenancyId: tenancy['id'] as String,
                                        property: tenancy['property'] as String,
                                        api: _api,
                                      ),
                                    ),
                                  );
                                  if (mounted) await _refresh();
                                },
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    if (agency.activity.isNotEmpty) ...[
                      const SizedBox(height: kiviloSectionGap),
                      KiviloSectionHeading(title: t.teamRecentActivity),
                      const SizedBox(height: kiviloHeadingGap),
                      for (final event in agency.activity)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            '${event['actorName']} · ${_activityLabel(event['action'] as String)}',
                          ),
                          subtitle: Text(
                            [
                              if (event['subjectName'] != null)
                                event['subjectName'] as String,
                              shortDate(event['createdAt'] as String),
                            ].join(' · '),
                          ),
                        ),
                    ],
                  ],
                  if (_busy) ...[
                    const SizedBox(height: 12),
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

/// The server stores each event as an English phrase, or a code for property changes.
String _activityLabel(String action) => switch (action) {
  'Created team' => t.activityCreatedTeam,
  'Invited member' => t.activityInvitedMember,
  'Resent invitation' => t.activityResentInvitation,
  'Revoked invitation' => t.activityRevokedInvitation,
  'Removed member' => t.activityRemovedMember,
  'Renamed team' => t.activityRenamedTeam,
  'Joined team' => t.activityJoinedTeam,
  'Declined invitation' => t.activityDeclinedInvitation,
  'Reassigned departing member’s properties' => t.activityReassigned,
  'Changed property assignments' => t.activityChangedAssignments,
  'Added property to team' => t.activityAddedProperty,
  'Added property collaborator' => t.activityAddedCollaborator,
  'Removed property collaborator' => t.activityRemovedCollaborator,
  'PROPERTY_ARCHIVE' => t.activityPropertyArchive,
  'PROPERTY_UNARCHIVE' => t.activityPropertyUnarchive,
  'PROPERTY_TRASH' => t.activityPropertyTrash,
  'PROPERTY_RESTORE' => t.activityPropertyRestore,
  _ when action.startsWith('Changed role to ') => t.activityChangedRole(
    agencyRoleLabel(action.substring('Changed role to '.length).toUpperCase()),
  ),
  _ => action.toLowerCase().replaceAll('_', ' '),
};

Future<String?> _nameDrawer(
  BuildContext context, {
  required String title,
  required String initial,
}) => showKiviloDrawer<String>(
  context: context,
  builder: (_) => _TeamNameDrawer(title: title, initial: initial),
);

class _TeamNameDrawer extends StatefulWidget {
  const _TeamNameDrawer({required this.title, required this.initial});
  final String title;
  final String initial;
  @override
  State<_TeamNameDrawer> createState() => _TeamNameDrawerState();
}

class _TeamNameDrawerState extends State<_TeamNameDrawer> {
  late final _name = TextEditingController(text: widget.initial);
  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => KiviloDrawer(
    title: Text(widget.title),
    content: TextField(
      controller: _name,
      autofocus: true,
      maxLength: 100,
      textCapitalization: TextCapitalization.words,
      onChanged: (_) => setState(() {}),
      decoration: InputDecoration(labelText: t.teamName),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: Text(t.cancel),
      ),
      FilledButton(
        onPressed: _name.text.trim().isEmpty
            ? null
            : () => Navigator.pop(context, _name.text.trim()),
        child: Text(t.save),
      ),
    ],
  );
}

class _InviteDrawer extends StatefulWidget {
  const _InviteDrawer();
  @override
  State<_InviteDrawer> createState() => _InviteDrawerState();
}

class _InviteDrawerState extends State<_InviteDrawer> {
  final _email = TextEditingController();
  String _role = 'AGENT';
  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => KiviloDrawer(
    title: Text(t.teamInviteColleague),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          textCapitalization: TextCapitalization.none,
          autocorrect: false,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(labelText: t.teamEmailAddress),
        ),
        const SizedBox(height: 16),
        KiviloSegmentedControl<String>(
          value: _role,
          options: [
            KiviloSegmentOption(value: 'AGENT', label: t.agent),
            KiviloSegmentOption(value: 'MANAGER', label: t.roleManager),
          ],
          onChanged: (value) => setState(() => _role = value!),
        ),
        const SizedBox(height: 12),
        Text(_role == 'MANAGER' ? t.teamManagerDetail : t.teamAgentDetail),
      ],
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: Text(t.cancel),
      ),
      FilledButton(
        onPressed: _email.text.trim().isEmpty
            ? null
            : () => Navigator.pop(context, (
                _email.text.trim().toLowerCase(),
                _role,
              )),
        child: Text(t.teamSendInvitation),
      ),
    ],
  );
}

class _MemberDrawer extends StatefulWidget {
  const _MemberDrawer({required this.agency, required this.member});
  final AgencyDetail agency;
  final AgencyMember member;
  @override
  State<_MemberDrawer> createState() => _MemberDrawerState();
}

class _MemberDrawerState extends State<_MemberDrawer> {
  late String _role = widget.member.role;
  String? _replacement;
  bool _removing = false;
  @override
  Widget build(BuildContext context) {
    final member = widget.member;
    final canChange = widget.agency.role == 'OWNER' || member.role != 'OWNER';
    return KiviloDrawer(
      title: Text(member.name),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (member.email != null) Text(member.email!),
          const SizedBox(height: 16),
          if (!member.active) ...[
            Text(t.teamInvitationNotAccepted),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: canChange
                  ? () => Navigator.pop(context, <String, dynamic>{
                      'action': 'resend',
                    })
                  : null,
              child: Text(t.teamResendInvitation),
            ),
            const SizedBox(height: kiviloButtonGap),
            OutlinedButton(
              onPressed: canChange
                  ? () => Navigator.pop(context, <String, dynamic>{
                      'action': 'revoke',
                    })
                  : null,
              style: kiviloDangerOutlined,
              child: Text(t.teamRevokeInvitation),
            ),
          ] else if (_removing) ...[
            Text(t.teamRemoveConfirm(member.name, widget.agency.name)),
            if (member.assignedTenancies > 0) ...[
              const SizedBox(height: 16),
              Text(
                'Reassign ${member.assignedTenancies} ${member.assignedTenancies == 1 ? t.tenancy : t.tenancies} before removing this member.',
              ),
              const SizedBox(height: 12),
              KiviloSelectField<String?>(
                label: t.teamNewResponsibleAgent,
                value: _replacement,
                options: [
                  KiviloSelectOption<String?>(
                    value: null,
                    label: t.teamChooseMember,
                  ),
                  for (final person in widget.agency.members.where(
                    (person) => person.active && person.id != member.id,
                  ))
                    KiviloSelectOption<String?>(
                      value: person.stakeholderId,
                      label: person.name,
                    ),
                ],
                onChanged: (value) => setState(() => _replacement = value),
              ),
            ],
          ] else ...[
            KiviloSegmentedControl<String>(
              value: _role,
              options: [
                for (final role in [
                  'AGENT',
                  'MANAGER',
                  if (widget.agency.role == 'OWNER' || member.role == 'OWNER')
                    'OWNER',
                ])
                  KiviloSegmentOption(
                    value: role,
                    label: agencyRoleLabel(role),
                  ),
              ],
              onChanged: canChange
                  ? (value) => setState(() => _role = value!)
                  : null,
            ),
            const SizedBox(height: 12),
            Text(t.teamRolesExplained),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: canChange
                  ? () => setState(() => _removing = true)
                  : null,
              style: kiviloDangerOutlined,
              child: Text(t.teamRemoveMember),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(t.cancel),
        ),
        if (member.active && _removing)
          FilledButton(
            onPressed: member.assignedTenancies > 0 && _replacement == null
                ? null
                : () => Navigator.pop(context, <String, dynamic>{
                    'action': 'remove',
                    'reassignToId': ?_replacement,
                  }),
            style: kiviloDangerFilled,
            child: Text(t.teamRemoveMember),
          ),
        if (member.active && !_removing)
          FilledButton(
            onPressed: canChange && _role != member.role
                ? () => Navigator.pop(context, <String, dynamic>{'role': _role})
                : null,
            child: Text(t.teamSaveRole),
          ),
      ],
    );
  }
}
