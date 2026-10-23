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
    this.matchesCurrentAgreement,
  });
  final AgreementTerms terms;
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
        Text(terms.summary, style: Theme.of(context).textTheme.titleSmall),
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
          const KiviloNotice(
            tone: KiviloTone.warning,
            child: Text(
              'These terms refer to a previous agreement. Review the latest file to update them.',
            ),
          ),
        ],
        const SizedBox(height: kiviloButtonGap),
        TextButton(
          onPressed: () => setState(() => _showSource = !_showSource),
          child: Text(
            _showSource ? 'Hide source clause' : 'Show source clause',
          ),
        ),
        if (_showSource) ...[
          const SizedBox(height: kiviloHeadingGap),
          SelectableText(terms.quote),
        ],
      ],
    );
  }
}
