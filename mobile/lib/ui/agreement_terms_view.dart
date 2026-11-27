import '../l10n/l10n.dart';
import 'package:flutter/material.dart';

import '../models/supporting_documents.dart';
import 'kivilo_components.dart';
import 'kivilo_format.dart';
import 'kivilo_layout.dart';

/// The reviewed source stays beside the saved repair term wherever it is used.
class AgreementTermsView extends StatefulWidget {
  const AgreementTermsView({
    super.key,
    required this.terms,
    required this.currency,
    this.matchesCurrentAgreement,
  });
  final AgreementTerms terms;
  final String currency;
  final bool? matchesCurrentAgreement;

  @override
  State<AgreementTermsView> createState() => _AgreementTermsViewState();
}

class _AgreementTermsViewState extends State<AgreementTermsView> {
  bool _showSource = false;

  @override
  Widget build(BuildContext context) {
    final terms = widget.terms;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          terms.summary(widget.currency),
          style: Theme.of(context).textTheme.titleSmall,
        ),
        if (terms.notes case final notes? when notes.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(notes),
        ],
        const SizedBox(height: 6),
        Text(
          '${terms.sourceFileName ?? 'Tenancy agreement'} · Page ${terms.page}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        Text(
          'Confirmed by ${terms.confirmedBy} · ${shortDate(terms.confirmedAt)}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        if (!(widget.matchesCurrentAgreement ??
            terms.matchesCurrentAgreement)) ...[
          const SizedBox(height: 6),
          KiviloNotice(
            tone: KiviloTone.warning,
            child: Text(t.theseTermsReferToAPreviousAgreement),
          ),
        ],
        const SizedBox(height: kiviloButtonGap),
        TextButton(
          onPressed: () => setState(() => _showSource = !_showSource),
          child: Text(_showSource ? t.hideSourceClause : t.showSourceClause),
        ),
        if (_showSource) ...[
          const SizedBox(height: kiviloHeadingGap),
          SelectableText(terms.quote),
        ],
      ],
    );
  }
}
