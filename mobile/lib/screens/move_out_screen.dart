import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

import '../models/agency.dart';
import '../services/api.dart';
import '../services/capture_queue.dart';
import '../services/capture_store.dart';
import '../services/read_cache.dart';
import '../ui/kivilo_components.dart';

class MoveOutScreen extends StatefulWidget {
  const MoveOutScreen({
    super.key,
    required this.api,
    this.agency,
    required this.country,
    this.cache,
    this.queue,
  });
  final Api api;
  final AgencySummary? agency;
  final String country;
  final ReadCache? cache;
  final CaptureQueue? queue;
  @override
  State<MoveOutScreen> createState() => _MoveOutScreenState();
}

class _MoveOutScreenState extends State<MoveOutScreen> {
  late final cache = widget.cache ?? ReadCache();
  late final owner = cache.ownerId;
  late final queue = widget.queue ?? CaptureQueue();
  final form = GlobalKey<FormState>();
  late String visitId = newCaptureId();
  String? reportId, visitedAt;
  String step = 'address', address = '', term = '';
  List<Map<String, dynamic>> targets = [], issues = [];
  Map<String, dynamic>? editing, pickerIntent;
  Map<String, String> details = {};
  List<PendingCapture> photos = [];
  bool busy = false, loaded = false;
  String? error, targetError;
  Future<void> writes = Future.value();
  String get key => 'move-out-visit:${widget.agency?.id ?? 'personal'}';
  String get stage => 'move-out-draft:$visitId';
  Map<String, dynamic>? get selected =>
      targets.where((t) => t['id'] == term).firstOrNull;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  @override
  void dispose() {
    if (widget.queue == null) unawaited(queue.close());
    super.dispose();
  }

  Future<void> _load() async {
    try {
      if (owner == null) throw StateError('Sign in to save your walkthrough.');
      final data = await cache.readForOwner(owner!, key);
      if (!mounted) return;
      if (data is Map) {
        visitId = data['id'];
        address = data['address'];
        term = data['term'];
        step = data['step'];
        reportId = data['reportId'];
        visitedAt = data['visitedAt'];
        details = Map<String, String>.from(data['details']);
        issues = (data['issues'] as List)
            .map((i) => Map<String, dynamic>.from(i))
            .toList();
        editing = data['editing'] == null
            ? null
            : Map<String, dynamic>.from(data['editing']);
        pickerIntent = data['picker'];
        photos = await queue.forRoom(stage, owner!);
        if (pickerIntent != null) await _recoverPicked();
      }
      if (!mounted) return;
      setState(() => loaded = true);
      try {
        final rows = await widget.api.moveOutTargets(widget.agency?.id);
        if (mounted) setState(() => targets = rows);
      } catch (_) {
        if (mounted) {
          setState(
            () => targetError =
                'Connect to see existing tenancies. You can start a new address here.',
          );
        }
      }
    } catch (e) {
      if (mounted) setState(() => error = plainError(e));
    }
  }

  Future<void> _persist() {
    final encoded = jsonEncode({
      'id': visitId,
      'address': address,
      'term': term,
      'step': step,
      'reportId': reportId,
      'visitedAt': visitedAt,
      'issues': issues,
      'editing': editing,
      'details': details,
      'picker': pickerIntent,
    });
    final write = writes.then((_) async {
      if (owner == null ||
          owner != cache.ownerId ||
          !await cache.writeForOwner(owner!, key, jsonDecode(encoded))) {
        throw StateError(
          'Could not save on this device. Retry before leaving the visit.',
        );
      }
    });
    writes = write.catchError((Object e) {
      if (mounted) setState(() => error = plainError(e));
    });
    return write;
  }

  void _change(VoidCallback change) {
    setState(change);
    unawaited(
      _persist().catchError((Object _) {}),
    ); // The write chain shows the failure.
  }

  Future<void> _run(Future<void> Function() task) async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await _persist();
      if (pickerIntent != null) await _recoverPicked();
      await task();
    } catch (e) {
      if (mounted) setState(() => error = plainError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _begin() async {
    if (term.isNotEmpty && selected == null) {
      throw StateError('Connect to open this tenancy.');
    }
    final existing = selected?['checkOutId'] as String?;
    final baseline = selected?['baselineId'] as String?;
    if (existing != null || baseline != null) {
      final id = existing ?? await widget.api.startCheckOut(baseline!);
      await cache.deleteForOwner(owner!, key);
      if (mounted) Navigator.pop(context, id);
      return;
    }
    address = (selected?['address'] as String?) ?? address.trim();
    step = 'walk';
    visitedAt = DateTime.now().toUtc().toIso8601String();
    await _persist();
  }

  Future<void> _recoverPicked() async {
    final intent = pickerIntent!;
    if (intent['path'] == null && Platform.isAndroid) {
      final lost = await ImagePicker().retrieveLostData();
      if (lost.exception != null) throw lost.exception!;
      final file = lost.files?.firstOrNull;
      if (file != null) {
        intent['path'] = file.path;
        await _persist();
      }
    }
    if (intent['path'] != null) {
      await _storePicked();
    } else {
      pickerIntent = null;
      await _persist();
    }
  }

  Future<void> _storePicked() async {
    final intent = pickerIntent!;
    final path = intent['path'] as String;
    final ext = path.split('.').last.toLowerCase();
    const mime = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'heif': 'image/heif',
    };
    final store = CaptureStore(
      queue: queue,
      root: await getApplicationSupportDirectory(),
    );
    if (await queue.byClientId(intent['id']) == null) {
      await store.save(
        source: File(path),
        ownerId: owner!,
        inspectionId: stage,
        roomId: stage,
        itemId: intent['issue'],
        kind: 'PHOTO',
        extension: ext,
        mimeType: mime[ext] ?? 'image/jpeg',
        clientId: intent['id'],
      );
    }
    photos = await queue.forRoom(stage, owner!);
    pickerIntent = null;
    await _persist();
  }

  Future<void> _pick(ImageSource source) async {
    if (pickerIntent != null) {
      await _recoverPicked();
      return;
    }
    pickerIntent = {'issue': editing!['id'], 'id': newCaptureId()};
    await _persist();
    final file = await ImagePicker().pickImage(source: source, maxWidth: evidencePhotoEdge, maxHeight: evidencePhotoEdge, imageQuality: 92);
    if (file == null) {
      pickerIntent = null;
      await _persist();
      return;
    }
    pickerIntent!['path'] = file.path;
    await _persist();
    await _storePicked();
  }

  Future<void> _finish() async {
    if (owner != cache.ownerId) {
      throw StateError('Sign in to the account that started this visit.');
    }
    final visit = {
      'issues': issues,
      'visitedAt': ?visitedAt,
      'noIssues': issues.isEmpty,
      'photoIds': photos.map((p) => p.clientId!).toList(),
    };
    final id =
        reportId ??
        (term.isNotEmpty
            ? await widget.api.saveTenancyMoveOut(term, visitId, visit)
            : await widget.api.createInspection({
                ...details,
                'country': widget.country,
                'clientId': visitId,
                if (widget.agency != null) 'agencyId': widget.agency!.id,
                'line1': address,
                'propertyType': details['propertyType'] ?? 'PRIVATE_NON_LANDED',
                'landlordEmail': (details['landlordEmail'] ?? '').trim().isEmpty
                    ? null
                    : details['landlordEmail']!.trim(),
                'tenantEmail': (details['tenantEmail'] ?? '').trim().isEmpty
                    ? null
                    : details['tenantEmail']!.trim(),
                'monthlyRent': '',
                'deposit': details['deposit'] ?? '',
                'preservesBlankAmounts': true,
                'moveOut': visit,
              }));
    reportId = id;
    await _persist();
    await queue.attachMoveOutPhotos(owner!, stage, id);
    await cache.deleteForOwner(owner!, key);
    if (mounted) Navigator.pop(context, id);
  }

  Widget _field(
    String name,
    String label,
    String value,
    ValueChanged<String> changed, {
    bool required = true,
    int? max,
    TextInputType? keyboard,
  }) {
    return TextFormField(
      key: ValueKey('$step-$name'),
      initialValue: value,
      onChanged: (v) => _change(() => changed(v)),
      maxLength: max,
      keyboardType: keyboard,
      decoration: InputDecoration(labelText: label),
      validator: (v) =>
          required && (v ?? '').trim().isEmpty ? 'Enter $label' : null,
    );
  }

  Widget _date(String name, String label) {
    return OutlinedButton(
      onPressed: () async {
        final now = DateTime.now();
        final day = await showDatePicker(
          context: context,
          initialDate: DateTime.tryParse(details[name] ?? '') ?? now,
          firstDate: DateTime(1970),
          lastDate: DateTime(now.year + 30),
        );
        if (day != null && mounted) {
          _change(() => details[name] = day.toIso8601String().substring(0, 10));
        }
      },
      child: Text('$label · ${details[name] ?? 'Choose date'}'),
    );
  }

  @override
  Widget build(BuildContext context) {
    final issue = editing;
    return Scaffold(
      appBar: AppBar(title: const Text('Start check-out')),
      body: SafeArea(
        child: Form(
          key: form,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                '${widget.agency?.name ?? 'Personal'} · Check-out',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              if (error != null)
                Text(
                  error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              if (!loaded && error == null) const LinearProgressIndicator(),
              if (loaded)
                AbsorbPointer(
                  absorbing: busy,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 12,
                    children: [
                      if (reportId != null) ...[
                        const Text(
                          'Check-out saved. Finish attaching the photos saved on this device.',
                        ),
                        FilledButton(
                          onPressed: () => _run(_finish),
                          child: const Text('Continue to report'),
                        ),
                      ] else if (step == 'address') ...[
                        if (targetError != null) Text(targetError!),
                        if (targets.isNotEmpty)
                          KiviloSelectField<String>(
                            value: targets.any((t) => t['id'] == term)
                                ? term
                                : '',
                            label: 'Tenancy',
                            options: [
                              const KiviloSelectOption(
                                value: '',
                                label: 'New address',
                              ),
                              for (final t in targets)
                                KiviloSelectOption(
                                  value: t['id'] as String,
                                  label:
                                      "${t['address']} · ${t['tenant']} · ${t['end']}",
                                ),
                            ],
                            onChanged: (v) => _change(() => term = v),
                          ),
                        if (term.isEmpty)
                          _field(
                            'address',
                            'Property address and unit',
                            address,
                            (v) => address = v,
                          ),
                        Text(
                          selected?['checkOutId'] != null
                              ? 'Open the existing check-out.'
                              : selected?['baselineId'] != null
                              ? 'The signed check-in is available for this visit.'
                              : 'You can start with a paper check-in or no previous record.',
                        ),
                        FilledButton(
                          onPressed: () {
                            if (form.currentState!.validate()) _run(_begin);
                          },
                          child: Text(
                            selected?['checkOutId'] != null
                                ? 'Open check-out'
                                : 'Start walkthrough',
                          ),
                        ),
                      ] else ...[
                        Text(
                          address,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        if (step == 'walk' && issue != null) ...[
                          _field(
                            'label',
                            'What did you find?',
                            issue['label'],
                            (v) => issue['label'] = v,
                            max: 160,
                          ),
                          KiviloSelectField<String>(
                            value: issue['change'],
                            label: 'Type',
                            options: const [
                              KiviloSelectOption(
                                value: 'DAMAGE',
                                label: 'Damage',
                              ),
                              KiviloSelectOption(
                                value: 'MISSING',
                                label: 'Missing item',
                              ),
                              KiviloSelectOption(value: 'WEAR', label: 'Wear'),
                            ],
                            onChanged: (v) =>
                                _change(() => issue['change'] = v),
                          ),
                          _field(
                            'note',
                            'Evidence note (optional)',
                            issue['note'],
                            (v) => issue['note'] = v,
                            required: false,
                            max: 1000,
                          ),
                          Wrap(
                            spacing: 8,
                            children: [
                              OutlinedButton(
                                onPressed: () =>
                                    _run(() => _pick(ImageSource.camera)),
                                child: const Text('Take photo'),
                              ),
                              OutlinedButton(
                                onPressed: () =>
                                    _run(() => _pick(ImageSource.gallery)),
                                child: const Text('Choose photo'),
                              ),
                            ],
                          ),
                          Text(
                            "${photos.where((p) => p.itemId == issue['id']).length} photos saved on this device",
                          ),
                          FilledButton(
                            onPressed: () {
                              if (!form.currentState!.validate()) return;
                              _run(() async {
                                issues.removeWhere(
                                  (i) => i['id'] == issue['id'],
                                );
                                issues.add(Map.of(issue));
                                editing = null;
                                await _persist();
                              });
                            },
                            child: const Text('Save issue'),
                          ),
                          if (!photos.any((p) => p.itemId == issue['id']))
                            TextButton(
                              onPressed: () => _change(() => editing = null),
                              child: const Text('Cancel'),
                            ),
                        ] else ...[
                          for (final i in issues)
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(i['label']),
                              subtitle: Text(i['note']),
                              trailing: step == 'walk'
                                  ? TextButton(
                                      onPressed: () =>
                                          _change(() => editing = Map.of(i)),
                                      child: const Text('Edit'),
                                    )
                                  : null,
                            ),
                          if (step == 'walk') ...[
                            const Text(
                              'Record damage or missing items as you walk. Costs can be entered later.',
                            ),
                            FilledButton(
                              onPressed: () => _change(
                                () => editing = {
                                  'id': newCaptureId(),
                                  'label': '',
                                  'note': '',
                                  'change': 'DAMAGE',
                                },
                              ),
                              child: const Text('Record an issue'),
                            ),
                            OutlinedButton(
                              onPressed: () => _change(() => step = 'details'),
                              child: Text(
                                issues.isEmpty
                                    ? 'Finish with no issues'
                                    : 'Review visit',
                              ),
                            ),
                            const Text('Walkthrough saved on this device.'),
                          ] else ...[
                            if (issues.isEmpty)
                              const Text(
                                'No issues observed during this visit.',
                              ),
                            if (term.isEmpty) ...[
                              Text(
                                'Tenancy details for the report',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              for (final entry in {
                                'postalCode': 'Postal code',
                                'landlordName': 'Landlord name',
                                'tenantName': 'Tenant name',
                                'landlordEmail': 'Landlord email (optional)',
                                'tenantEmail': 'Tenant email (optional)',
                              }.entries)
                                _field(
                                  entry.key,
                                  entry.value,
                                  details[entry.key] ?? '',
                                  (v) => details[entry.key] = v,
                                  required: !entry.key.endsWith('Email'),
                                ),
                              KiviloSelectField<String>(
                                value:
                                    details['propertyType'] ??
                                    'PRIVATE_NON_LANDED',
                                label: 'Property type',
                                options: [
                                  const KiviloSelectOption(
                                    value: 'PRIVATE_NON_LANDED',
                                    label: 'Private apartment',
                                  ),
                                  if (widget.country == 'SG')
                                    const KiviloSelectOption(
                                      value: 'HDB',
                                      label: 'HDB',
                                    ),
                                  const KiviloSelectOption(
                                    value: 'LANDED',
                                    label: 'Landed',
                                  ),
                                  const KiviloSelectOption(
                                    value: 'COMMERCIAL',
                                    label: 'Commercial',
                                  ),
                                ],
                                onChanged: (v) =>
                                    _change(() => details['propertyType'] = v),
                              ),
                              _date('startDate', 'Tenancy start'),
                              _date('endDate', 'Tenancy end'),
                              _field(
                                'deposit',
                                'Deposit (${widget.country == 'MY' ? 'MYR' : 'SGD'}, optional)',
                                details['deposit'] ?? '',
                                (v) => details['deposit'] = v,
                                required: false,
                                keyboard: const TextInputType.numberWithOptions(
                                  decimal: true,
                                ),
                              ),
                            ],
                            FilledButton(
                              onPressed: () {
                                if (!form.currentState!.validate()) return;
                                if (term.isEmpty &&
                                    (details['startDate'] == null ||
                                        details['endDate'] == null ||
                                        details['startDate']!.compareTo(
                                              details['endDate']!,
                                            ) >=
                                            0)) {
                                  setState(
                                    () => error =
                                        'Choose the tenancy start and a later end date.',
                                  );
                                  return;
                                }
                                _run(_finish);
                              },
                              child: Text(
                                busy ? 'Saving…' : 'Create check-out report',
                              ),
                            ),
                            TextButton(
                              onPressed: () => _change(() => step = 'walk'),
                              child: const Text('Back to walkthrough'),
                            ),
                          ],
                        ],
                      ],
                      if (busy) const LinearProgressIndicator(),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
