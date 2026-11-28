import '../l10n/l10n.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/supporting_documents.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';

class AgreementTermsScreen extends StatefulWidget {
  const AgreementTermsScreen({
    super.key,
    required this.tenancyId,
    required this.agreement,
    required this.currency,
    required this.api,
    required this.ownerId,
    this.openUrl,
  });
  final String tenancyId;
  final TenancyAgreement agreement;

  /// The tenancy's, which the agreement's amounts are in.
  final String currency;
  final Api api;
  final String? ownerId;
  final Future<void> Function(Uri)? openUrl;

  @override
  State<AgreementTermsScreen> createState() => _AgreementTermsScreenState();
}

class _AgreementTermsScreenState extends State<AgreementTermsScreen> {
  final _page = TextEditingController();
  final _quote = TextEditingController();
  final _cap = TextEditingController();
  final _notes = TextEditingController();
  AgreementClauseAnalysis? _analysis;
  String? _rule;
  String? _error;
  bool _loading = true;
  bool _busy = false;
  bool _accessLost = false;

  @override
  void initState() {
    super.initState();
    final terms = widget.agreement.terms;
    if (terms != null && widget.agreement.termsMatchCurrentFile) {
      _page.text = '${terms.page}';
      _quote.text = terms.quote;
      _cap.text = terms.tenantCap ?? '';
      _notes.text = terms.notes ?? '';
      _rule = terms.rule;
    }
    unawaited(_analyze());
  }

  @override
  void dispose() {
    _page.dispose();
    _quote.dispose();
    _cap.dispose();
    _notes.dispose();
    super.dispose();
  }

  void _failed(Object failure) {
    if (!mounted) return;
    setState(() {
      _error = plainError(failure);
      _accessLost =
          failure is ApiFailure &&
          (failure.statusCode == 401 || failure.statusCode == 404);
    });
  }

  Future<void> _analyze() async {
    try {
      final result = await widget.api.agreementClauseAnalysis(
        widget.tenancyId,
        widget.agreement.currentFileId!,
        ownerId: widget.ownerId,
      );
      if (mounted) {
        setState(() {
          _analysis = result;
          _accessLost = false;
          _error = null;
        });
      }
    } catch (error) {
      _failed(error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openFile() async {
    setState(() => _busy = true);
    try {
      final url = Uri.parse(
        await widget.api.supportingDocumentUrl(
          widget.tenancyId,
          widget.agreement.requestId!,
          widget.agreement.currentFileId!,
          ownerId: widget.ownerId,
        ),
      );
      if (widget.api.currentOwnerId != widget.ownerId) {
        throw const ApiFailure('Account changed. Open this page again.', 401);
      }
      if (widget.openUrl != null) {
        await widget.openUrl!(url);
      } else if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
        throw const ApiFailure(
          'Could not open the agreement. Try again.',
          null,
        );
      }
    } catch (error) {
      _failed(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    final page = int.tryParse(_page.text.trim());
    if (page == null ||
        page < 1 ||
        page > 10000 ||
        _quote.text.trim().isEmpty ||
        _rule == null ||
        (_rule == 'FIRST_AMOUNT' &&
            !RegExp(r'^\d{1,8}(?:\.\d{1,2})?$').hasMatch(_cap.text.trim())) ||
        (_rule == 'OTHER' && _notes.text.trim().isEmpty)) {
      setState(
        () => _error =
            'Enter the source page and clause, then confirm the repair rule and its amount or notes.',
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await widget.api.confirmAgreementTerms(widget.tenancyId, {
        'fileId': widget.agreement.currentFileId,
        'page': page,
        'quote': _quote.text.trim(),
        'rule': _rule,
        'tenantCap': _rule == 'FIRST_AMOUNT' ? _cap.text.trim() : null,
        'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      }, ownerId: widget.ownerId);
      if (mounted) Navigator.pop(context, result);
    } catch (error) {
      _failed(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: Scaffold(
      appBar: AppBar(title: Text(t.repairTerms)),
      body: KiviloContent(
        child: _accessLost
            ? KiviloMessage(
                icon: Icons.error_outline,
                title: t.couldNotOpenThisAgreement,
                body: _error!,
                actionLabel: 'Try again',
                onAction: _busy ? null : _analyze,
              )
            : ListView(
                padding: kiviloScreenPadding,
                children: [
                  if (_error != null) ...[
                    KiviloNotice(tone: KiviloTone.error, child: Text(_error!)),
                    const SizedBox(height: 16),
                  ],
                  if (!_accessLost) ...[
                    Text(t.checkTheClauseAgainstTheAgreementBefore),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: _busy ? null : _openFile,
                      child: Text(t.openAgreement),
                    ),
                    const SizedBox(height: 16),
                    if (_loading) const LinearProgressIndicator(),
                    if (_analysis case final analysis?) ...[
                      if (analysis.candidates.isNotEmpty) ...[
                        KiviloSectionHeading(
                          title: t.clausesToReview,
                          subtitle: t.selectAClauseToFillInThe,
                        ),
                        const SizedBox(height: kiviloHeadingGap),
                        for (final clause in analysis.candidates)
                          Padding(
                            padding: const EdgeInsets.only(
                              bottom: kiviloButtonGap,
                            ),
                            child: Card(
                              child: ListTile(
                                selected:
                                    _page.text == '${clause.page}' &&
                                    _quote.text == clause.text,
                                title: Text('Page ${clause.page}'),
                                subtitle: Text(
                                  clause.text,
                                  maxLines: 4,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                trailing: Icon(
                                  _page.text == '${clause.page}' &&
                                          _quote.text == clause.text
                                      ? Icons.check_circle
                                      : Icons.circle_outlined,
                                  semanticLabel:
                                      _page.text == '${clause.page}' &&
                                          _quote.text == clause.text
                                      ? 'Selected clause'
                                      : 'Use clause',
                                ),
                                onTap: _busy
                                    ? null
                                    : () => setState(() {
                                        _page.text = '${clause.page}';
                                        _quote.text = clause.text;
                                        _cap.text =
                                            clause.suggestedTenantCap ?? '';
                                      }),
                              ),
                            ),
                          ),
                        const SizedBox(height: 16),
                      ] else ...[
                        Text(t.noClauseWasFoundInTheReadable),
                        const SizedBox(height: 16),
                      ],
                    ],
                    TextField(
                      controller: _page,
                      enabled: !_busy,
                      onChanged: (_) => setState(() {}),
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: t.sourcePage),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _quote,
                      enabled: !_busy,
                      onChanged: (_) => setState(() {}),
                      minLines: 4,
                      maxLines: 10,
                      maxLength: 12000,
                      decoration: InputDecoration(labelText: t.clauseText),
                    ),
                    const SizedBox(height: kiviloSectionGap),
                    KiviloSectionHeading(title: t.repairRule),
                    const SizedBox(height: kiviloHeadingGap),
                    KiviloSegmentedControl<String>(
                      value: _rule,
                      options: [
                        KiviloSegmentOption(
                          value: 'FIRST_AMOUNT',
                          label: t.firstAmount,
                        ),
                        KiviloSegmentOption(
                          value: 'OTHER',
                          label: t.anotherRule,
                        ),
                      ],
                      onChanged: _busy
                          ? null
                          : (rule) => setState(() => _rule = rule),
                    ),
                    if (_rule == 'FIRST_AMOUNT') ...[
                      const SizedBox(height: 12),
                      TextField(
                        controller: _cap,
                        enabled: !_busy,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: InputDecoration(
                          labelText: t.tenantPaysTheFirst,
                          prefixText: '${currencySymbol(widget.currency)} ',
                          helperText: 'Per repair; landlord pays the rest',
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextField(
                      controller: _notes,
                      enabled: !_busy,
                      minLines: 2,
                      maxLines: 5,
                      maxLength: 2000,
                      decoration: InputDecoration(
                        labelText: _rule == 'OTHER'
                            ? t.explainTheRepairRule
                            : t.notesAndExceptionsOptional,
                      ),
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: _busy ? null : _confirm,
                      child: Text(_busy ? t.saving : t.confirmRepairTerms),
                    ),
                  ],
                ],
              ),
      ),
    ),
  );
}
