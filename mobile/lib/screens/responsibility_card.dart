import 'package:flutter/material.dart';

import '../models/maintenance.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';
import '../ui/kivilo_layout.dart';

final _money = RegExp(r'^\d+(?:\.\d{1,2})?$');

/// Who arranges a repair and who pays. One side proposes, the other answers, and
/// Kivilo records it; it never decides liability itself.
class ResponsibilityCard extends StatelessWidget {
  const ResponsibilityCard({
    super.key,
    required this.responsibility,
    required this.role,
    required this.busy,
    required this.onPropose,
    required this.onAnswer,
  });

  final Responsibility responsibility;
  final String role;
  final bool busy;
  final Future<void> Function(Map<String, dynamic> body) onPropose;
  final Future<void> Function(String proposalId, String decision, String? note)
  onAnswer;

  String get _otherSide => role == 'TENANT' ? 'the landlord' : 'the tenant';

  Future<void> _propose(
    BuildContext context, {
    ResponsibilityProposal? from,
  }) async {
    final body = await showKiviloDrawer<Map<String, dynamic>>(
      context: context,
      builder: (_) => ProposalDrawer(
        minorRepairCap: responsibility.minorRepairCap,
        from: from,
        counter: from != null && from.status == 'PENDING',
      ),
    );
    if (body != null) await onPropose(body);
  }

  Future<void> _accept(
    BuildContext context,
    ResponsibilityProposal proposal,
  ) async {
    final accepted = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: const Text('Accept this split?'),
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SummaryPanel(label: 'You are agreeing to', text: proposal.summary),
            const SizedBox(height: 12),
            Text(
              'This becomes the agreement for this repair. Changing it later '
              'takes a new proposal that both sides accept.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Accept'),
          ),
        ],
      ),
    );
    if (accepted == true) await onAnswer(proposal.id, 'ACCEPT', null);
  }

  Future<void> _reject(
    BuildContext context,
    ResponsibilityProposal proposal,
  ) async {
    final note = await showKiviloDrawer<String>(
      context: context,
      builder: (_) => _RejectDrawer(proposal: proposal),
    );
    if (note != null) await onAnswer(proposal.id, 'REJECT', note);
  }

  @override
  Widget build(BuildContext context) {
    final agreement = responsibility.agreement;
    final pending = responsibility.pending;
    final rejection = responsibility.rejection;
    // The panels below say who is waiting on whom; the heading only says where
    // the case stands, so the two never repeat or contradict each other.
    final subtitle = agreement == null
        ? 'Not agreed yet'
        : pending == null
        ? 'Agreed by both sides'
        : 'Agreed, change proposed';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            KiviloSectionHeading(title: 'Who pays', subtitle: subtitle),
            const SizedBox(height: kiviloHeadingGap),
            if (agreement != null) ...[
              _ProposalPanel(
                tone: _Tone.agreed,
                heading: 'Agreed',
                proposal: agreement,
                meta: agreement.respondedBy == null
                    ? 'Proposed by ${agreement.proposedBy}'
                    : 'Proposed by ${agreement.proposedBy}, '
                          'accepted by ${agreement.respondedBy}',
              ),
              if (responsibility.shares case final shares?
                  when shares.total != '0.00') ...[
                const SizedBox(height: 10),
                _Shares(shares: shares),
              ],
            ],
            if (pending != null) ...[
              if (agreement != null) const SizedBox(height: 12),
              _ProposalPanel(
                tone: _Tone.pending,
                heading: responsibility.canAnswer
                    ? 'Your answer is needed'
                    : responsibility.canWithdraw
                    ? 'Waiting for $_otherSide'
                    : 'Waiting for an answer',
                proposal: pending,
                meta: agreement == null
                    ? '${partyLabels[pending.side]} proposes'
                    : '${partyLabels[pending.side]} proposes a change',
              ),
              if (responsibility.canAnswer) ...[
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: busy ? null : () => _accept(context, pending),
                  child: const Text('Accept'),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: busy
                            ? null
                            : () => _propose(context, from: pending),
                        child: const Text('Suggest different'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: busy
                            ? null
                            : () => _reject(context, pending),
                        child: const Text('Reject'),
                      ),
                    ),
                  ],
                ),
              ],
              if (responsibility.canWithdraw)
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: busy
                        ? null
                        : () => onAnswer(pending.id, 'WITHDRAW', null),
                    child: const Text('Withdraw proposal'),
                  ),
                ),
            ],
            if (pending == null && rejection != null) ...[
              if (agreement != null) const SizedBox(height: 12),
              _ProposalPanel(
                tone: _Tone.rejected,
                heading: agreement == null
                    ? 'Not agreed'
                    : 'Proposed change not agreed',
                proposal: rejection,
                meta:
                    '${rejection.respondedBy ?? 'The other side'} rejected '
                    'what ${rejection.proposedBy} proposed',
                note: rejection.responseNote,
              ),
            ],
            if (agreement == null && pending == null && rejection == null)
              _Panel(
                tone: _Tone.empty,
                child: Text(
                  'Agree who arranges this repair and who pays for it now, '
                  'so it is not an argument at check-out.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            if (pending == null && responsibility.canPropose) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: busy
                    ? null
                    : () => _propose(context, from: rejection ?? agreement),
                icon: const Icon(Icons.handshake_outlined),
                label: Text(
                  agreement != null
                      ? 'Propose a change'
                      : rejection != null
                      ? 'Make a new proposal'
                      : 'Propose who pays',
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

enum _Tone { agreed, pending, rejected, empty }

class _Panel extends StatelessWidget {
  const _Panel({required this.tone, required this.child});
  final _Tone tone;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final (background, border) = switch (tone) {
      _Tone.agreed => (KiviloColors.greenSoft, KiviloColors.greenBorder),
      _Tone.pending => (KiviloColors.amberSoft, KiviloColors.amberBorder),
      _Tone.rejected => (KiviloColors.redSoft, KiviloColors.redBorder),
      _Tone.empty => (KiviloColors.canvas, KiviloColors.border),
    };
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: child,
    );
  }
}

class _ProposalPanel extends StatelessWidget {
  const _ProposalPanel({
    required this.tone,
    required this.heading,
    required this.proposal,
    required this.meta,
    this.note,
  });

  final _Tone tone;
  final String heading;
  final ResponsibilityProposal proposal;
  final String meta;
  final String? note;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final (icon, color) = switch (tone) {
      _Tone.agreed => (Icons.check_circle_rounded, KiviloColors.green),
      _Tone.pending => (Icons.schedule_rounded, KiviloColors.amber),
      _ => (Icons.cancel_outlined, KiviloColors.red),
    };
    final why = [basisLabels[proposal.basis]!, ?proposal.clauseRef].join(' · ');
    return _Panel(
      tone: tone,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 6),
              Text(
                heading,
                style: TextStyle(
                  color: color,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(meta, style: text.bodySmall),
          const SizedBox(height: 2),
          Text(proposal.summary, style: text.titleMedium),
          const SizedBox(height: 8),
          Text(
            why,
            style: text.bodySmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Text(proposal.reason, style: text.bodyMedium),
          if (note != null) ...[
            const SizedBox(height: 8),
            Text('“$note”', style: text.bodyMedium),
          ],
        ],
      ),
    );
  }
}

class _Shares extends StatelessWidget {
  const _Shares({required this.shares});
  final CostShares shares;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      for (final (label, amount) in [
        ('Repair cost', shares.total),
        ('Tenant', shares.tenant),
        ('Landlord', shares.landlord),
      ]) ...[
        if (label != 'Repair cost') const SizedBox(width: 8),
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: KiviloColors.canvas,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: KiviloColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 2),
                Text(
                  'S\$$amount',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
          ),
        ),
      ],
    ],
  );
}

class _SummaryPanel extends StatelessWidget {
  const _SummaryPanel({required this.label, required this.text});
  final String label;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: KiviloColors.pinkSoft,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: KiviloColors.pinkBorder),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 4),
        Text(text, style: Theme.of(context).textTheme.titleMedium),
      ],
    ),
  );
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(text, style: Theme.of(context).textTheme.titleMedium),
  );
}

/// Pops with the request body, or null when cancelled. [from] prefills the form, so
/// a counter-offer starts from what the other side proposed.
class ProposalDrawer extends StatefulWidget {
  const ProposalDrawer({
    super.key,
    this.minorRepairCap,
    this.from,
    this.counter = false,
  });

  final String? minorRepairCap;
  final ResponsibilityProposal? from;
  final bool counter;

  @override
  State<ProposalDrawer> createState() => _ProposalDrawerState();
}

class _ProposalDrawerState extends State<ProposalDrawer> {
  late String _payer =
      widget.from?.payer ??
      (widget.minorRepairCap == null ? 'LANDLORD' : 'SHARED');
  late String _arrangedBy = widget.from?.arrangedBy ?? 'LANDLORD';
  late String _basis =
      widget.from?.basis ??
      (_payer == 'SHARED' ? 'MINOR_REPAIR_CLAUSE' : 'LANDLORD_OBLIGATION');
  late final _cap = TextEditingController(
    text: widget.from?.tenantCap ?? widget.minorRepairCap ?? '',
  );
  late final _reason = TextEditingController(
    text: widget.counter ? '' : widget.from?.reason ?? '',
  );
  late final _clause = TextEditingController(
    text: widget.from?.clauseRef ?? '',
  );

  @override
  void dispose() {
    _cap.dispose();
    _reason.dispose();
    _clause.dispose();
    super.dispose();
  }

  bool get _valid =>
      _reason.text.trim().isNotEmpty &&
      (_payer != 'SHARED' || _money.hasMatch(_cap.text.trim()));

  @override
  Widget build(BuildContext context) {
    final cap = _cap.text.trim();
    return KiviloDrawer(
      title: Text(
        widget.counter ? 'Suggest a different split' : 'Propose who pays',
      ),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _FieldLabel('Who pays?'),
          KiviloSegmentedControl<String>(
            value: _payer,
            options: const [
              KiviloSegmentOption(value: 'LANDLORD', label: 'Landlord'),
              KiviloSegmentOption(value: 'TENANT', label: 'Tenant'),
              KiviloSegmentOption(value: 'SHARED', label: 'Split'),
            ],
            onChanged: (value) => setState(() => _payer = value!),
          ),
          if (_payer == 'SHARED') ...[
            const SizedBox(height: 12),
            TextField(
              controller: _cap,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: InputDecoration(
                labelText: 'Tenant pays up to',
                prefixText: 'S\$ ',
                helperText:
                    widget.minorRepairCap != null &&
                        cap == widget.minorRepairCap
                    ? "From this tenancy's minor repair cap"
                    : 'Landlord pays anything above this',
              ),
              onChanged: (_) => setState(() {}),
            ),
          ],
          const SizedBox(height: 20),
          const _FieldLabel('Who arranges the repair?'),
          KiviloSegmentedControl<String>(
            value: _arrangedBy,
            options: const [
              KiviloSegmentOption(value: 'LANDLORD', label: 'Landlord'),
              KiviloSegmentOption(value: 'TENANT', label: 'Tenant'),
            ],
            onChanged: (value) => setState(() => _arrangedBy = value!),
          ),
          const SizedBox(height: 20),
          const _FieldLabel('Why?'),
          KiviloSelectField<String>(
            label: 'Basis',
            sheetTitle: 'Why this split?',
            value: _basis,
            options: [
              for (final entry in basisLabels.entries)
                KiviloSelectOption(value: entry.key, label: entry.value),
            ],
            onChanged: (value) => setState(() => _basis = value),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _reason,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Explain in a sentence',
              hintText: 'The other side sees this with your proposal',
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _clause,
            decoration: const InputDecoration(
              labelText: 'Contract clause (optional)',
              hintText: 'e.g. Clause 5(c)',
            ),
          ),
          const SizedBox(height: 16),
          _SummaryPanel(
            label: widget.counter
                ? 'They will read your counter-offer as'
                : 'They will read',
            text: describeProposal(
              arrangedBy: _arrangedBy,
              payer: _payer,
              tenantCap: cap.isEmpty ? '…' : cap,
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _valid
              ? () => Navigator.pop(context, {
                  'arrangedBy': _arrangedBy,
                  'payer': _payer,
                  'tenantCap': _payer == 'SHARED' ? cap : null,
                  'basis': _basis,
                  'reason': _reason.text.trim(),
                  'clauseRef': _clause.text.trim().isEmpty
                      ? null
                      : _clause.text.trim(),
                })
              : null,
          child: const Text('Send proposal'),
        ),
      ],
    );
  }
}

class _RejectDrawer extends StatefulWidget {
  const _RejectDrawer({required this.proposal});
  final ResponsibilityProposal proposal;

  @override
  State<_RejectDrawer> createState() => _RejectDrawerState();
}

class _RejectDrawerState extends State<_RejectDrawer> {
  final _note = TextEditingController();

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => KiviloDrawer(
    title: const Text('Reject this proposal'),
    content: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _SummaryPanel(
          label: 'You are rejecting',
          text: widget.proposal.summary,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _note,
          autofocus: true,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Why not?',
            hintText: 'Required. The other side sees this.',
          ),
          onChanged: (_) => setState(() {}),
        ),
      ],
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: _note.text.trim().isEmpty
            ? null
            : () => Navigator.pop(context, _note.text.trim()),
        child: const Text('Reject'),
      ),
    ],
  );
}
