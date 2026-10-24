import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';
import '../models/agency.dart';
import '../models/maintenance.dart';
import '../services/api.dart';
import '../services/product_events.dart';
import '../services/push_notifications.dart';
import '../services/saved_signature.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';
import 'branding_drawer.dart';
import 'team_screen.dart';
import '../ui/kivilo_layout.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({
    super.key,
    this.onStartCheckIn,
    this.trackView = true,
    this.api,
  });
  final Api? api;
  final bool trackView;

  /// Set for someone whose home shows only their own tenancies, so an agent who is also
  /// somebody's tenant can still start an inspection.
  final VoidCallback? onStartCheckIn;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final _api = widget.api ?? Api();
  // Each section loads from what this phone saved, then refreshes on its own; the
  // page itself never waits for any of them.
  late Loading<Map<String, dynamic>> _request = _api.load(
    _api.deletionRequest,
    retainKey: 'deletion-request',
  );
  late Loading<AgentBranding?> _branding = _api.load(
    _api.branding,
    retainKey: 'branding',
  );
  late final Loading<WorkspacePlan> _plan = _api.load(
    _api.plan,
    retainKey: 'plan',
  );
  late Loading<AgencyIndex> _teams = _api.load(
    _api.agencies,
    retainKey: 'agencies',
  );
  late final Future<String> _version = _readVersion();
  bool _busy = false;
  String? _error;

  /// What is on this phone, for support: the store build, and the Shorebird patch it is
  /// running. A build not made with `shorebird release` has no patch to report.
  Future<String> _readVersion() async {
    final (info, patch) = await (
      PackageInfo.fromPlatform(),
      ShorebirdUpdater().readCurrentPatch(),
    ).wait;
    final version = 'Version ${info.version} (${info.buildNumber})';
    return patch == null ? version : '$version · Patch ${patch.number}';
  }

  Future<void> _openPage(String path) async {
    final uri = Uri.parse(Config.apiBase).resolve(path);
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw StateError('Could not open $uri');
      }
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    }
  }

  Future<void> _refreshTeams() async {
    final next = _api.load(
      _api.agencies,
      savedFirst: false,
      retainKey: 'agencies',
    );
    setState(() => _teams = next);
    await next.fresh;
  }

  Future<void> _openTeam(String id) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => TeamDetailScreen(id: id, api: _api)),
    );
    if (mounted) await _refreshTeams();
  }

  Future<void> _openTeamDirectory() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => TeamScreen(api: _api)),
    );
    if (mounted) await _refreshTeams();
  }

  Future<void> _requestDeletion() async {
    final confirmed = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: const Text('Request account deletion?'),
        content: const Text(
          'We will confirm your request and complete eligible deletion within '
          '30 days. Inspection and report records may need to be retained under '
          'the applicable tenancy record retention policy.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: kiviloDangerFilled,
            child: const Text('Request deletion'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _api.requestDeletion();
      if (mounted) {
        setState(
          () => _request = _api.load(
            _api.deletionRequest,
            savedFirst: false,
            retainKey: 'deletion-request',
          ),
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _signOut() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (Config.isPushComplete) {
        try {
          await PushNotifications.instance.disableBeforeSignOut().timeout(
            const Duration(seconds: 5),
          );
        } catch (error) {
          // Push registration needs a connection, but a disconnected phone
          // must still be able to clear its local account session.
          debugPrint('Could not disable push before sign-out: $error');
        }
      }
      // While there is still a user to find it by.
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId != null) await SavedSignature(userId).forget();
      try {
        await Supabase.instance.client.auth.signOut().timeout(
          const Duration(seconds: 5),
        );
      } catch (error) {
        // Supabase clears the local session before attempting server revocation.
        // A failed remote request must not leave the person trapped in the app.
        if (Supabase.instance.client.auth.currentSession != null) rethrow;
        debugPrint('Remote sign-out could not be confirmed: $error');
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = 'Could not sign out. ${plainError(error)}');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _editBranding(AgentBranding? current) async {
    final profile = await _api.me();
    if (!mounted) return;
    final saved = await showKiviloDrawer<AgentBranding>(
      context: context,
      builder: (_) =>
          BrandingDrawer(api: _api, current: current, agentName: profile.name),
    );
    if (saved != null && mounted) {
      setState(
        () => _branding = _api.load(
          () async => saved,
          savedFirst: false,
          retainKey: 'branding',
        ),
      );
    }
  }

  Widget _brandingCard() => StreamBuilder<AgentBranding?>(
    stream: _branding.stream,
    builder: (context, snapshot) {
      if (snapshot.connectionState == ConnectionState.waiting) {
        return const Card(
          child: SizedBox(
            height: 72,
            child: Center(child: CircularProgressIndicator()),
          ),
        );
      }
      final branding = snapshot.data;
      final details = [
        if (branding?.agencyLicence != null)
          'Licence ${branding!.agencyLicence}',
        if (branding?.ceaRegistration != null)
          'CEA ${branding!.ceaRegistration}',
      ].join(' · ');
      return Card(
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 6,
          ),
          leading: Container(
            width: 44,
            height: 44,
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: KiviloColors.pinkSoft,
              borderRadius: BorderRadius.circular(12),
            ),
            child: branding?.logoUrl != null
                ? Image.network(branding!.logoUrl!, fit: BoxFit.contain)
                : const Icon(Icons.store_rounded, color: KiviloColors.pinkDark),
          ),
          title: Text(branding?.agencyName ?? 'Add your agency'),
          subtitle: Text(
            snapshot.hasError
                ? 'Could not load: ${snapshot.error}'
                : branding == null
                ? 'Your name and logo at the top of PDF reports'
                : details.isEmpty
                ? 'Shown on your PDF and shared reports'
                : details,
          ),
          trailing: const Icon(Icons.chevron_right, color: KiviloColors.subtle),
          onTap: snapshot.hasError ? null : () => _editBranding(branding),
        ),
      );
    },
  );

  Widget _teamsCard() => StreamBuilder<AgencyIndex>(
    stream: _teams.stream,
    builder: (context, snapshot) {
      final index = snapshot.data;
      final teams = index?.agencies ?? const <AgencySummary>[];
      return Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            for (var i = 0; i < teams.length; i++) ...[
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                leading: const Icon(Icons.person_outline),
                title: Text(teams[i].name),
                subtitle: Text(
                  '${agencyRoleLabel(teams[i].role)} · ${teams[i].memberCount} ${teams[i].memberCount == 1 ? 'member' : 'members'}',
                ),
                trailing: const Icon(Icons.chevron_right, color: KiviloColors.subtle),
                onTap: () => _openTeam(teams[i].id),
              ),
              const Divider(height: 1),
            ],
            ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              leading: const Icon(Icons.add),
              title: Text(teams.isEmpty ? 'Create or join a team' : 'Add another team'),
              subtitle: Text(
                snapshot.hasError
                    ? 'Could not load teams. Tap to try again.'
                    : index != null && index.invitations.isNotEmpty
                        ? '${index.invitations.length} pending ${index.invitations.length == 1 ? 'invitation' : 'invitations'}'
                        : 'Create a team or accept an invitation',
              ),
              trailing: snapshot.connectionState == ConnectionState.waiting
                  ? const SizedBox.square(
                      dimension: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.chevron_right, color: KiviloColors.subtle),
              onTap: _openTeamDirectory,
            ),
          ],
        ),
      );
    },
  );

  Widget _planCard() => StreamBuilder<WorkspacePlan>(
    stream: _plan.stream,
    builder: (context, snapshot) {
      final plan = snapshot.data;
      final noun = plan?.limit == 1 ? 'property' : 'properties';
      return Card(
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 6,
          ),
          leading: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: KiviloColors.pinkSoft,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.verified_outlined,
              color: KiviloColors.pinkDark,
            ),
          ),
          title: Text(
            plan == null
                ? 'Plan'
                : [
                    plan.pro ? 'Pro' : 'Free',
                    if (plan.team != null) plan.team!,
                  ].join(' · '),
          ),
          subtitle: Text(
            snapshot.hasError
                ? 'Could not load: ${plainError(snapshot.error!)}'
                : plan == null
                ? 'Loading'
                : '${plan.activeProperties} of ${plan.limit} active $noun in use',
          ),
        ),
      );
    },
  );

  @override
  Widget build(BuildContext context) => ProductScreen(
    screen: ProductScreenName.account,
    active: widget.trackView,
    child: Scaffold(
    // A tab under the big "Your account" title; pushed on its own it keeps a back button.
    appBar: ModalRoute.of(context)?.canPop == true ? AppBar() : null,
    body: SafeArea(
      bottom: false,
        child: KiviloContent(
          maxWidth: 720,
          child: StreamBuilder<Map<String, dynamic>>(
      stream: _request.stream,
      builder: (context, snapshot) {
        // The page shows at once; only the deletion section waits for its status.
        final checkingDeletion = !snapshot.hasData && !snapshot.hasError;
              final deletion =
                  snapshot.data?['request'] as Map<String, dynamic>?;
        return ListView(
          padding: kiviloScreenPadding,
          children: [
            Text(
              'Your account',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        color: KiviloColors.pinkSoft,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.person_outline,
                        color: KiviloColors.pinkDark,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Signed in to Kivilo',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium,
                          ),
                          const SizedBox(height: 3),
                          Text(
                                  Supabase
                                          .instance
                                          .client
                                          .auth
                                          .currentUser
                                          ?.email ??
                                '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (widget.onStartCheckIn != null) ...[
              const SizedBox(height: kiviloSectionGap),
              const KiviloSectionHeading(title: 'For agents'),
              const SizedBox(height: kiviloHeadingGap),
              _linkCard(
                icon: Icons.add_home_work_outlined,
                title: 'Start a check-in',
                subtitle: 'Write a room-by-room report of a property',
                onTap: widget.onStartCheckIn!,
              ),
            ],
            const SizedBox(height: kiviloSectionGap),
            const KiviloSectionHeading(title: 'Workspace'),
            const SizedBox(height: kiviloHeadingGap),
            _teamsCard(),
            const SizedBox(height: kiviloSectionGap),
            const KiviloSectionHeading(
              title: 'Personal report branding',
              subtitle: 'Used for properties outside your teams.',
            ),
            const SizedBox(height: kiviloHeadingGap),
            _brandingCard(),
            const SizedBox(height: kiviloSectionGap),
            const KiviloSectionHeading(
              title: 'Plan',
              subtitle: 'How many properties you can work at once.',
            ),
            const SizedBox(height: kiviloHeadingGap),
            _planCard(),
            const SizedBox(height: kiviloSectionGap),
            const KiviloSectionHeading(title: 'Privacy & support'),
            const SizedBox(height: kiviloHeadingGap),
            _linkCard(
              icon: Icons.privacy_tip_outlined,
              title: 'Privacy policy',
              subtitle: 'How Kivilo handles your data',
              onTap: () => _openPage('/privacy'),
            ),
            const SizedBox(height: 10),
            _linkCard(
              icon: Icons.help_outline,
              title: 'Help & support',
              subtitle: 'Get help with an inspection or your account',
              onTap: () => _openPage('/support'),
            ),
            const SizedBox(height: kiviloSectionGap),
            const KiviloSectionHeading(
              title: 'Your data',
              subtitle: 'Manage your account and deletion request.',
            ),
            const SizedBox(height: kiviloHeadingGap),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.delete_outline,
                          color: KiviloColors.body,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Account deletion',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'We aim to complete eligible deletion within 30 days of your request.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    if (deletion != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: KiviloColors.canvas,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Request ${_statusLabel(deletion['status'])}',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium,
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'Requested ${_shortDate(deletion['requestedAt'])} · Due ${_shortDate(deletion['dueAt'])}'
                              '${deletion['completedAt'] == null ? '' : ' · Completed ${_shortDate(deletion['completedAt'])}'}',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ] else if (checkingDeletion) ...[
                      const SizedBox(height: 16),
                      const LinearProgressIndicator(),
                    ] else ...[
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _busy ? null : _requestDeletion,
                        child: Text(
                          _busy ? 'Sending…' : 'Request account deletion',
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            if (snapshot.hasError)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        'Could not load your deletion request. ${plainError(snapshot.error!)}',
                      ),
              ),
            if (_error != null) ...[
              const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: const TextStyle(color: KiviloColors.red),
                    ),
            ],
            const SizedBox(height: 28),
            _linkCard(
              icon: Icons.logout,
              title: 'Sign out',
              subtitle: 'Your saved signature is removed from this phone',
              onTap: _busy ? null : _signOut,
            ),
            const SizedBox(height: 20),
            FutureBuilder<String>(
              future: _version,
              builder: (context, version) => Text(
                version.data ?? '',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        );
      },
          ),
        ),
    ),
  ),
  );

  Widget _linkCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback? onTap,
  }) => Card(
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: KiviloColors.pinkDark),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 3),
                  Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: KiviloColors.subtle),
          ],
        ),
      ),
    ),
  );

  String _shortDate(Object? value) {
    final date = DateTime.tryParse(value?.toString() ?? '');
    if (date == null) return 'unknown';
    final local = date.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }

  String _statusLabel(Object? value) => switch (value) {
    'COMPLETED' => 'completed',
    'PROCESSING' => 'in progress',
    _ => 'received',
  };
}
