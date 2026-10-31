import 'dart:async';

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../models/cdd.dart';
import '../models/countries.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';

/// CEA customer due diligence, the agent's side (plans/compliance-pack.md). The client
/// fills in their own particulars on the web; nothing here is ever shown to them, since
/// telling someone they are the subject of a report is an offence.

const _statusLabels = {
  'WAITING_FOR_CLIENT': 'Waiting for client',
  'NEEDS_REVIEW': 'Needs your review',
  'COMPLETE': 'Complete',
  'ESCALATED': 'Escalated',
};

String _role(String role) => role == 'LANDLORD' ? 'Landlord' : 'Tenant';

class CddListScreen extends StatefulWidget {
  const CddListScreen({super.key, this.api});

  final Api? api;

  @override
  State<CddListScreen> createState() => _CddListScreenState();
}

class _CddListScreenState extends State<CddListScreen> {
  late final _api = widget.api ?? Api();
  late Loading<List<CddCaseSummary>> _loading = _api.load(_api.cddCases, retainKey: 'cdd-cases');

  Future<void> _refresh() async {
    final next = _api.load(_api.cddCases, savedFirst: false, retainKey: 'cdd-cases');
    setState(() => _loading = next);
    await next.fresh;
  }

  Future<void> _open(String id) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => CddCaseScreen(id: id, api: _api)),
    );
    if (mounted) await _refresh();
  }

  Future<void> _start() async {
    final id = await showKiviloDrawer<String>(
      context: context,
      builder: (_) => _StartDealDrawer(api: _api),
    );
    if (id != null && mounted) await _open(id);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Due diligence')),
    body: KiviloContent(
      maxWidth: 840,
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: StreamBuilder<List<CddCaseSummary>>(
          stream: _loading.stream,
          builder: (context, snapshot) {
            final text = Theme.of(context).textTheme;
            final cases = snapshot.data;
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: kiviloScreenPadding,
              children: [
                Text(
                  'Check who your clients are before a deal, as CEA requires. The client '
                  'sends their own details, Kivilo screens them, and you keep the record.',
                  style: text.bodyMedium,
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _start,
                  icon: const Icon(Icons.add, size: 20),
                  label: const Text('Start a deal'),
                ),
                const SizedBox(height: kiviloSectionGap),
                if (cases == null && snapshot.hasError)
                  KiviloMessage(
                    icon: Icons.error_outline,
                    title: 'Could not load your cases',
                    body: plainError(snapshot.error!),
                    actionLabel: 'Try again',
                    onAction: _refresh,
                  )
                else if (cases == null)
                  const Center(child: CircularProgressIndicator())
                else if (cases.isEmpty)
                  const KiviloMessage(
                    icon: Icons.fact_check_outlined,
                    title: 'No clients checked yet',
                    body: 'Start a deal when you take on a landlord or tenant. Kivilo asks them for '
                        'their details, checks the sanctions lists and keeps the record for you.',
                  )
                else
                  for (final item in cases) ...[
                    _CaseRow(item: item, onTap: () => _open(item.id)),
                    const SizedBox(height: 8),
                  ],
              ],
            );
          },
        ),
      ),
    ),
  );
}

class _CaseRow extends StatelessWidget {
  const _CaseRow({required this.item, required this.onTap});

  final CddCaseSummary item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final complete = item.status == 'COMPLETE';
    final (fill, ink) = switch (item.status) {
      _ when item.needsCorrection => (KiviloColors.amberSoft, KiviloColors.amber),
      'ESCALATED' => (KiviloColors.redSoft, KiviloColors.red),
      'COMPLETE' => (KiviloColors.greenSoft, KiviloColors.green),
      'NEEDS_REVIEW' => (KiviloColors.pinkSoft, KiviloColors.pinkDark),
      _ => (KiviloColors.canvas, KiviloColors.muted),
    };
    final detail = [_role(item.clientRole), ?item.property].join(' · ');
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: fill, borderRadius: BorderRadius.circular(12)),
                    child: complete
                        ? Icon(Icons.check_rounded, color: ink, size: 22)
                        : Text(item.clientName.characters.first.toUpperCase(), style: text.titleMedium?.copyWith(color: ink)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.clientName, style: text.titleMedium),
                        const SizedBox(height: 2),
                        Text(detail, style: text.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: KiviloColors.subtle),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: fill, borderRadius: BorderRadius.circular(999)),
                    child: Text(
                      item.needsCorrection
                          ? 'Needs correcting'
                          : item.openMatches > 0 && item.status != 'ESCALATED'
                          ? '${item.openMatches} to decide'
                          : _statusLabels[item.status] ?? item.status,
                      style: text.labelMedium?.copyWith(color: ink),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: item.stepsDone / 5,
                        minHeight: 4,
                        backgroundColor: KiviloColors.border,
                        color: complete ? KiviloColors.green : KiviloColors.pink,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text('${item.stepsDone}/5', style: text.labelMedium?.copyWith(color: KiviloColors.muted)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StartDealDrawer extends StatefulWidget {
  const _StartDealDrawer({required this.api});

  final Api api;

  @override
  State<_StartDealDrawer> createState() => _StartDealDrawerState();
}

class _StartDealDrawerState extends State<_StartDealDrawer> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  String _role = 'LANDLORD';
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final email = _email.text.trim();
      final id = await widget.api.startDeal(
        clientName: _name.text.trim(),
        clientEmail: email.isEmpty ? null : email,
        clientRole: _role,
      );
      if (mounted) Navigator.of(context).pop(id);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => KiviloDrawer(
    title: const Text('Start a deal'),
    content: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Who is your client in this deal?'),
        const SizedBox(height: 12),
        KiviloSegmentedControl<String>(
          value: _role,
          options: const [
            KiviloSegmentOption(value: 'LANDLORD', label: 'Landlord'),
            KiviloSegmentOption(value: 'TENANT', label: 'Tenant'),
          ],
          onChanged: (value) => setState(() => _role = value!),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _name,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Client’s name'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          decoration: const InputDecoration(
            labelText: 'Client’s email',
            helperText: 'To send them the form. Leave empty to fill it in together.',
            helperMaxLines: 2,
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          KiviloNotice(tone: KiviloTone.error, child: Text(_error!)),
        ],
      ],
    ),
    actions: [
      FilledButton(
        onPressed: _saving ? null : _start,
        child: Text(_saving ? 'Starting…' : 'Start'),
      ),
    ],
  );
}

class CddCaseScreen extends StatefulWidget {
  const CddCaseScreen({super.key, required this.id, this.api});

  final String id;
  final Api? api;

  @override
  State<CddCaseScreen> createState() => _CddCaseScreenState();
}

class _CddCaseScreenState extends State<CddCaseScreen> {
  late final _api = widget.api ?? Api();
  late Loading<CddCase> _loading = _api.load(() => _api.cddCase(widget.id), retainKey: 'cdd:${widget.id}');
  bool _busy = false;

  Future<void> _refresh() async {
    final next = _api.load(() => _api.cddCase(widget.id), savedFirst: false, retainKey: 'cdd:${widget.id}');
    setState(() => _loading = next);
    await next.fresh;
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
      await _refresh();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _request(CddCase item, {required bool share}) => _run(() async {
    final request = await _api.requestParticulars(item.id);
    if (!mounted) return;
    if (share) {
      await SharePlus.instance.share(
        ShareParams(
          text: 'Hi ${item.clientName}, please fill in your details for our rental here. '
              'Agents must confirm who their clients are before a deal, under CEA rules: ${request.url}',
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            request.emailed
                ? 'Sent to ${item.clientEmail}.'
                : 'Already sent in the last ten minutes. You can share the link instead.',
          ),
        ),
      );
    }
  });

  Future<void> _inPerson(CddCase item) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => CddParticularsScreen(caseId: item.id, clientName: item.clientName, api: _api)),
    );
    if (saved == true && mounted) await _refresh();
  }

  Future<void> _decide(CddCase item, CddMatch match) async {
    final decision = await showKiviloDrawer<({bool confirmed, String reason})>(
      context: context,
      builder: (_) => _DecisionDrawer(match: match, client: item.particulars!),
    );
    if (decision == null) return;
    await _run(() => _api.decideMatch(match.id, confirmed: decision.confirmed, reason: decision.reason));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Due diligence')),
    body: KiviloContent(
      maxWidth: 840,
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: StreamBuilder<CddCase>(
          stream: _loading.stream,
          builder: (context, snapshot) {
            final item = snapshot.data;
            if (item == null) {
              return ListView(
                padding: kiviloScreenPadding,
                children: [
                  if (snapshot.hasError)
                    KiviloMessage(
                      icon: Icons.error_outline,
                      title: 'Could not load this case',
                      body: plainError(snapshot.error!),
                      actionLabel: 'Try again',
                      onAction: _refresh,
                    )
                  else
                    const Center(child: CircularProgressIndicator()),
                ],
              );
            }
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: kiviloScreenPadding,
              children: _sections(context, item),
            );
          },
        ),
      ),
    ),
  );

  /// Sets the particulars aside, then emails the client the form again when there is an
  /// address; without one, the waiting step offers the link and filling in together.
  Future<void> _askCorrection(CddCase item, String? problem, {String? reason}) async {
    final sure = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: const Text('Ask for corrected details?'),
        content: Text(
          [
            '${item.clientName} will be asked to send their details again'
                '${item.clientEmail == null ? '' : ', by email'}.',
            'The details they sent are kept in the record, set aside.',
          ].join(' '),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Ask again')),
        ],
      ),
    );
    if (sure != true) return;
    await _run(() async {
      await _api.requestCorrection(item.id, reason: problem == null ? reason : null);
      if (item.clientEmail != null) await _api.requestParticulars(item.id);
    });
  }

  Future<void> _checkId(CddCase item) async {
    final p = item.particulars!;
    final document = p.idType == 'PASSPORT' ? 'passport' : p.idType;
    final answer = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text('Seen ${item.clientName}’s $document?'),
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Confirm you have seen the original document, in person or on a video call, and that '
              'it matches what the client sent. This is recorded under your name.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            _Facts(rows: [
              ('Name', p.legalName),
              (p.idType == 'PASSPORT' ? 'Passport' : p.idType, 'ends ${p.idNumber.replaceAll('*', '')}'),
              if (p.dateOfBirth case final born?) ('Date of birth', _date(DateTime.parse(born))),
              ('Nationality', p.nationality),
            ]),
            const SizedBox(height: 8),
            TextButton(
              style: kiviloTertiary,
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('It doesn’t match the ID'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('It matches')),
        ],
      ),
    );
    if (answer == true) await _run(() => _api.confirmIdSighted(item.id));
    if (answer != false || !mounted) return;
    final reason = await showKiviloDrawer<String>(context: context, builder: (_) => const _MismatchDrawer());
    if (reason != null && mounted) await _askCorrection(item, null, reason: reason);
  }

  Future<void> _assess(CddCase item) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => CddRiskScreen(item: item, api: _api)),
    );
    if (saved == true && mounted) await _refresh();
  }

  Future<void> _complete(CddCase item) async {
    final sure = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: const Text('Complete due diligence?'),
        content: Text(
          'The record of ${item.clientName} is locked and fingerprinted. Nothing in it can change '
          'after this.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Complete')),
        ],
      ),
    );
    if (sure != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await _api.completeCase(item.id);
      final done = await _api.cddCase(item.id);
      if (!mounted) return;
      await Navigator.of(context).push<void>(MaterialPageRoute(builder: (_) => CddCompletedScreen(item: done)));
      if (mounted) await _refresh();
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(plainError(error))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  List<Widget> _sections(BuildContext context, CddCase item) {
    final text = Theme.of(context).textTheme;
    final p = item.particulars;
    final run = item.runs.firstOrNull;
    final escalated = item.status == 'ESCALATED';
    final complete = item.status == 'COMPLETE';

    // Particulars that fail a rule tightened since they were sent count as not received:
    // nothing after them can be relied on until the client corrects them.
    final problem = item.particularsProblem;
    final received = p != null && problem == null;
    final idSeen = received && p.idSighted;
    final screened = received && run != null && item.openMatches.isEmpty && !escalated;
    final assessed = item.riskLevel != null;
    final done = [received, idSeen, screened, assessed, complete].where((step) => step).length;

    final ruledOut = run?.matches.length ?? 0;
    return [
      _Summary(item: item, done: done),
      if (escalated) ...[
        const SizedBox(height: 16),
        const KiviloNotice(
          tone: KiviloTone.error,
          child: Text(
            'You confirmed a match. Stop dealing with this client, do not tell them, and file a '
            'suspicious transaction report with the Suspicious Transaction Reporting Office. Tell '
            'your agency’s key executive officer.',
          ),
        ),
      ],
      const SizedBox(height: 16),
      Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 6),
          child: Column(
            children: [
              _Step(
                icon: Icons.description_outlined,
                title: 'Particulars received',
                state: problem != null
                    ? _StepState.failed
                    : received
                    ? _StepState.done
                    : _StepState.current,
                status: problem != null
                    ? 'Needs correcting: ${problem.message}'
                    : received
                    ? [
                        p.submittedInPerson ? 'Taken in person' : 'Sent by the client',
                        if (p.submittedAt case final at?) _dateTime(at),
                      ].join(' · ')
                    : [
                        'Waiting for ${item.clientName}',
                        if (item.requestedAt case final at?) 'form emailed ${_dateTime(at)}',
                      ].join(' · '),
                children: problem != null
                    ? [
                        FilledButton(
                          onPressed: _busy ? null : () => _askCorrection(item, problem.message),
                          child: const Text('Ask for corrected details'),
                        ),
                      ]
                    : received
                    ? const []
                    : [
                        if (item.clientEmail != null) ...[
                          FilledButton.icon(
                            onPressed: _busy ? null : () => _request(item, share: false),
                            icon: const Icon(Icons.mail_outline, size: 20),
                            label: Text(item.requestedAt == null ? 'Email the form' : 'Email it again'),
                          ),
                          const SizedBox(height: kiviloButtonGap),
                        ],
                        OutlinedButton.icon(
                          onPressed: _busy ? null : () => _request(item, share: true),
                          icon: const Icon(Icons.share_outlined, size: 18),
                          label: const Text('Share the link'),
                        ),
                        const SizedBox(height: kiviloButtonGap),
                        OutlinedButton.icon(
                          onPressed: _busy ? null : () => _inPerson(item),
                          icon: const Icon(Icons.person_outline, size: 18),
                          label: const Text('Fill in together'),
                        ),
                      ],
              ),
              _Step(
                icon: Icons.person_outline,
                title: 'ID checked',
                state: idSeen
                    ? _StepState.done
                    : received && !escalated
                    ? _StepState.current
                    : _StepState.pending,
                status: idSeen
                    ? ['Original ID seen', if (p.idSightedAt case final at?) _dateTime(at)].join(' · ')
                    : escalated
                    ? 'Stopped by the confirmed match'
                    : received
                    ? 'Compare the particulars below with the original ID, in person or on a video call'
                    : problem != null
                    ? 'After the particulars are corrected'
                    : 'After the particulars arrive',
                children: [
                  if (received && !idSeen && !escalated)
                    FilledButton(
                      onPressed: _busy ? null : () => _checkId(item),
                      child: const Text('I’ve seen the original ID'),
                    ),
                ],
              ),
              _Step(
                icon: Icons.fact_check_outlined,
                title: 'Sanctions screening',
                state: escalated
                    ? _StepState.failed
                    : screened
                    ? _StepState.done
                    : received
                    ? _StepState.current
                    : _StepState.pending,
                status: escalated
                    ? 'Confirmed match'
                    : screened
                    ? '${ruledOut == 0 ? 'No match' : '$ruledOut possible ${ruledOut == 1 ? 'match' : 'matches'} ruled out'} · ${run.lists.join(', ')}'
                    : problem != null
                    ? 'Runs again on the corrected particulars'
                    : !received
                    ? 'Runs when the particulars arrive'
                    : run == null
                    ? 'Not screened yet. The lists could not be checked when the particulars arrived'
                    : '${item.openMatches.length} possible ${item.openMatches.length == 1 ? 'match' : 'matches'} to decide',
                children: [
                  if (received && run == null)
                    FilledButton.icon(
                      onPressed: _busy ? null : () => _run(() => _api.rescreen(item.id)),
                      icon: const Icon(Icons.refresh, size: 20),
                      label: const Text('Screen now'),
                    ),
                  if (run != null && (item.openMatches.isNotEmpty || escalated))
                    for (final match in run.matches) ...[
                      _MatchCard(match: match, onDecide: _busy || match.decision != null ? null : () => _decide(item, match)),
                      const SizedBox(height: 8),
                    ],
                ],
              ),
              _Step(
                icon: Icons.verified_outlined,
                title: 'Risk assessment',
                state: assessed
                    ? _StepState.done
                    : idSeen && screened
                    ? _StepState.current
                    : _StepState.pending,
                status: assessed
                    ? item.riskLevel == 'HIGHER'
                          ? 'Higher risk · source of funds recorded'
                          : 'Standard risk'
                    : escalated
                    ? 'Stopped by the confirmed match'
                    : idSeen && screened
                    ? '${item.riskQuestions.length} questions about this client and deal'
                    : 'After the ID check and screening',
                children: [
                  if (idSeen && screened && !assessed)
                    FilledButton(
                      onPressed: _busy ? null : () => _assess(item),
                      child: const Text('Assess risk'),
                    ),
                  if (assessed && !complete)
                    TextButton(
                      style: kiviloTertiary,
                      onPressed: _busy ? null : () => _assess(item),
                      child: const Text('Change answers'),
                    ),
                ],
              ),
              _Step(
                icon: Icons.lock_outline,
                title: 'Complete',
                last: true,
                state: complete
                    ? _StepState.done
                    : idSeen && screened && assessed
                    ? _StepState.current
                    : _StepState.pending,
                status: complete
                    ? [
                        'Locked',
                        if (item.completedAt case final at?) _dateTime(at),
                      ].join(' · ')
                    : escalated
                    ? 'Stopped by the confirmed match'
                    : idSeen && screened && assessed
                    ? 'Lock the record. Nothing in it can change after this'
                    : 'When every step above is done',
                children: [
                  if (!complete && idSeen && screened && assessed)
                    FilledButton(
                      onPressed: _busy ? null : () => _complete(item),
                      child: const Text('Complete due diligence'),
                    ),
                  if (complete)
                    OutlinedButton(
                      onPressed: () => Navigator.of(context).push<void>(
                        MaterialPageRoute(builder: (_) => CddCompletedScreen(item: item)),
                      ),
                      child: const Text('View record'),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
      if (p != null) ...[
        const SizedBox(height: kiviloSectionGap),
        KiviloSectionHeading(title: 'Particulars', subtitle: idSeen ? null : 'Check these against the original ID'),
        const SizedBox(height: kiviloHeadingGap),
        _Facts(rows: _particularsRows(p)),
      ],
      const SizedBox(height: 24),
      Text(
        'Reference ${item.reference}',
        textAlign: TextAlign.center,
        style: text.bodySmall?.copyWith(color: KiviloColors.subtle),
      ),
    ];
  }
}

List<(String, String)> _particularsRows(CddParticulars p) => [
  ('Name', p.legalName),
  (p.idType == 'PASSPORT' ? 'Passport' : p.idType, p.idNumber),
  ('Nationality', p.nationality),
  if (p.dateOfBirth case final born?) ('Date of birth', _date(DateTime.parse(born))),
  ('Address', p.address),
  ('Public position', p.pepDeclared ? p.pepDetails ?? 'Declared' : 'None declared'),
];

String _dateTime(DateTime value) {
  final local = value.toLocal();
  final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final minute = local.minute.toString().padLeft(2, '0');
  return '${_date(local)}, $hour:$minute ${local.hour < 12 ? 'am' : 'pm'}';
}

String _date(DateTime value) {
  final local = value.toLocal();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return '${local.day} ${months[local.month - 1]} ${local.year}';
}

class _Facts extends StatelessWidget {
  const _Facts({required this.rows});

  final List<(String, String)> rows;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            for (final (label, value) in rows)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(width: 120, child: Text(label, style: text.bodySmall)),
                    Expanded(child: Text(value, style: text.bodyMedium)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _MatchCard extends StatelessWidget {
  const _MatchCard({required this.match, required this.onDecide});

  final CddMatch match;
  final VoidCallback? onDecide;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final list = match.source == 'SG' ? 'Singapore designations' : 'UN sanctions list';
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            KiviloEyebrow(switch (match.decision) {
              'CONFIRMED_MATCH' => 'Confirmed match',
              'NOT_A_MATCH' => 'Not the same person',
              _ => 'Possible match · ${(match.score * 100).round()}%',
            }),
            const SizedBox(height: 8),
            Text(match.matchedName, style: text.titleMedium),
            const SizedBox(height: 4),
            Text('$list · ${match.reference}', style: text.bodySmall),
            if (_listedFacts(match) case final facts?) ...[
              const SizedBox(height: 4),
              Text(facts, style: text.bodySmall),
            ],
            if (match.listedNames.length > 1) ...[
              const SizedBox(height: 4),
              Text('Also listed as ${match.listedNames.where((name) => name != match.matchedName).join('; ')}', style: text.bodySmall),
            ],
            const SizedBox(height: 12),
            if (match.decision != null)
              Text('Your reason: ${match.reason}', style: text.bodyMedium)
            else
              FilledButton(onPressed: onDecide, child: const Text('Decide')),
          ],
        ),
      ),
    );
  }
}

String? _listedFacts(CddMatch match) {
  final facts = [
    if (match.birthYears.isNotEmpty) 'Born ${match.birthYears.join(' or ')}',
    ...match.nationalities,
  ];
  return facts.isEmpty ? null : facts.join(' · ');
}

class _DecisionDrawer extends StatefulWidget {
  const _DecisionDrawer({required this.match, required this.client});

  final CddMatch match;
  final CddParticulars client;

  @override
  State<_DecisionDrawer> createState() => _DecisionDrawerState();
}

class _DecisionDrawerState extends State<_DecisionDrawer> {
  final _reason = TextEditingController();
  bool? _confirmed;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final ready = _confirmed != null && _reason.text.trim().isNotEmpty;
    final match = widget.match;
    final client = widget.client;
    final born = client.dateOfBirth == null ? null : _date(DateTime.parse(client.dateOfBirth!));
    final cards = [
      _Compared(
        label: 'Your client',
        name: client.legalName,
        facts: [if (born != null) 'Born $born', client.nationality],
      ),
      _Compared(
        label: match.source == 'SG' ? 'Singapore list' : 'UN list',
        name: match.matchedName,
        facts: [
          if (match.birthYears.isNotEmpty) 'Born ${match.birthYears.join(' or ')}',
          if (match.nationalities.isNotEmpty) match.nationalities.join(', '),
          match.reference,
        ],
        listed: true,
      ),
    ];
    return KiviloDrawer(
      title: const Text('Is this your client?'),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Compare your client with the listed person. Your decision and reason are recorded '
            'and cannot be changed.',
            style: text.bodyMedium,
          ),
          const SizedBox(height: 16),
          // Side by side while both fit; stacked when large text would squeeze them.
          if (MediaQuery.textScalerOf(context).scale(16) > 20)
            ...[cards[0], const SizedBox(height: 8), cards[1]]
          else
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: cards[0]),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 6),
                    child: Center(child: Text('vs', style: TextStyle(color: KiviloColors.subtle, fontWeight: FontWeight.w600))),
                  ),
                  Expanded(child: cards[1]),
                ],
              ),
            ),
          const SizedBox(height: 20),
          KiviloSegmentedControl<bool>(
            value: _confirmed,
            allowEmptySelection: true,
            options: const [
              KiviloSegmentOption(value: false, label: 'No'),
              KiviloSegmentOption(value: true, label: 'Yes'),
            ],
            onChanged: (value) => setState(() => _confirmed = value),
          ),
          if (_confirmed == true) ...[
            const SizedBox(height: 12),
            const KiviloNotice(
              tone: KiviloTone.error,
              child: Text('This stops the deal. You must not tell the client, and must report it.'),
            ),
          ],
          const SizedBox(height: 16),
          TextField(
            controller: _reason,
            minLines: 2,
            maxLines: 5,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'Reason',
              hintText: 'For example: different date of birth and nationality',
              alignLabelWithHint: true,
            ),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
        FilledButton(
          style: _confirmed == true ? kiviloDangerFilled : null,
          onPressed: ready
              ? () => Navigator.of(context).pop((confirmed: _confirmed!, reason: _reason.text.trim()))
              : null,
          child: const Text('Record'),
        ),
      ],
    );
  }
}

class _MismatchDrawer extends StatefulWidget {
  const _MismatchDrawer();

  @override
  State<_MismatchDrawer> createState() => _MismatchDrawerState();
}

class _MismatchDrawerState extends State<_MismatchDrawer> {
  final _reason = TextEditingController();

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => KiviloDrawer(
    title: const Text('What doesn’t match?'),
    content: TextField(
      controller: _reason,
      autofocus: true,
      minLines: 2,
      maxLines: 4,
      onChanged: (_) => setState(() {}),
      decoration: const InputDecoration(
        labelText: 'Reason',
        hintText: 'For example: the date of birth on the card is different',
        alignLabelWithHint: true,
      ),
    ),
    actions: [
      TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
      FilledButton(
        onPressed: _reason.text.trim().isEmpty ? null : () => Navigator.of(context).pop(_reason.text.trim()),
        child: const Text('Continue'),
      ),
    ],
  );
}

class _Compared extends StatelessWidget {
  const _Compared({required this.label, required this.name, required this.facts, this.listed = false});

  final String label;
  final String name;
  final List<String> facts;
  final bool listed;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: listed ? KiviloColors.redSoft : KiviloColors.canvas,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: listed ? KiviloColors.redBorder : KiviloColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: text.labelMedium?.copyWith(color: listed ? KiviloColors.red : KiviloColors.muted)),
          const SizedBox(height: 6),
          Text(name, style: text.titleSmall),
          for (final fact in facts) ...[const SizedBox(height: 3), Text(fact, style: text.bodySmall)],
        ],
      ),
    );
  }
}

class CddParticularsScreen extends StatefulWidget {
  const CddParticularsScreen({super.key, required this.caseId, required this.clientName, this.api});

  final String caseId;
  final String clientName;
  final Api? api;

  @override
  State<CddParticularsScreen> createState() => _CddParticularsScreenState();
}

class _CddParticularsScreenState extends State<CddParticularsScreen> {
  late final _api = widget.api ?? Api();
  late final _name = TextEditingController(text: widget.clientName);
  final _idNumber = TextEditingController();
  final _nationality = TextEditingController();
  String? _country;
  ParticularsProblem? _problem;
  final _address = TextEditingController();
  final _pepDetails = TextEditingController();
  final _born = TextEditingController();
  String _idType = 'NRIC';
  DateTime? _dateOfBirth;
  bool _pep = false;
  bool _sighted = false;
  bool _saving = false;

  String? get _idProblem => _idNumber.text.trim().isEmpty ? null : idNumberProblem(_idType, _idNumber.text);
  String? _error;

  @override
  void dispose() {
    for (final controller in [_name, _idNumber, _nationality, _address, _pepDetails, _born]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth ?? DateTime(1985),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      helpText: 'Date of birth, as on the ID',
    );
    if (picked == null) return;
    _dateOfBirth = picked;
    _born.text = _date(picked);
    _clear('dateOfBirth');
  }

  Future<void> _pickCountry() async {
    final picked = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => _CountryPicker(selected: _country)),
    );
    if (picked == null) return;
    _country = picked;
    _nationality.text = picked;
    _clear('nationality');
  }

  /// Editing the field a problem was on clears it; the next Save checks again.
  void _clear(String field) {
    if (_problem?.field == field) setState(() => _problem = null);
  }

  String? _errorFor(String field) => _problem?.field == field ? _problem!.message : null;

  Future<void> _save() async {
    final born = _dateOfBirth;
    // The same rules the server applies; anything that cannot be right is fixed here first.
    final problem = particularsProblem(
      legalName: _name.text,
      idType: _idType,
      idNumber: _idNumber.text.trim().isEmpty ? '' : _idNumber.text,
      nationality: _country,
      dateOfBirth: born,
      address: _address.text,
      pepDeclared: _pep,
      pepDetails: _pepDetails.text,
    );
    if (problem != null || born == null) {
      setState(() {
        _problem = problem;
        _error = problem?.message;
      });
      return;
    }
    setState(() {
      _problem = null;
      _saving = true;
      _error = null;
    });
    try {
      await _api.submitParticularsInPerson(widget.caseId, {
        'legalName': _name.text.trim(),
        'idType': _idType,
        'idNumber': normalizeIdNumber(_idNumber.text),
        'nationality': _country,
        'dateOfBirth': '${born.year.toString().padLeft(4, '0')}-${born.month.toString().padLeft(2, '0')}-${born.day.toString().padLeft(2, '0')}',
        'address': _address.text.trim(),
        'pepDeclared': _pep,
        'pepDetails': _pep ? _pepDetails.text.trim() : null,
      });
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Fill in together')),
      body: KiviloContent(
        maxWidth: 720,
        child: ListView(
          padding: kiviloScreenPadding,
          children: [
            Text(
              'Copy the details from the client’s original ID while they are with you.',
              style: text.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              onChanged: (_) => _clear('legalName'),
              decoration: InputDecoration(labelText: 'Full name, as on the ID', errorText: _errorFor('legalName'), errorMaxLines: 2),
            ),
            const SizedBox(height: 16),
            KiviloSegmentedControl<String>(
              value: _idType,
              options: const [
                KiviloSegmentOption(value: 'NRIC', label: 'NRIC'),
                KiviloSegmentOption(value: 'FIN', label: 'FIN'),
                KiviloSegmentOption(value: 'PASSPORT', label: 'Passport'),
              ],
              onChanged: (value) => setState(() {
                _idType = value!;
                if (_problem?.field == 'idNumber') _problem = null;
              }),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _idNumber,
              textCapitalization: TextCapitalization.characters,
              autocorrect: false,
              onChanged: (_) => setState(() {
                if (_problem?.field == 'idNumber') _problem = null;
              }),
              decoration: InputDecoration(
                labelText: 'ID number',
                // A complete NRIC or FIN is nine characters; judge it once it could be one.
                errorText: _errorFor('idNumber') ??
                    (_idProblem != null && normalizeIdNumber(_idNumber.text).length >= 9 ? _idProblem : null),
                errorMaxLines: 2,
                suffixIcon: _idNumber.text.trim().isNotEmpty && _idProblem == null && _errorFor('idNumber') == null
                    ? const Icon(Icons.check_rounded, color: KiviloColors.green)
                    : null,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _nationality,
              readOnly: true,
              onTap: _pickCountry,
              decoration: InputDecoration(
                labelText: 'Nationality',
                errorText: _errorFor('nationality'),
                suffixIcon: const Icon(Icons.chevron_right),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              readOnly: true,
              onTap: _pickDate,
              controller: _born,
              decoration: InputDecoration(
                labelText: 'Date of birth',
                errorText: _errorFor('dateOfBirth'),
                errorMaxLines: 2,
                suffixIcon: const Icon(Icons.calendar_today_outlined, size: 18),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _address,
              minLines: 2,
              maxLines: 4,
              onChanged: (_) => _clear('address'),
              decoration: InputDecoration(
                labelText: 'Residential address',
                hintText: 'Blk 231 Bishan Street 23, #10-120, Singapore 570231',
                errorText: _errorFor('address'),
                errorMaxLines: 2,
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Does the client, or a close family member or associate, hold or have held a '
              'prominent public position?',
              style: text.titleSmall,
            ),
            const SizedBox(height: 8),
            KiviloSegmentedControl<bool>(
              value: _pep,
              options: const [
                KiviloSegmentOption(value: false, label: 'No'),
                KiviloSegmentOption(value: true, label: 'Yes'),
              ],
              onChanged: (value) => setState(() => _pep = value!),
            ),
            if (_pep) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _pepDetails,
                minLines: 2,
                maxLines: 4,
                onChanged: (_) => _clear('pepDetails'),
                decoration: InputDecoration(
                  labelText: 'Which position, and who holds it',
                  errorText: _errorFor('pepDetails'),
                  alignLabelWithHint: true,
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 16),
              KiviloNotice(tone: KiviloTone.error, child: Text(_error!)),
            ],
            const SizedBox(height: 20),
            Material(
              color: _sighted ? KiviloColors.pinkSoft : Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: BorderSide(color: _sighted ? KiviloColors.pinkBorder : KiviloColors.border),
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => setState(() => _sighted = !_sighted),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(4, 8, 14, 8),
                  child: Row(
                    children: [
                      Checkbox(value: _sighted, onChanged: (value) => setState(() => _sighted = value!)),
                      Expanded(
                        child: Text(
                          'The client’s original ID is in front of me, and these details match it.',
                          style: text.bodyMedium,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving || !_sighted ? null : _save,
              child: Text(_saving ? 'Saving…' : 'Save particulars'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.item, required this.done});

  final CddCase item;
  final int done;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final complete = item.status == 'COMPLETE';
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: complete ? KiviloColors.greenSoft : KiviloColors.pinkSoft,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    item.clientName.characters.first.toUpperCase(),
                    style: text.titleLarge?.copyWith(color: complete ? KiviloColors.green : KiviloColors.pinkDark),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.clientName, style: text.titleLarge),
                      const SizedBox(height: 2),
                      Text('${_role(item.clientRole)} · ${_statusLabels[item.status] ?? item.status}', style: text.bodySmall),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: Text(complete ? 'All 5 steps done' : '$done of 5 steps done', style: text.labelLarge)),
                const SizedBox(width: 8),
                Text(item.reference, style: text.bodySmall?.copyWith(color: KiviloColors.subtle)),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: done / 5,
                minHeight: 6,
                backgroundColor: KiviloColors.border,
                color: complete ? KiviloColors.green : KiviloColors.pink,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _StepState { done, current, pending, failed }

/// One row of the case's progress: a marker, the line joining it to the next, and the
/// step's action underneath while it is the one to do.
class _Step extends StatelessWidget {
  const _Step({
    required this.icon,
    required this.title,
    required this.state,
    required this.status,
    this.children = const [],
    this.last = false,
  });

  final IconData icon;
  final String title;
  final _StepState state;
  final String status;
  final List<Widget> children;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final (fill, ink, statusInk) = switch (state) {
      _StepState.done => (KiviloColors.greenSoft, KiviloColors.green, KiviloColors.green),
      _StepState.current => (KiviloColors.pinkSoft, KiviloColors.pinkDark, KiviloColors.pinkDark),
      _StepState.failed => (KiviloColors.redSoft, KiviloColors.red, KiviloColors.red),
      _StepState.pending => (KiviloColors.canvas, KiviloColors.subtle, KiviloColors.muted),
    };
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Column(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: fill,
                  shape: BoxShape.circle,
                  border: state == _StepState.current ? Border.all(color: KiviloColors.pinkBorder, width: 2) : null,
                ),
                child: Icon(
                  switch (state) {
                    _StepState.done => Icons.check_rounded,
                    _StepState.failed => Icons.error_outline,
                    _ => icon,
                  },
                  size: 20,
                  color: ink,
                ),
              ),
              if (!last)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    color: state == _StepState.done ? KiviloColors.greenBorder : KiviloColors.border,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(top: 9, bottom: last ? 12 : 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    title,
                    style: text.titleMedium?.copyWith(
                      color: state == _StepState.pending ? KiviloColors.muted : KiviloColors.ink,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(status, style: text.bodySmall?.copyWith(color: statusInk)),
                  if (children.isNotEmpty) ...[const SizedBox(height: 12), ...children],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The risk checklist the server sent with the case, answered yes or no. A yes asks
/// where the client's funds come from; the server decides the level and refuses without it.
class CddRiskScreen extends StatefulWidget {
  const CddRiskScreen({super.key, required this.item, this.api});

  final CddCase item;
  final Api? api;

  @override
  State<CddRiskScreen> createState() => _CddRiskScreenState();
}

class _CddRiskScreenState extends State<CddRiskScreen> {
  late final _api = widget.api ?? Api();
  late final Map<String, bool?> _answers = {
    for (final question in widget.item.riskQuestions)
      question.key: widget.item.riskAnswers[question.key] as bool? ??
          (question.key == 'pep' && widget.item.particulars?.pepDeclared == true ? true : null),
  };
  late final _funds = TextEditingController(text: widget.item.riskAnswers['sourceOfFunds'] as String? ?? '');
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _funds.dispose();
    super.dispose();
  }

  bool get _higher => _answers.values.any((answer) => answer == true);
  bool get _answered => _answers.values.every((answer) => answer != null);

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await _api.assessRisk(
        widget.item.id,
        {for (final entry in _answers.entries) entry.key: entry.value!},
        sourceOfFunds: _higher ? _funds.text.trim() : null,
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Risk assessment')),
      body: KiviloContent(
        maxWidth: 720,
        child: ListView(
          padding: kiviloScreenPadding,
          children: [
            Text(
              'Answer for ${widget.item.clientName} and this deal. A yes to any question makes the '
              'client higher risk, and CEA then expects you to record where their funds come from.',
              style: text.bodyMedium,
            ),
            const SizedBox(height: 16),
            for (final (i, question) in widget.item.riskQuestions.indexed) ...[
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      KiviloEyebrow('Question ${i + 1} of ${widget.item.riskQuestions.length}'),
                      const SizedBox(height: 6),
                      Text(question.text, style: text.titleMedium),
                      if (question.help case final help?) ...[
                        const SizedBox(height: 4),
                        Text(help, style: text.bodySmall),
                      ],
                      const SizedBox(height: 12),
                      KiviloSegmentedControl<bool>(
                        value: _answers[question.key],
                        allowEmptySelection: true,
                        options: const [
                          KiviloSegmentOption(value: false, label: 'No'),
                          KiviloSegmentOption(value: true, label: 'Yes'),
                        ],
                        onChanged: (value) => setState(() => _answers[question.key] = value),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (_answered)
              KiviloNotice(
                tone: _higher ? KiviloTone.warning : KiviloTone.success,
                child: Text(_higher ? 'Higher risk' : 'Standard risk', style: text.titleSmall),
              ),
            if (_higher) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _funds,
                minLines: 2,
                maxLines: 5,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: 'Where the client’s funds come from',
                  hintText: 'For example: salary, payslips from DBS seen',
                  alignLabelWithHint: true,
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              KiviloNotice(tone: KiviloTone.error, child: Text(_error!)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _saving || !_answered || (_higher && _funds.text.trim().isEmpty) ? null : _save,
              child: Text(_saving ? 'Saving…' : 'Save assessment'),
            ),
          ],
        ),
      ),
    );
  }
}

/// The finished record: what was checked, against what, and the fingerprint that proves
/// it has not changed since.
class CddCompletedScreen extends StatelessWidget {
  const CddCompletedScreen({super.key, required this.item});

  final CddCase item;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final p = item.particulars;
    final run = item.runs.firstOrNull;
    final ruledOut = run?.matches.length ?? 0;
    final hash = item.contentHash;
    return Scaffold(
      appBar: AppBar(),
      body: KiviloContent(
        maxWidth: 560,
        child: ListView(
          padding: kiviloScreenPadding,
          children: [
            const SizedBox(height: 8),
            Center(
              child: SizedBox(
                width: 96,
                height: 72,
                child: Stack(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(color: KiviloColors.pink, borderRadius: BorderRadius.circular(18)),
                      child: const Icon(Icons.fact_check_outlined, color: Colors.white, size: 32),
                    ),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: KiviloColors.green,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 3),
                        ),
                        child: const Icon(Icons.check_rounded, color: Colors.white, size: 24),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text('Due diligence complete', textAlign: TextAlign.center, style: text.headlineMedium),
            const SizedBox(height: 6),
            Text(item.clientName, textAlign: TextAlign.center, style: text.bodyLarge),
            const SizedBox(height: 24),
            _Facts(rows: [
              ('Client', '${item.clientName}, ${_role(item.clientRole).toLowerCase()}'),
              if (p != null) (p.idType == 'PASSPORT' ? 'Passport' : p.idType, '${p.idNumber}, original seen'),
              ('Screening', ruledOut == 0 ? 'No match' : '$ruledOut ruled out'),
              if (run != null) ('Lists', run.lists.join(', ')),
              ('Risk', item.riskLevel == 'HIGHER' ? 'Higher, source of funds recorded' : 'Standard'),
              if (item.completedAt case final at?) ('Completed', _dateTime(at)),
              ('Reference', item.reference),
              if (hash != null) ('Fingerprint', '${hash.substring(0, 8)}…${hash.substring(hash.length - 4)}'),
            ]),
            const SizedBox(height: 12),
            Text(
              'This record is locked. Kivilo keeps it for five years, as CEA requires.',
              textAlign: TextAlign.center,
              style: text.bodySmall,
            ),
            const SizedBox(height: 24),
            FilledButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Done')),
          ],
        ),
      ),
    );
  }
}

/// Every nationality the server accepts, searchable, with the common ones first.
class _CountryPicker extends StatefulWidget {
  const _CountryPicker({this.selected});

  final String? selected;

  @override
  State<_CountryPicker> createState() => _CountryPickerState();
}

class _CountryPickerState extends State<_CountryPicker> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final query = _query.trim().toLowerCase();
    final found = [for (final country in countries) if (country.toLowerCase().contains(query)) country];
    Widget row(String country) => ListTile(
      title: Text(country),
      trailing: country == widget.selected ? const Icon(Icons.check_rounded, color: KiviloColors.pink) : null,
      onTap: () => Navigator.of(context).pop(country),
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Nationality')),
      body: KiviloContent(
        maxWidth: 720,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: TextField(
                autofocus: true,
                onChanged: (value) => setState(() => _query = value),
                decoration: const InputDecoration(hintText: 'Search countries'),
              ),
            ),
            if (query.isEmpty) ...[
              Padding(padding: const EdgeInsets.fromLTRB(16, 12, 16, 4), child: KiviloEyebrow('Common')),
              for (final country in commonCountries) row(country),
              Padding(padding: const EdgeInsets.fromLTRB(16, 16, 16, 4), child: KiviloEyebrow('All countries')),
            ],
            for (final country in found) row(country),
            if (found.isEmpty)
              Padding(
                padding: const EdgeInsets.all(24),
                child: Text('No country matches “$_query”.', textAlign: TextAlign.center, style: text.bodyMedium),
              ),
          ],
        ),
      ),
    );
  }
}
