import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';
import '../l10n/l10n.dart';
import '../models/maintenance.dart';
import '../services/api.dart';
import '../services/product_events.dart';
import '../services/push_notifications.dart';
import '../services/saved_signature.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';
import 'branding_drawer.dart';
import 'team_screen.dart';
import 'property_settings_screen.dart';
import '../ui/kivilo_layout.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, this.onStartCheckIn, this.trackView = true, this.api});
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
  late Future<Map<String, dynamic>> _request = _api.deletionRequest();
  late Future<AgentBranding?> _branding = _api.branding();
  late final Future<WorkspacePlan> _plan = _api.plan();
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
    final version = t.settingsVersion(info.version, info.buildNumber);
    return patch == null ? version : t.settingsVersionPatch(version, patch.number);
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

  Future<void> _requestDeletion() async {
    final confirmed = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text(t.settingsDeletionDrawerTitle),
        content: Text(
          t.settingsDeletionDrawerBody,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(t.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
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
      if (mounted) setState(() => _request = _api.deletionRequest());
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
      if (mounted) setState(() => _error = t.settingsSignOutFailed(plainError(error)));
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
      setState(() => _branding = Future.value(saved));
    }
  }

  Widget _brandingCard() => FutureBuilder<AgentBranding?>(
    future: _branding,
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
          t.settingsLicence(branding!.agencyLicence!),
        if (branding?.ceaRegistration != null)
          t.settingsCea(branding!.ceaRegistration!),
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
                : const Icon(
                    Icons.store_rounded,
                    color: KiviloColors.pinkDark,
                  ),
          ),
          title: Text(branding?.agencyName ?? t.settingsAddAgency),
          subtitle: Text(
            snapshot.hasError
                ? t.couldNotLoad('${snapshot.error}')
                : branding == null
                ? t.settingsBrandingEmpty
                : details.isEmpty
                ? t.settingsBrandingSet
                : details,
          ),
          trailing: const Icon(Icons.chevron_right, color: KiviloColors.subtle),
          onTap: snapshot.hasError ? null : () => _editBranding(branding),
        ),
      );
    },
  );

  Widget _planCard() => FutureBuilder<WorkspacePlan>(
    future: _plan,
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
                    if (plan.team != null) plan.team!,
                  ].join(' · '),
          ),
          subtitle: Text(
            snapshot.hasError
                ? t.couldNotLoad(plainError(snapshot.error!))
                : plan == null
                ? t.loading
                : t.settingsPlanUsage(plan.activeProperties, plan.limit),
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
    appBar: AppBar(title: Text(t.settingsAccount)),
    body: KiviloContent(maxWidth: 720, child: FutureBuilder<Map<String, dynamic>>(
      future: _request,
      builder: (context, snapshot) {
        if (!snapshot.hasData && !snapshot.hasError) {
          return const Center(child: CircularProgressIndicator());
        }
        final deletion = snapshot.data?['request'] as Map<String, dynamic>?;
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 36),
          children: [
            Text(
              t.settingsYourAccount,
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
                            t.settingsSignedIn,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 3),
                          Text(
                            Supabase.instance.client.auth.currentUser?.email ??
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
              const SizedBox(height: 28),
              KiviloSectionHeading(title: t.settingsForAgents),
              const SizedBox(height: 12),
              _linkCard(
                icon: Icons.add_home_work_outlined,
                title: t.settingsStartCheckIn,
                subtitle: t.settingsStartCheckInDetail,
                onTap: widget.onStartCheckIn!,
              ),
            ],
            const SizedBox(height: 28),
            KiviloSectionHeading(title: t.settingsWorkspace),
            const SizedBox(height: 12),
            _linkCard(
              icon: Icons.person_outline,
              title: t.settingsTeam,
              subtitle: t.settingsTeamDetail,
              onTap: () => Navigator.of(context).push<void>(
                MaterialPageRoute(builder: (_) => TeamScreen(api: _api)),
              ),
            ),
            const SizedBox(height: 10),
            _linkCard(
              icon: Icons.home_outlined,
              title: t.settingsProperties,
              subtitle: t.settingsPropertiesDetail,
              onTap: () => Navigator.of(context).push<void>(
                MaterialPageRoute(builder: (_) => PropertiesScreen(api: _api)),
              ),
            ),
            const SizedBox(height: 28),
            KiviloSectionHeading(
              title: t.settingsBranding,
              subtitle: t.settingsBrandingDetail,
            ),
            const SizedBox(height: 12),
            _brandingCard(),
            const SizedBox(height: 28),
            KiviloSectionHeading(
              title: t.settingsPlan,
              subtitle: t.settingsPlanDetail,
            ),
            const SizedBox(height: 12),
            _planCard(),
            const SizedBox(height: 28),
            KiviloSectionHeading(title: t.settingsLanguage),
            const SizedBox(height: 12),
            ValueListenableBuilder<String?>(
              valueListenable: AppLanguage.choice,
              builder: (context, choice, _) => KiviloSelectField<String?>(
                label: t.settingsLanguage,
                value: choice,
                options: [
                  KiviloSelectOption(value: null, label: t.settingsPhoneLanguage),
                  // Each language in its own words, so it can be found by someone
                  // who cannot read the current one.
                  const KiviloSelectOption(value: 'en', label: 'English'),
                  const KiviloSelectOption(value: 'zh', label: '中文（简体）'),
                  const KiviloSelectOption(value: 'th', label: 'ไทย'),
                ],
                onChanged: AppLanguage.select,
              ),
            ),
            const SizedBox(height: 28),
            KiviloSectionHeading(title: t.settingsPrivacySupport),
            const SizedBox(height: 12),
            _linkCard(
              icon: Icons.privacy_tip_outlined,
              title: t.settingsPrivacyPolicy,
              subtitle: t.settingsPrivacyPolicyDetail,
              onTap: () => _openPage('/privacy'),
            ),
            const SizedBox(height: 10),
            _linkCard(
              icon: Icons.help_outline,
              title: t.settingsHelp,
              subtitle: t.settingsHelpDetail,
              onTap: () => _openPage('/support'),
            ),
            const SizedBox(height: 28),
            KiviloSectionHeading(
              title: t.settingsYourData,
              subtitle: t.settingsYourDataDetail,
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
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
                    if (deletion != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: KiviloColors.canvas,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _statusLabel(deletion['status']),
                              style: Theme.of(context).textTheme.titleMedium,
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
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _busy ? null : _requestDeletion,
                        child: Text(
                          _busy ? t.sending : t.settingsRequestAccountDeletion,
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
                child: Text(t.settingsDeletionLoadFailed(plainError(snapshot.error!))),
              ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: KiviloColors.red)),
            ],
            const SizedBox(height: 28),
            _linkCard(
              icon: Icons.logout,
              title: t.signOut,
              subtitle: t.settingsSignOutDetail,
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
    )),
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
