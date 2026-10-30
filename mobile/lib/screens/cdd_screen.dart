import 'dart:async';

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../models/cdd.dart';
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
                    title: 'No deals yet',
                    body: 'Start a deal when you take on a landlord or tenant, before anything is signed.',
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
    final attention = item.status == 'ESCALATED' || item.status == 'NEEDS_REVIEW';
    final detail = [
      _role(item.clientRole),
      ?item.property,
      if (item.openMatches > 0) '${item.openMatches} to decide',
    ].join(' · ');
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.clientName, style: text.titleMedium),
                    const SizedBox(height: 2),
                    Text(detail, style: text.bodySmall),
                    const SizedBox(height: 8),
                    Text(
                      _statusLabels[item.status] ?? item.status,
                      style: text.labelLarge?.copyWith(
                        color: item.status == 'ESCALATED'
                            ? KiviloColors.red
                            : attention
                            ? KiviloColors.pinkDark
                            : KiviloColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: KiviloColors.subtle),
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

  Future<void> _decide(CddMatch match) async {
    final decision = await showKiviloDrawer<({bool confirmed, String reason})>(
      context: context,
      builder: (_) => _DecisionDrawer(match: match),
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

  List<Widget> _sections(BuildContext context, CddCase item) {
    final text = Theme.of(context).textTheme;
    final particulars = item.particulars;
    return [
      Text(item.clientName, style: text.headlineMedium),
      const SizedBox(height: 4),
      Text('${_role(item.clientRole)} · ${_statusLabels[item.status] ?? item.status}', style: text.bodyMedium),
      if (item.status == 'ESCALATED') ...[
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
      if (item.status == 'WAITING_FOR_CLIENT') ...[
        const SizedBox(height: kiviloSectionGap),
        const KiviloSectionHeading(
          title: 'Client’s particulars',
          subtitle: 'Ask your client to fill them in, or fill them in together with their ID in front of you.',
        ),
        const SizedBox(height: kiviloHeadingGap),
        if (item.clientEmail != null) ...[
          FilledButton.icon(
            onPressed: _busy ? null : () => _request(item, share: false),
            icon: const Icon(Icons.mail_outline, size: 20),
            label: const Text('Email the form'),
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
      if (particulars != null) ...[
        const SizedBox(height: kiviloSectionGap),
        const KiviloSectionHeading(title: 'Particulars'),
        const SizedBox(height: kiviloHeadingGap),
        _Facts(rows: [
          ('Name', particulars.legalName),
          (particulars.idType == 'PASSPORT' ? 'Passport' : particulars.idType, particulars.idNumber),
          ('Nationality', particulars.nationality),
          if (particulars.dateOfBirth case final born?) ('Date of birth', _date(DateTime.parse(born))),
          ('Address', particulars.address),
          ('Public position', particulars.pepDeclared ? particulars.pepDetails ?? 'Declared' : 'None declared'),
          ('Sent by', particulars.submittedInPerson ? 'You, with the client' : 'The client'),
        ]),
        if (!particulars.idSighted && item.status != 'ESCALATED') ...[
          const SizedBox(height: 12),
          const KiviloNotice(
            tone: KiviloTone.info,
            child: Text('Check these against the client’s ID, in person or on a video call, before the deal.'),
          ),
        ],
        const SizedBox(height: kiviloSectionGap),
        KiviloSectionHeading(
          title: 'Screening',
          subtitle: item.runs.isEmpty
              ? null
              : 'Checked ${_date(item.runs.first.ranAt)} against ${item.runs.first.lists.join(', ')}.',
        ),
        const SizedBox(height: kiviloHeadingGap),
        if (item.runs.isEmpty) ...[
          const KiviloNotice(
            tone: KiviloTone.warning,
            child: Text('Not screened yet. Kivilo could not check the lists when the particulars arrived.'),
          ),
          const SizedBox(height: kiviloButtonGap),
          FilledButton.icon(
            onPressed: _busy ? null : () => _run(() => _api.rescreen(item.id)),
            icon: const Icon(Icons.refresh, size: 20),
            label: const Text('Screen now'),
          ),
        ] else if (item.runs.first.matches.isEmpty)
          const KiviloNotice(
            tone: KiviloTone.success,
            child: Text('No match on the UN or Singapore sanctions lists.'),
          )
        else
          for (final match in item.runs.first.matches) ...[
            _MatchCard(match: match, onDecide: _busy || match.decision != null ? null : () => _decide(match)),
            const SizedBox(height: 8),
          ],
      ],
    ];
  }
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
  const _DecisionDrawer({required this.match});

  final CddMatch match;

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
    final ready = _confirmed != null && _reason.text.trim().isNotEmpty;
    return KiviloDrawer(
      title: const Text('Is this your client?'),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Compare the name, date of birth and nationality with the client’s ID. Your '
            'decision and reason are recorded and cannot be changed.',
          ),
          const SizedBox(height: 12),
          KiviloNotice(
            tone: KiviloTone.info,
            child: Text(
              [widget.match.matchedName, ?_listedFacts(widget.match)].join('\n'),
            ),
          ),
          const SizedBox(height: 16),
          KiviloSegmentedControl<bool>(
            value: _confirmed,
            allowEmptySelection: true,
            options: const [
              KiviloSegmentOption(value: false, label: 'No'),
              KiviloSegmentOption(value: true, label: 'Yes'),
            ],
            onChanged: (value) => setState(() => _confirmed = value),
          ),
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
  final _address = TextEditingController();
  final _pepDetails = TextEditingController();
  final _born = TextEditingController();
  String _idType = 'NRIC';
  DateTime? _dateOfBirth;
  bool _pep = false;
  bool _saving = false;
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
  }

  Future<void> _save() async {
    final born = _dateOfBirth;
    if (born == null) {
      setState(() => _error = 'Enter the date of birth as it appears on the ID');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await _api.submitParticularsInPerson(widget.caseId, {
        'legalName': _name.text.trim(),
        'idType': _idType,
        'idNumber': _idNumber.text.trim(),
        'nationality': _nationality.text.trim(),
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
              'Copy the details from the client’s ID while they are with you. Saving records '
              'that you have seen it.',
              style: text.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Full name, as on the ID'),
            ),
            const SizedBox(height: 16),
            KiviloSegmentedControl<String>(
              value: _idType,
              options: const [
                KiviloSegmentOption(value: 'NRIC', label: 'NRIC'),
                KiviloSegmentOption(value: 'FIN', label: 'FIN'),
                KiviloSegmentOption(value: 'PASSPORT', label: 'Passport'),
              ],
              onChanged: (value) => setState(() => _idType = value!),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _idNumber,
              textCapitalization: TextCapitalization.characters,
              autocorrect: false,
              decoration: const InputDecoration(labelText: 'ID number'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _nationality,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Nationality'),
            ),
            const SizedBox(height: 12),
            TextField(
              readOnly: true,
              onTap: _pickDate,
              controller: _born,
              decoration: const InputDecoration(
                labelText: 'Date of birth',
                suffixIcon: Icon(Icons.calendar_today_outlined, size: 18),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _address,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Residential address', alignLabelWithHint: true),
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
                decoration: const InputDecoration(labelText: 'Which position, and who holds it', alignLabelWithHint: true),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 16),
              KiviloNotice(tone: KiviloTone.error, child: Text(_error!)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Saving…' : 'Save particulars'),
            ),
          ],
        ),
      ),
    );
  }
}
