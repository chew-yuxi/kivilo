import 'package:flutter/material.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import '../services/workspace.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/workspace_picker.dart';
import 'report_screen.dart';
import 'team_screen.dart';
import 'tenancy_screen.dart';

/// The Properties tab for "Homes I own" and "Homes I rent": the tenancies where this
/// account is that party, each with its agreed report and its repairs. The server
/// filters by the party; the agent's working records never appear here.
class PartyHomesScreen extends StatefulWidget {
  const PartyHomesScreen({
    super.key,
    required this.api,
    required this.workspace,
  });
  final Api api;
  final Workspace workspace;

  @override
  State<PartyHomesScreen> createState() => _PartyHomesScreenState();
}

class _PartyHomesScreenState extends State<PartyHomesScreen> {
  Api get _api => widget.api;
  Workspace get _workspace => widget.workspace;

  /// Fixed for this screen: Home gives each party its own instance.
  late final String _party = _workspace.party!;
  late Loading<List<TenancySummary>> _loading = _api.load(
    _load,
    retainKey: 'homes:$_party',
  );

  Future<List<TenancySummary>> _load() async {
    await _workspace.refresh();
    return _api.tenancyWork(party: _party);
  }

  /// The list renders a failure itself, in place of the cards.
  Future<void> _refresh() async {
    final next = _api.load(
      _load,
      savedFirst: false,
      retainKey: 'homes:$_party',
    );
    setState(() => _loading = next);
    await next.fresh.then((_) {}, onError: (Object _) {});
  }

  Future<void> _select(String value) async {
    try {
      await _workspace.select(value);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    }
  }

  Future<void> _teams() async {
    final selected = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => TeamScreen(api: _api, selectWorkspace: true),
      ),
    );
    if (selected != null && mounted) await _select(selected);
  }

  Future<void> _open(Widget screen) async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => screen));
    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final owner = _party == 'LANDLORD';
    return Scaffold(
      appBar: ModalRoute.of(context)?.canPop == true ? AppBar() : null,
      body: SafeArea(
        bottom: false,
        child: KiviloContent(
          maxWidth: 1200,
          child: RefreshIndicator(
            onRefresh: _refresh,
            child: StreamBuilder<List<TenancySummary>>(
              stream: _loading.stream,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return KiviloMessage(
                    icon: Icons.cloud_off_outlined,
                    title: 'Could not load your homes',
                    body: plainError(snapshot.error!),
                    actionLabel: 'Try again',
                    onAction: _refresh,
                  );
                }
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final homes = snapshot.data!;
                // Two homes a row on a tablet, as the Properties cards are.
                return LayoutBuilder(
                  builder: (context, constraints) {
                    final available =
                        constraints.maxWidth - kiviloScreenPadding.horizontal;
                    final columns = available >= 680 ? 2 : 1;
                    final cardWidth =
                        (available - (columns - 1) * 16) / columns;
                    return ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: kiviloScreenPadding,
                      children: [
                        Text(
                          owner ? 'Homes I own' : 'Homes I rent',
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Reports you agreed, repairs and the people involved.',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                        if (_workspace.showPicker) ...[
                          const SizedBox(height: 16),
                          WorkspacePicker(
                            workspace: _workspace,
                            onChanged: _select,
                            onTeams: _teams,
                          ),
                        ],
                        if (_api.offlineCopy) ...[
                          const SizedBox(height: 16),
                          const KiviloNotice(
                            tone: KiviloTone.warning,
                            child: Text(
                              'Offline. Showing what was last loaded.',
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        if (homes.isEmpty)
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Text(
                                owner
                                    ? 'No homes where you are the landlord.'
                                    : 'No homes where you are the tenant.',
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                        Wrap(
                          spacing: 16,
                          runSpacing: 12,
                          children: [
                            for (final home in homes)
                              SizedBox(width: cardWidth, child: _card(home)),
                          ],
                        ),
                      ],
                    );
                  },
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  /// A landlord's or tenant's tenancy: the report they agreed and the repairs since.
  Widget _card(TenancySummary tenancy) {
    final text = Theme.of(context).textTheme;
    final reportId = tenancy.latestReportId;
    final alsoAgent = tenancy.capacities.contains('AGENT');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              tenancy.property,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: text.titleMedium,
            ),
            const SizedBox(height: 3),
            Text(
              [
                _party == 'LANDLORD'
                    ? 'You are the landlord'
                    : 'You are the tenant',
                if (alsoAgent) 'and its agent',
              ].join(' '),
              style: text.bodySmall,
            ),
            const SizedBox(height: 3),
            Text(
              _party == 'LANDLORD'
                  ? 'Tenant: ${tenancy.tenant}'
                  : 'Landlord: ${tenancy.landlord}',
              style: text.bodySmall,
            ),
            if (reportId == null) ...[
              const SizedBox(height: 12),
              Text(
                'Your check-in report appears here once your agent sends it.',
                style: text.bodySmall,
              ),
            ],
            const SizedBox(height: 14),
            if (reportId != null && tenancy.awaitingMySignature) ...[
              FilledButton(
                onPressed: () => _open(ReportScreen(id: reportId, api: _api)),
                child: const Text('Review and sign'),
              ),
              const SizedBox(height: kiviloButtonGap),
            ],
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('View property'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _open(TenancyScreen(tenancy: tenancy, api: _api)),
            ),
          ],
        ),
      ),
    );
  }
}
