import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/supporting_documents.dart';
import '../services/api.dart';
import '../services/capture_backend.dart';
import '../services/capture_queue.dart';
import '../services/supporting_document_photos.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/page_context_title.dart';
import '../ui/agreement_terms_view.dart';
import 'agreement_terms_screen.dart';

class SupportingDocumentsScreen extends StatefulWidget {
  const SupportingDocumentsScreen({
    super.key,
    required this.tenancyId,
    this.initialRequestId,
    this.api,
    this.photos,
    this.openUrl,
  });

  final String tenancyId;
  final String? initialRequestId;
  final Api? api;
  final SupportingDocumentPhotos? photos;
  final Future<void> Function(Uri)? openUrl;

  @override
  State<SupportingDocumentsScreen> createState() =>
      _SupportingDocumentsScreenState();
}

class _SupportingDocumentsScreenState extends State<SupportingDocumentsScreen>
    with WidgetsBindingObserver {
  late final _api = widget.api ?? Api();
  late final String? _ownerId;
  late final _photos =
      widget.photos ??
      SupportingDocumentPhotos(api: _api, tenancyId: widget.tenancyId);
  SupportingDocuments? _data;
  Map<String, List<PendingCapture>> _pending = {};
  String? _error;
  bool _loading = true;
  bool _busy = false;
  bool _showPreviousAgreements = false;
  bool _showOtherDocuments = false;
  bool _focusedInitialRequest = false;
  final _initialRequestKey = GlobalKey();
  StreamSubscription<EvidenceSyncUpdate>? _updates;

  @override
  void initState() {
    super.initState();
    // Capture the account before any picker, network request or browser round-trip.
    _ownerId = _api.currentOwnerId;
    _data = _api.retainedView<SupportingDocuments>(
      'documents:${widget.tenancyId}',
    );
    _loading = _data == null;
    _showOtherDocuments = widget.initialRequestId?.isNotEmpty == true;
    WidgetsBinding.instance.addObserver(this);
    _updates = evidenceSyncUpdates.listen((update) {
      if (!_busy &&
          update.stage == EvidenceSyncStage.complete &&
          _pending.values
              .expand((rows) => rows)
              .any((row) => row.clientId == update.clientId)) {
        unawaited(_load());
      }
    });
    unawaited(_load());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_busy) unawaited(_load());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_updates?.cancel());
    super.dispose();
  }

  Future<void> _load() async {
    try {
      await _photos.recover();
      final data = await _api.supportingDocuments(
        widget.tenancyId,
        ownerId: _ownerId,
      );
      final pending = await _photos.pending([
        agreementQueueTarget,
        ?data.agreement.requestId,
        ...data.requests.map((request) => request.id),
      ]);
      if (_api.currentOwnerId != _ownerId) {
        throw const ApiFailure('Account changed. Open this page again.', 401);
      }
      if (mounted) {
        setState(() {
          _data = data;
          _pending = pending;
          _error = null;
        });
        _api.retainView('documents:${widget.tenancyId}', data);
        if (!_focusedInitialRequest &&
            data.requests.any(
              (request) => request.id == widget.initialRequestId,
            )) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            final target = _initialRequestKey.currentContext;
            if (mounted && target != null) {
              _focusedInitialRequest = true;
              unawaited(Scrollable.ensureVisible(target, alignment: 0.1));
            }
          });
        }
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = plainError(error);
          if (error is ApiFailure &&
              (error.statusCode == 401 || error.statusCode == 404)) {
            _data = null;
            _pending = {};
            _api.forgetRetainedView('documents:${widget.tenancyId}');
          }
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _run(
    Future<void> Function() operation, {
    bool refresh = false,
  }) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await operation();
      if (refresh) await _load();
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = plainError(error);
          if (error is ApiFailure &&
              (error.statusCode == 401 || error.statusCode == 404)) {
            _data = null;
            _pending = {};
            _api.forgetRetainedView('documents:${widget.tenancyId}');
          }
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _launch(Uri uri) async {
    if (_api.currentOwnerId != _ownerId) {
      throw const ApiFailure('Account changed. Open this page again.', 401);
    }
    if (widget.openUrl != null) return widget.openUrl!(uri);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      throw const ApiFailure('Could not open this file. Try again.', null);
    }
  }

  Future<void> _request() async {
    final title = TextEditingController(text: 'Payment proof');
    final clientId = newCaptureId();
    bool saving = false;
    String? error;
    final result = await showKiviloDrawer<SupportingDocuments>(
      context: context,
      builder: (drawerContext) => StatefulBuilder(
        builder: (context, setDrawerState) => KiviloDrawer(
          title: const Text('Request another document'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Ask the tenant for an optional supporting file.'),
              const SizedBox(height: 16),
              TextField(
                controller: title,
                enabled: !saving,
                maxLength: 120,
                decoration: const InputDecoration(labelText: 'Document'),
              ),
              if (error != null)
                Text(error!, style: const TextStyle(color: KiviloColors.red)),
            ],
          ),
          actions: [
            TextButton(
              onPressed: saving ? null : () => Navigator.pop(drawerContext),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: saving
                  ? null
                  : () async {
                      if (title.text.trim().isEmpty) {
                        setDrawerState(() => error = 'Enter a document name.');
                        return;
                      }
                      setDrawerState(() {
                        saving = true;
                        error = null;
                      });
                      try {
                        final data = await _api.requestSupportingDocument(
                          widget.tenancyId,
                          clientId: clientId,
                          title: title.text.trim(),
                          ownerId: _ownerId,
                        );
                        if (drawerContext.mounted) {
                          Navigator.pop(drawerContext, data);
                        }
                      } catch (failure) {
                        if (drawerContext.mounted) {
                          setDrawerState(() {
                            saving = false;
                            error = plainError(failure);
                          });
                        }
                      }
                    },
              child: Text(saving ? 'Requesting…' : 'Request'),
            ),
          ],
        ),
      ),
    );
    // The drawer's route still animates out using this controller.
    await Future<void>.delayed(const Duration(milliseconds: 350));
    title.dispose();
    if (result != null && mounted) {
      _api.retainView('documents:${widget.tenancyId}', result);
      setState(() => _data = result);
      await _load();
    }
  }

  Future<void> _addPhoto(String requestId, ImageSource source) =>
      _run(() async {
        final uploaded = await _photos.add(requestId, source);
        if (uploaded == false && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Photo saved on this phone. It will upload when you reconnect.',
              ),
            ),
          );
        }
        final data = _data;
        if (data != null) {
          final pending = await _photos.pending([
            agreementQueueTarget,
            ?data.agreement.requestId,
            ...data.requests.map((request) => request.id),
          ]);
          if (mounted) setState(() => _pending = pending);
        }
      }, refresh: true);

  String _submittedAt(String iso) {
    final date = DateTime.parse(iso).toLocal();
    return '${shortDate(iso)} at ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  Future<void> _reviewClause(SupportingDocuments data) async {
    final updated = await Navigator.of(context).push<SupportingDocuments>(
      MaterialPageRoute(
        builder: (_) => AgreementTermsScreen(
          tenancyId: widget.tenancyId,
          agreement: data.agreement,
          api: _api,
          ownerId: _ownerId,
          openUrl: widget.openUrl,
        ),
      ),
    );
    if (updated != null && mounted) {
      setState(() => _data = updated);
      await _load();
    }
  }

  Future<void> _openBrowser({
    bool agreement = false,
    String? requestId,
  }) => _run(
    () => _launch(
      Uri.parse(_api.dio.options.baseUrl)
          .resolve(
            '/tenancies/${widget.tenancyId}/documents${agreement ? '#tenancy-agreement' : ''}',
          )
          .replace(
            queryParameters: requestId == null
                ? null
                : {'requestId': requestId},
          ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final otherPending =
        _data?.requests.fold<int>(
          0,
          (count, request) => count + (_pending[request.id]?.length ?? 0),
        ) ??
        0;
    return Scaffold(
      appBar: AppBar(
        title: PageContextTitle(
          title: 'Documents',
          contextLabel: _data?.propertyLabel ?? '',
        ),
      ),
      body: KiviloContent(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: _data == null && _error != null
                    ? KiviloMessage(
                        icon: Icons.error_outline,
                        title: 'Could not load documents',
                        body: _error!,
                        actionLabel: 'Try again',
                        onAction: _busy ? null : _load,
                      )
                    : SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: kiviloScreenPadding,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (_error != null) ...[
                              KiviloNotice(
                                tone: KiviloTone.error,
                                child: Text(_error!),
                              ),
                              const SizedBox(height: 8),
                              OutlinedButton(
                                onPressed: _busy ? null : _load,
                                child: const Text('Try again'),
                              ),
                              const SizedBox(height: 12),
                            ],
                            if (_data case final data?) ...[
                              Text(
                                '${data.tenantName} · ${shortDate(data.startDate)} to ${shortDate(data.endDate)}',
                              ),
                              const SizedBox(height: kiviloHeadingGap),
                              _agreementCard(data),
                              const SizedBox(height: kiviloSectionGap),
                              TextButton(
                                onPressed: () => setState(
                                  () => _showOtherDocuments =
                                      !_showOtherDocuments,
                                ),
                                child: Text(
                                  '${_showOtherDocuments ? 'Hide other documents' : 'Other documents'} (${data.requests.length})',
                                ),
                              ),
                              if (!_showOtherDocuments && otherPending > 0)
                                Text(
                                  '$otherPending ${otherPending == 1 ? 'photo' : 'photos'} saved on this phone, waiting to upload.',
                                ),
                              if (_showOtherDocuments) ...[
                                const Text(
                                  'Optional supporting files for this tenancy',
                                ),
                                const SizedBox(height: 12),
                                if (data.canRequest) ...[
                                  OutlinedButton(
                                    onPressed: _busy ? null : _request,
                                    child: const Text(
                                      'Request another document',
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                ],
                                for (final request in data.requests)
                                  _requestCard(request),
                                if (data.requests.isEmpty)
                                  const Text('No other documents requested.'),
                              ],
                              const SizedBox(height: 24),
                              const Text(
                                'Private to the tenant, landlord and agents with access to this tenancy.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: KiviloColors.subtle,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
              ),
      ),
    );
  }

  Widget _agreementCard(SupportingDocuments data) {
    final agreement = data.agreement;
    final current = agreement.files
        .where((file) => file.id == agreement.currentFileId)
        .toList();
    final previous = agreement.files
        .where((file) => file.id != agreement.currentFileId)
        .toList();
    final pending = [
      ...?_pending[agreementQueueTarget],
      if (agreement.requestId != null) ...?_pending[agreement.requestId],
    ];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Tenancy agreement',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              agreement.files.isEmpty
                  ? 'Keep the signed agreement with this property.'
                  : agreement.canReview
                  ? 'Your agreement and reviewed repair terms.'
                  : 'Your agreement for this tenancy.',
            ),
            if (agreement.requestId case final requestId?) ...[
              if (current.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Current agreement',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                ..._files(requestId, current),
              ],
              if (previous.isNotEmpty) ...[
                TextButton(
                  onPressed: () => setState(
                    () => _showPreviousAgreements = !_showPreviousAgreements,
                  ),
                  child: Text(
                    '${_showPreviousAgreements ? 'Hide previous agreements' : 'Previous agreements'} (${previous.length})',
                  ),
                ),
                if (_showPreviousAgreements) ..._files(requestId, previous),
              ],
            ],
            ..._pendingPhotos(pending),
            if (agreement.canUpload) ...[
              const SizedBox(height: kiviloButtonGap),
              FilledButton(
                onPressed: _busy ? null : () => _openBrowser(agreement: true),
                child: Text(
                  agreement.files.isEmpty
                      ? 'Upload tenancy agreement'
                      : 'Upload a newer agreement',
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Upload a PDF in your browser, or add a photo below.',
                style: TextStyle(fontSize: 12, color: KiviloColors.subtle),
              ),
              const SizedBox(height: 8),
              _photoButtons(agreementQueueTarget),
            ],
            if (agreement.terms case final terms?) ...[
              const Divider(height: 32),
              AgreementTermsView(
                terms: terms,
                matchesCurrentAgreement: agreement.termsMatchCurrentFile,
              ),
            ] else if (data.currentMinorRepairCap case final cap?) ...[
              const SizedBox(height: 16),
              Text('Current minor repair cap: S\$$cap per repair'),
            ],
            if (agreement.canReview && agreement.currentFileId != null) ...[
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: _busy ? null : () => _reviewClause(data),
                child: const Text('Review maintenance clause'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  List<Widget> _files(String requestId, List<SupportingDocumentFile> files) => [
    for (final file in files)
      ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(file.fileName),
        subtitle: Text(
          '${file.submittedBy} · ${_submittedAt(file.submittedAt)}',
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: _busy
            ? null
            : () => _run(() async {
                final url = await _api.supportingDocumentUrl(
                  widget.tenancyId,
                  requestId,
                  file.id,
                  ownerId: _ownerId,
                );
                await _launch(Uri.parse(url));
              }),
      ),
  ];

  List<Widget> _pendingPhotos(List<PendingCapture> pending) => [
    if (pending.isNotEmpty) ...[
      const SizedBox(height: 12),
      Text(
        '${pending.length} ${pending.length == 1 ? 'photo' : 'photos'} saved on this phone, waiting to upload.',
      ),
      for (final error
          in pending.map((row) => row.lastError).whereType<String>().toSet())
        Text(error, style: Theme.of(context).textTheme.bodySmall),
      OutlinedButton(
        onPressed: _busy ? null : () => _run(_photos.retry, refresh: true),
        child: const Text('Retry upload'),
      ),
    ],
  ];

  Widget _photoButtons(String requestId) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      OutlinedButton(
        onPressed: _busy
            ? null
            : () => _addPhoto(requestId, ImageSource.camera),
        child: const Text('Take photo'),
      ),
      const SizedBox(height: kiviloButtonGap),
      OutlinedButton(
        onPressed: _busy
            ? null
            : () => _addPhoto(requestId, ImageSource.gallery),
        child: const Text('Choose photo'),
      ),
    ],
  );

  Widget _requestCard(SupportingDocumentRequest request) => Card(
    key: request.id == widget.initialRequestId ? _initialRequestKey : null,
    margin: const EdgeInsets.only(bottom: 16),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(request.title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 6),
          Text(
            'Requested by ${request.requestedBy} · ${shortDate(request.requestedAt)}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          if (request.files.isEmpty)
            Text(
              request.canUpload
                  ? 'Upload the requested document below.'
                  : 'Waiting for the tenant to upload',
            ),
          ..._files(request.id, request.files),
          ..._pendingPhotos(_pending[request.id] ?? const []),
          if (request.canUpload) ...[
            const SizedBox(height: kiviloButtonGap),
            _photoButtons(request.id),
            const SizedBox(height: kiviloButtonGap),
            TextButton(
              onPressed: _busy
                  ? null
                  : () => _openBrowser(requestId: request.id),
              child: const Text('Upload a PDF in browser'),
            ),
          ],
        ],
      ),
    ),
  );
}
