import 'dart:async';

import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';
import '../models/agency.dart';
import '../l10n/l10n.dart';
import '../models/maintenance.dart';
import '../services/api.dart';
import '../services/product_events.dart';
import '../services/play_billing.dart';
import '../services/apple_billing.dart';
import '../services/store_billing.dart';
import '../services/push_notifications.dart';
import '../services/saved_signature.dart';
import '../ui/handover_guide.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_theme.dart';
import 'branding_drawer.dart';
import 'country_screen.dart';
import 'billing_screen.dart';
import 'team_screen.dart';
import '../ui/kivilo_layout.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({
    super.key,
    this.onStartCheckIn,
    this.trackView = true,
    this.api,
    this.onCountryChanged,
  });
  final Api? api;
  final bool trackView;

  /// Told when the agent changes where they work, so Home uses it at once.
  final ValueChanged<UserProfile>? onCountryChanged;

  /// Set for someone whose home shows only their own tenancies, so an agent who is also
  /// somebody's tenant can still start an inspection.
  final VoidCallback? onStartCheckIn;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen>
    with WidgetsBindingObserver {
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
  late Loading<WorkspacePlan> _plan = _api.load(_loadPlan, retainKey: 'plan');
  late Loading<AgencyIndex> _teams = _api.load(
    _api.agencies,
    retainKey: 'agencies',
  );
  late Loading<UserProfile> _profile = _api.load(_api.me, retainKey: 'me');
  late final Future<String> _version = _readVersion();
  bool _busy = false;
  String? _error;
  String? _signOutError;
  StreamSubscription<void>? _planChanges;
  StoreBilling? get _billing => AppleBilling.current ?? PlayBilling.current;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _planChanges = _billing?.planChanges.listen((_) => _refreshPlan());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_planChanges?.cancel());
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refreshPlan();
  }

  void _refreshPlan() {
    if (!mounted) return;
    setState(
      () => _plan = _api.load(_loadPlan, savedFirst: false, retainKey: 'plan'),
    );
  }

  Future<void> _openBilling() async {
    final billing = _billing;
    if (billing == null) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => BillingScreen(api: _api, billing: billing),
      ),
    );
    _refreshPlan();
  }

  Future<WorkspacePlan> _loadPlan() =>
      _billing != null ? _api.selectedWorkspacePlan() : _api.plan();

  /// What is on this phone, for support: the store build, and the Shorebird patch it is
  /// running. A build not made with `shorebird release` has no patch to report.
  Future<String> _readVersion() async {
    final (info, patch) = await (
      PackageInfo.fromPlatform(),
      ShorebirdUpdater().readCurrentPatch(),
    ).wait;
    final version = t.settingsVersion(info.version, info.buildNumber);
    return patch == null
        ? version
        : t.settingsVersionPatch(version, patch.number);
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
      MaterialPageRoute(
        builder: (_) => TeamDetailScreen(id: id, api: _api),
      ),
    );
    if (mounted) await _refreshTeams();
  }

  Future<void> _openTeamDirectory() async {
    await Navigator.of(
      context,
    ).push<void>(MaterialPageRoute(builder: (_) => TeamScreen(api: _api)));
    if (mounted) await _refreshTeams();
  }

  Future<void> _requestDeletion() async {
    final confirmed = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text(t.settingsDeletionDrawerTitle),
        content: Text(t.settingsDeletionDrawerBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(t.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: kiviloDangerFilled,
            child: Text(t.settingsRequestDeletion),
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
      _signOutError = null;
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
        setState(
          () => _signOutError = t.settingsSignOutFailed(plainError(error)),
        );
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
      builder: (_) => BrandingDrawer(
        api: _api,
        current: current,
        agentName: profile.name,
        country: profile.country,
      ),
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

  Future<void> _editCountry(String? current) async {
    final saved = await showKiviloDrawer<UserProfile>(
      context: context,
      builder: (_) => CountryDrawer(api: _api, current: current),
    );
    if (saved == null || !mounted) return;
    setState(
      () => _profile = _api.load(
        () async => saved,
        savedFirst: false,
        retainKey: 'me',
      ),
    );
    widget.onCountryChanged?.call(saved);
  }

  Widget _countryCard() => StreamBuilder<UserProfile>(
    stream: _profile.stream,
    builder: (context, snapshot) {
      final country = snapshot.data?.country;
      return Card(
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 6,
          ),
          leading: const Icon(Icons.flag_outlined),
          title: Text(t.whereYouWork),
          subtitle: Text(
            snapshot.hasError
                ? 'Could not load: ${plainError(snapshot.error!)}'
                : !snapshot.hasData
                ? t.loadingLabel
                : country == null
                ? t.notChosenYet
                : '${countryName(country)}. New properties are made here.',
          ),
          trailing: const Icon(Icons.chevron_right, color: KiviloColors.subtle),
          onTap: snapshot.hasData ? () => _editCountry(country) : null,
        ),
      );
    },
  );

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
      // The register is named for where the agent works.
      String details(String? country) => [
        if (branding?.agencyLicence != null)
          t.settingsLicence(branding!.agencyLicence!),
        if (branding?.ceaRegistration != null)
          '${registrationName(country)} ${branding!.ceaRegistration}',
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
          title: Text(branding?.agencyName ?? 'Set up report branding'),
          subtitle: StreamBuilder<UserProfile>(
            stream: _profile.stream,
            builder: (context, profile) => Text(
              snapshot.hasError
                  ? 'Could not load: ${snapshot.error}'
                  : branding == null
                  ? t.settingsBrandingEmpty
                  : details(profile.data?.country).isEmpty
                  ? t.settingsBrandingSet
                  : details(profile.data?.country),
            ),
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
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 6,
                ),
                leading: const Icon(Icons.person_outline),
                title: Text(teams[i].name),
                subtitle: Text(
                  '${agencyRoleLabel(teams[i].role)} · ${teams[i].memberCount} ${teams[i].memberCount == 1 ? t.member : t.members}',
                ),
                trailing: const Icon(
                  Icons.chevron_right,
                  color: KiviloColors.subtle,
                ),
                onTap: () => _openTeam(teams[i].id),
              ),
              const Divider(height: 1),
            ],
            ListTile(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 6,
              ),
              leading: const Icon(Icons.add),
              title: Text(
                teams.isEmpty ? t.createOrJoinTeam : t.addAnotherTeam,
              ),
              subtitle: Text(
                snapshot.hasError
                    ? t.couldNotLoadTeamsTapToTry
                    : index != null && index.invitations.isNotEmpty
                    ? '${index.invitations.length} pending ${index.invitations.length == 1 ? t.invitation : t.invitations}'
                    : t.createATeamOrAcceptAnInvitation,
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
                ? t.settingsPlan
                : [
                    plan.pro ? 'Pro' : t.planFree,
                    if (plan.team != null)
                      plan.team!
                    else if (_billing != null)
                      t.workspacePersonal,
                  ].join(' · '),
          ),
          subtitle: Text(
            snapshot.hasError
                ? t.couldNotLoad(plainError(snapshot.error!))
                : plan == null
                ? t.loading
                : t.settingsPlanUsage(plan.activeProperties, plan.limit),
          ),
          trailing: _billing != null ? const Icon(Icons.chevron_right) : null,
          onTap: _billing != null ? _openBilling : null,
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
                    t.settingsYourAccount,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 16),
                  // Who is signed in, and the way out, together at the top.
                  Card(
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      children: [
                        Padding(
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
                                      t.settingsSignedIn,
                                      style: Theme.of(
                                        context,
                                      ).textTheme.titleMedium,
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
                                      style: Theme.of(
                                        context,
                                      ).textTheme.bodySmall,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Divider(height: 1),
                        ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 6,
                          ),
                          leading: const Icon(Icons.logout),
                          title: Text(t.signOut),
                          subtitle: Text(t.settingsSignOutDetail),
                          onTap: _busy ? null : _signOut,
                        ),
                        if (_signOutError != null)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                            child: Text(
                              _signOutError!,
                              style: const TextStyle(color: KiviloColors.red),
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (widget.onStartCheckIn != null) ...[
                    const SizedBox(height: kiviloSectionGap),
                    KiviloSectionHeading(title: t.settingsForAgents),
                    const SizedBox(height: kiviloHeadingGap),
                    _linkCard(
                      icon: Icons.add_home_work_outlined,
                      title: t.settingsStartCheckIn,
                      subtitle: t.settingsStartCheckInDetail,
                      onTap: widget.onStartCheckIn!,
                    ),
                  ],
                  const SizedBox(height: kiviloSectionGap),
                  KiviloSectionHeading(title: t.settingsWorkspace),
                  const SizedBox(height: kiviloHeadingGap),
                  _countryCard(),
                  const SizedBox(height: kiviloButtonGap),
                  _teamsCard(),
                  const SizedBox(height: kiviloSectionGap),
                  KiviloSectionHeading(
                    title: t.personalReportBranding,
                    subtitle: t.usedForPropertiesOutsideYourTeams,
                  ),
                  const SizedBox(height: kiviloHeadingGap),
                  _brandingCard(),
                  const SizedBox(height: kiviloSectionGap),
                  KiviloSectionHeading(
                    title: t.settingsPlan,
                    subtitle: t.yourActivePropertyAllowance,
                  ),
                  const SizedBox(height: kiviloHeadingGap),
                  _planCard(),
                  const SizedBox(height: kiviloSectionGap),
                  KiviloSectionHeading(title: t.settingsPrivacySupport),
                  const SizedBox(height: kiviloHeadingGap),
                  _linkCard(
                    icon: Icons.info_outline,
                    title: t.howAHandoverWorks,
                    subtitle: t.captureWriteTheInventoryThenSign,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => Scaffold(
                          appBar: AppBar(title: Text(t.howAHandoverWorks)),
                          body: const SingleChildScrollView(
                            padding: kiviloScreenPadding,
                            child: HandoverGuide(),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  _linkCard(
                    icon: Icons.privacy_tip_outlined,
                    title: t.settingsPrivacyPolicy,
                    subtitle: t.settingsPrivacyPolicyDetail,
                    onTap: () => _openPage('/privacy'),
                  ),
                  const SizedBox(height: 10),
                  _linkCard(
                    icon: Icons.description_outlined,
                    title: t.termsOfService,
                    subtitle: t.theTermsForUsingKivilo,
                    onTap: () => _openPage('/terms'),
                  ),
                  const SizedBox(height: 10),
                  _linkCard(
                    icon: Icons.help_outline,
                    title: t.settingsHelp,
                    subtitle: t.settingsHelpDetail,
                    onTap: () => _openPage('/support'),
                  ),
                  const SizedBox(height: kiviloSectionGap),
                  KiviloSectionHeading(
                    title: t.settingsYourData,
                    subtitle: t.settingsYourDataDetail,
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
                                t.settingsAccountDeletion,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            t.settingsDeletionAim,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          if (AppleBilling.supported) ...[
                            const SizedBox(height: kiviloHeadingGap),
                            Text(t.anAppleSubscriptionContinuesUntilYouCancel),
                            const SizedBox(height: kiviloButtonGap),
                            TextButton(
                              onPressed: () => _openPage(
                                'https://apps.apple.com/account/subscriptions',
                              ),
                              child: Text(t.manageAppStoreSubscriptions),
                            ),
                          ],
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
                                    _statusLabel(deletion['status']),
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    deletion['completedAt'] == null
                                        ? t.settingsDeletionDates(
                                            _shortDate(deletion['requestedAt']),
                                            _shortDate(deletion['dueAt']),
                                          )
                                        : t.settingsDeletionDatesCompleted(
                                            _shortDate(deletion['requestedAt']),
                                            _shortDate(deletion['dueAt']),
                                            _shortDate(deletion['completedAt']),
                                          ),
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodySmall,
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
                                _busy
                                    ? t.sending
                                    : t.settingsRequestAccountDeletion,
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
                        t.settingsDeletionLoadFailed(
                          plainError(snapshot.error!),
                        ),
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
    if (date == null) return t.unknown;
    final local = date.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }

  String _statusLabel(Object? value) => switch (value) {
    'COMPLETED' => t.settingsDeletionCompleted,
    'PROCESSING' => t.settingsDeletionInProgress,
    _ => t.settingsDeletionReceived,
  };
}
