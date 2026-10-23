import 'package:flutter/material.dart';

import '../models/agency.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import 'tenancy_access_screen.dart';

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key, this.api, this.selectWorkspace = false});
  final bool selectWorkspace;
  final Api? api;
  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  late final _api = widget.api ?? Api();
  late Loading<AgencyIndex> _loading = _api.load(_api.agencies);
  bool _busy = false;
  String? _error;

  Future<void> _refresh() async {
    final next = _api.load(_api.agencies, savedFirst: false);
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
      title: 'Create a team',
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
    appBar: AppBar(title: const Text('Team')),
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
                  'Work together',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Create or join a team, invite colleagues, then add properties in its workspace. Agents work on assignments; owners and managers oversee the team. Choose Personal for your own properties.',
                ),
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
                            'Invitation to ${invitation.agencyName}',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          Text(
                            '${agencyRoleLabel(invitation.role)} · Expires ${shortDate(invitation.expiresAt)}',
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Joining gives you a place in this team. Agents work on assigned tenancies; managers oversee team work.',
                          ),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: _busy
                                ? null
                                : () => _answer(invitation, true),
                            child: const Text('Join team'),
                          ),
                          const SizedBox(height: kiviloButtonGap),
                          OutlinedButton(
                            onPressed: _busy
                                ? null
                                : () => _answer(invitation, false),
                            child: const Text('Decline invitation'),
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
                        '${agencyRoleLabel(agency.role)} · ${agency.memberCount} members',
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: _busy ? null : () => _open(agency.id),
                    ),
                  ),
                  if (widget.selectWorkspace)
                    OutlinedButton(
                      onPressed: _busy
                          ? null
                          : () => Navigator.pop(context, agency.id),
                      child: Text('Open ${agency.name} workspace'),
                  ),
                ],
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: _busy ? null : _create,
                  icon: const Icon(Icons.add),
                  label: const Text('Create team'),
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
  late Loading<AgencyDetail> _loading = _api.load(() => _api.agency(widget.id));
  bool _busy = false;
  bool _leaving = false;
  String? _error;

  Future<void> _refresh() async {
    final next = _api.load(() => _api.agency(widget.id), savedFirst: false);
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

  /// An agent sees every team action; the ones they cannot take name who can.
  void _locked(AgencyDetail agency, String action, {bool ownersOnly = false}) =>
      showLockedAction(
        context,
        action: action,
        who: ownersOnly ? 'a team owner' : 'a team owner or manager',
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
      appBar: AppBar(title: const Text('Team members')),
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
                    Text(
                      '${agencyRoleLabel(agency.role)} · Agents see assigned tenancies. Owners and managers oversee the team portfolio.',
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
                  if (agency != null) ...[
                    const SizedBox(height: 20),
                    FilledButton.icon(
                      onPressed: _busy
                          ? null
                          : agency.canManage
                          ? _invite
                          : () => _locked(agency, 'Invite member'),
                      icon: const Icon(Icons.add),
                      label: const Text('Invite member'),
                    ),
                    const SizedBox(height: kiviloButtonGap),
                    OutlinedButton(
                      onPressed: _busy
                          ? null
                          : !agency.canManage
                          ? () => _locked(agency, 'Rename team')
                          : () async {
                              final name = await _nameDrawer(
                                context,
                                title: 'Rename team',
                                initial: agency.name,
                              );
                              if (name != null && mounted) {
                                await _change(
                                  () => _api.renameAgency(widget.id, name),
                                );
                              }
                            },
                      child: const Text('Rename team'),
                    ),
                    const SizedBox(height: kiviloSectionGap),
                    const KiviloSectionHeading(
                      title: 'Members and invitations',
                    ),
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
                                  ? 'Active'
                                  : member.status == 'INVITED'
                                  ? 'Invitation pending'
                                  : member.status.toLowerCase()}',
                              if (member.active)
                                '${member.assignedTenancies} assigned tenancies',
                              if (!member.active && member.expiresAt != null)
                                'Expires ${shortDate(member.expiresAt!)}',
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
                    const KiviloSectionHeading(title: 'Assigned work'),
                    const SizedBox(height: kiviloHeadingGap),
                    if (agency.tenancies.isEmpty)
                      const Text(
                        'No team properties yet. Open this team’s workspace and start a check-in. You can also move an existing personal tenancy from Property access.',
                      ),
                    for (final tenancy in agency.tenancies) ...[
                      Card(
                        child: ListTile(
                          title: Text(tenancy['property'] as String),
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
                      const KiviloSectionHeading(title: 'Recent activity'),
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

String _activityLabel(String action) =>
    action.toLowerCase().replaceAll('_', ' ');

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
      decoration: const InputDecoration(labelText: 'Team name'),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: _name.text.trim().isEmpty
            ? null
            : () => Navigator.pop(context, _name.text.trim()),
        child: const Text('Save'),
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
    title: const Text('Invite a colleague'),
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
          decoration: const InputDecoration(labelText: 'Email address'),
        ),
        const SizedBox(height: 16),
        KiviloSegmentedControl<String>(
          value: _role,
          options: const [
            KiviloSegmentOption(value: 'AGENT', label: 'Agent'),
            KiviloSegmentOption(value: 'MANAGER', label: 'Manager'),
          ],
          onChanged: (value) => setState(() => _role = value!),
        ),
        const SizedBox(height: 12),
        Text(
          _role == 'MANAGER'
              ? 'Managers can see team tenancies, assign work and manage members.'
              : 'Agents work on tenancies assigned to them. Other team records stay private.',
        ),
      ],
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: _email.text.trim().isEmpty
            ? null
            : () => Navigator.pop(context, (
                _email.text.trim().toLowerCase(),
                _role,
              )),
        child: const Text('Send invitation'),
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
            const Text(
              'This invitation has not been accepted. It gives no access to team work.',
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: canChange
                  ? () => Navigator.pop(context, <String, dynamic>{
                      'action': 'resend',
                    })
                  : null,
              child: const Text('Resend invitation'),
            ),
            const SizedBox(height: kiviloButtonGap),
            OutlinedButton(
              onPressed: canChange
                  ? () => Navigator.pop(context, <String, dynamic>{
                      'action': 'revoke',
                    })
                  : null,
              child: const Text('Revoke invitation'),
            ),
          ] else if (_removing) ...[
            Text(
              'Remove ${member.name} from ${widget.agency.name}? Their agency access will stop. Saved work and authorship stay intact; personal properties are unaffected.',
            ),
            if (member.assignedTenancies > 0) ...[
              const SizedBox(height: 16),
              Text(
                'Reassign ${member.assignedTenancies} tenancies before removing this member.',
              ),
              const SizedBox(height: 12),
              KiviloSelectField<String?>(
                label: 'New responsible agent',
                value: _replacement,
                options: [
                  const KiviloSelectOption<String?>(
                    value: null,
                    label: 'Choose a member',
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
            const Text(
              'Owners manage the team. Managers oversee its portfolio. Agents work on assigned tenancies.',
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: canChange
                  ? () => setState(() => _removing = true)
                  : null,
              style: kiviloDangerOutlined,
              child: const Text('Remove member'),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
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
            child: const Text('Remove member'),
          ),
        if (member.active && !_removing)
          FilledButton(
            onPressed: canChange && _role != member.role
                ? () => Navigator.pop(context, <String, dynamic>{'role': _role})
                : null,
            child: const Text('Save role'),
          ),
      ],
    );
  }
}
