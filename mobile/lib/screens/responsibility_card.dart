import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../models/maintenance.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';

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
        title: Text(t.acceptSplitTitle),
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SummaryPanel(label: t.youAreAgreeingTo, text: proposal.terms),
            const SizedBox(height: 12),
            Text(
              t.acceptSplitBody,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(t.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(t.accept),
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
        ? t.notAgreedYet
        : pending == null
        ? t.agreedByBoth
        : t.agreedChangeProposed;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            KiviloSectionHeading(title: t.whoPays, subtitle: subtitle),
            const SizedBox(height: 14),
            if (agreement != null) ...[
              _ProposalPanel(
                tone: _Tone.agreed,
                heading: t.agreed,
                proposal: agreement,
                meta: agreement.respondedBy == null
                    ? t.proposedBy(agreement.proposedBy)
                    : t.proposedAcceptedBy(agreement.proposedBy, '${agreement.respondedBy}'),
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
                    ? t.answerNeeded
                    : responsibility.canWithdraw
                    ? (role == 'TENANT' ? t.waitingForLandlord : t.waitingForTenant)
                    : t.waitingForAnswer,
                proposal: pending,
                meta: agreement == null
                    ? t.partyProposes('${partyLabels[pending.side]}')
                    : t.partyProposesChange('${partyLabels[pending.side]}'),
              ),
              if (responsibility.canAnswer) ...[
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: busy ? null : () => _accept(context, pending),
                  child: Text(t.accept),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: busy
                            ? null
                            : () => _propose(context, from: pending),
                        child: Text(t.suggestDifferent),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: busy
                            ? null
                            : () => _reject(context, pending),
                        child: Text(t.reject),
                      ),
                    ),
                  ],
                ),
              ],
              if (responsibility.canWithdraw)
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: busy
                        ? null
                        : () => onAnswer(pending.id, 'WITHDRAW', null),
                    child: Text(t.withdrawProposal),
                  ),
                ),
            ],
            if (pending == null && rejection != null) ...[
              if (agreement != null) const SizedBox(height: 12),
              _ProposalPanel(
                tone: _Tone.rejected,
                heading: agreement == null
                    ? t.notAgreed
                    : t.changeNotAgreed,
                proposal: rejection,
                meta:
                    t.rejectedWhatProposed(rejection.respondedBy ?? t.theOtherSide, rejection.proposedBy),
                note: rejection.responseNote,
              ),
            ],
            if (agreement == null && pending == null && rejection == null)
              _Panel(
                tone: _Tone.empty,
                child: Text(
                  t.agreeWhoPaysNow,
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
                      ? t.proposeChange
                      : rejection != null
                      ? t.makeNewProposal
                      : t.proposeWhoPays,
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
      _Tone.agreed => (KiviloColors.greenSoft, const Color(0xFFA7F3D0)),
      _Tone.pending => (KiviloColors.amberSoft, const Color(0xFFFDE68A)),
      _Tone.rejected => (KiviloColors.redSoft, const Color(0xFFFECACA)),
      _Tone.empty => (KiviloColors.canvas, KiviloColors.border),
    };
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(14),
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
          Text(proposal.terms, style: text.titleMedium),
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
        (t.repairCost, shares.total),
        (t.tenant, shares.tenant),
        (t.landlord, shares.landlord),
      ]) ...[
        if (label != t.repairCost) const SizedBox(width: 8),
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
                  t.money(amount),
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
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: const Color(0xFFFBCFE8)),
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
        widget.counter ? t.suggestDifferentSplit : t.proposeWhoPays,
      ),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _FieldLabel(t.whoPaysQuestion),
          KiviloSegmentedControl<String>(
            value: _payer,
            options: [
              KiviloSegmentOption(value: 'LANDLORD', label: t.landlord),
              KiviloSegmentOption(value: 'TENANT', label: t.tenant),
              KiviloSegmentOption(value: 'SHARED', label: t.split),
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
                labelText: t.minorRepairCapLabel,
                prefixText: t.currencyPrefix,
                helperText:
                    widget.minorRepairCap != null &&
                        cap == widget.minorRepairCap
                    ? t.fromMinorRepairCap
                    : t.landlordPaysAbove,
              ),
              onChanged: (_) => setState(() {}),
            ),
          ],
          const SizedBox(height: 20),
          _FieldLabel(t.whoArranges),
          KiviloSegmentedControl<String>(
            value: _arrangedBy,
            options: [
              KiviloSegmentOption(value: 'LANDLORD', label: t.landlord),
              KiviloSegmentOption(value: 'TENANT', label: t.tenant),
            ],
            onChanged: (value) => setState(() => _arrangedBy = value!),
          ),
          const SizedBox(height: 20),
          _FieldLabel(t.why),
          KiviloSelectField<String>(
            label: t.basis,
            sheetTitle: t.whyThisSplit,
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
            decoration: InputDecoration(
              labelText: t.explainSentence,
              hintText: t.otherSideSees,
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _clause,
            decoration: InputDecoration(
              labelText: t.clauseOptional,
              hintText: t.clauseHint,
            ),
          ),
          const SizedBox(height: 16),
          _SummaryPanel(
            label: widget.counter
                ? t.theyReadCounter
                : t.theyRead,
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
          child: Text(t.cancel),
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
          child: Text(t.sendProposal),
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
    title: Text(t.rejectProposalTitle),
    content: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _SummaryPanel(
          label: t.youAreRejecting,
          text: widget.proposal.terms,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _note,
          autofocus: true,
          minLines: 2,
          maxLines: 4,
          decoration: InputDecoration(
            labelText: t.whyNot,
            hintText: t.whyNotHint,
          ),
          onChanged: (_) => setState(() {}),
        ),
      ],
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: Text(t.cancel),
      ),
      FilledButton(
        onPressed: _note.text.trim().isEmpty
            ? null
            : () => Navigator.pop(context, _note.text.trim()),
        child: Text(t.reject),
      ),
    ],
  );
}
