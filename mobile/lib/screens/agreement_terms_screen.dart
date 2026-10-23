import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/supporting_documents.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';

class AgreementTermsScreen extends StatefulWidget {
  const AgreementTermsScreen({
    super.key,
    required this.tenancyId,
    required this.agreement,
    required this.api,
    required this.ownerId,
    this.openUrl,
  });
  final String tenancyId;
  final TenancyAgreement agreement;
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
      appBar: AppBar(title: const Text('Review maintenance clause')),
      body: KiviloContent(
        child: _accessLost
            ? KiviloMessage(
                icon: Icons.error_outline,
                title: 'Could not open this agreement',
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
                    const Text(
                      'Check the clause against the agreement before confirming the repair terms.',
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: _busy ? null : _openFile,
                      child: const Text('Open agreement'),
                    ),
                    const SizedBox(height: 16),
                    if (_loading) const LinearProgressIndicator(),
                    if (_analysis case final analysis?) ...[
                      if (analysis.candidates.isNotEmpty) ...[
                        const KiviloSectionHeading(title: 'Clauses to review'),
                        const SizedBox(height: kiviloHeadingGap),
                        for (final clause in analysis.candidates)
                          Card(
                            child: ListTile(
                              title: Text('Page ${clause.page}'),
                              subtitle: Text(
                                clause.text,
                                maxLines: 4,
                                overflow: TextOverflow.ellipsis,
                              ),
                              trailing: const Icon(Icons.chevron_right),
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
                        const SizedBox(height: 16),
                      ] else ...[
                        const Text(
                          'No clause was found in the readable text. Open the agreement and enter the source clause below.',
                        ),
                        const SizedBox(height: 16),
                      ],
                    ],
                    TextField(
                      controller: _page,
                      enabled: !_busy,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Source page',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _quote,
                      enabled: !_busy,
                      minLines: 4,
                      maxLines: 10,
                      maxLength: 12000,
                      decoration: const InputDecoration(
                        labelText: 'Exact clause from the agreement',
                      ),
                    ),
                    const SizedBox(height: kiviloSectionGap),
                    const KiviloSectionHeading(title: 'Repair rule'),
                    const SizedBox(height: kiviloHeadingGap),
                    KiviloSegmentedControl<String>(
                      value: _rule,
                      options: const [
                        KiviloSegmentOption(
                          value: 'FIRST_AMOUNT',
                          label: 'First amount',
                        ),
                        KiviloSegmentOption(
                          value: 'OTHER',
                          label: 'Another rule',
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
                        decoration: const InputDecoration(
                          labelText: 'Tenant pays the first',
                          prefixText: 'S\$ ',
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
                            ? 'Explain the repair rule'
                            : 'Notes and exceptions (optional)',
                      ),
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: _busy ? null : _confirm,
                      child: Text(_busy ? 'Saving…' : 'Confirm repair terms'),
                    ),
                  ],
                ],
              ),
      ),
    ),
  );
}
