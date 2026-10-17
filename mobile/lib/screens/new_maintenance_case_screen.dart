import 'dart:async';

import 'package:flutter/material.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import '../services/capture_queue.dart';
import '../services/read_cache.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';

class NewMaintenanceCaseScreen extends StatefulWidget {
  const NewMaintenanceCaseScreen({
    super.key,
    required this.tenancyId,
    required this.assets,
    this.cache,
  });
  final String tenancyId;
  final List<PropertyAssetSummary> assets;
  final ReadCache? cache;

  @override
  State<NewMaintenanceCaseScreen> createState() =>
      _NewMaintenanceCaseScreenState();
}

class _NewMaintenanceCaseScreenState extends State<NewMaintenanceCaseScreen> {
  final _api = Api();
  late final ReadCache _cache = widget.cache ?? ReadCache();
  final _title = TextEditingController();
  final _description = TextEditingController();
  String _clientId = newCaptureId();
  String _category = 'APPLIANCE';
  String _priority = 'ROUTINE';
  String? _assetId;
  bool _saving = false;
  String? _error;
  int _draftRevision = 0;
  Future<bool> _pendingDraftWrite = Future.value(true);

  String get _draftKey => 'maintenance-draft:${widget.tenancyId}';

  @override
  void initState() {
    super.initState();
    _restoreDraft();
  }

  Future<void> _restoreDraft() async {
    final revision = _draftRevision;
    final value = await _cache.read(_draftKey);
    // Typing while the disk read is in flight takes precedence over old data.
    if (!mounted || revision != _draftRevision || value is! Map) return;
    final draft = value.cast<String, dynamic>();
    _title.text = draft['title'] as String? ?? '';
    _description.text = draft['description'] as String? ?? '';
    setState(() {
      final restoredAssetId = draft['propertyAssetId'] as String?;
      _assetId = widget.assets.any((asset) => asset.id == restoredAssetId)
          ? restoredAssetId
          : null;
      _category = draft['category'] as String? ?? 'APPLIANCE';
      _priority = draft['priority'] as String? ?? 'ROUTINE';
      _clientId = draft['clientId'] as String? ?? _clientId;
    });
  }

  Future<bool> _saveDraft() {
    _draftRevision++;
    final key = _draftKey;
    final snapshot = {
      'clientId': _clientId,
      'propertyAssetId': _assetId,
      'category': _category,
      'priority': _priority,
      'title': _title.text,
      'description': _description.text,
    };
    // Each edit waits for the preceding write. A slow old write can never
    // replace a newer draft, including one saved after a failed submission.
    _pendingDraftWrite = _pendingDraftWrite.then((_) async {
      try {
        return await _cache.write(key, snapshot);
      } catch (error) {
        debugPrint('Could not save maintenance draft $key: $error');
        return false;
      }
    });
    return _pendingDraftWrite;
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_title.text.trim().isEmpty || _description.text.trim().isEmpty) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final id = await _api.createMaintenanceCase(widget.tenancyId, {
        'clientId': _clientId,
        'propertyAssetId': _assetId,
        'category': _category,
        'priority': _priority,
        'title': _title.text.trim(),
        'description': _description.text.trim(),
      });
      await _pendingDraftWrite;
      try {
        await _cache.remove(_draftKey);
      } catch (error) {
        // The case exists on the server. A failed local cleanup must not be
        // reported as a failed submission or invite an unnecessary retry.
        debugPrint('Could not clear submitted maintenance draft: $error');
      }
      if (mounted) Navigator.pop(context, id);
    } catch (error) {
      final saved = await _saveDraft();
      if (mounted) {
        setState(
          () => _error = saved
              ? '${plainError(error)} Your draft is saved on this phone.'
              : '${plainError(error)} This phone could not save your draft. Keep this screen open and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Report a problem')),
    body: KiviloContent(maxWidth: 720, child: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        KiviloSelectField<String?>(
          label: 'Property item (optional)',
          value: _assetId,
          enabled: !_saving,
          options: [
            const KiviloSelectOption<String?>(
              value: null,
              label: 'No specific item',
            ),
            ...widget.assets.map(
              (asset) => KiviloSelectOption<String?>(
                value: asset.id,
                label: asset.name,
              ),
            ),
          ],
          onChanged: (value) {
            setState(() => _assetId = value);
            unawaited(_saveDraft());
          },
        ),
        const SizedBox(height: 12),
        KiviloSelectField<String>(
          label: 'Category',
          value: _category,
          enabled: !_saving,
          options: const [
            KiviloSelectOption(value: 'APPLIANCE', label: 'Appliance'),
            KiviloSelectOption(value: 'PLUMBING', label: 'Plumbing'),
            KiviloSelectOption(value: 'LOCKSMITH', label: 'Locksmith'),
            KiviloSelectOption(value: 'ELECTRICAL', label: 'Electrical'),
            KiviloSelectOption(
              value: 'AIR_CONDITIONING',
              label: 'Air conditioning',
            ),
            KiviloSelectOption(value: 'STRUCTURAL', label: 'Structural'),
            KiviloSelectOption(value: 'PEST', label: 'Pest'),
            KiviloSelectOption(value: 'OTHER', label: 'Other'),
          ],
          onChanged: (value) {
            setState(() => _category = value);
            unawaited(_saveDraft());
          },
        ),
        const SizedBox(height: 12),
        KiviloSegmentedControl<String>(
          options: const [
            KiviloSegmentOption(value: 'ROUTINE', label: 'Routine'),
            KiviloSegmentOption(value: 'URGENT', label: 'Urgent'),
            KiviloSegmentOption(value: 'SAFETY_EMERGENCY', label: 'Danger'),
          ],
          value: _priority,
          onChanged: _saving
              ? null
              : (value) {
                  setState(() => _priority = value!);
                  unawaited(_saveDraft());
                },
        ),
        if (_priority == 'SAFETY_EMERGENCY')
          const Card(
            child: ListTile(
              leading: Icon(Icons.emergency_outlined),
              title: Text('If someone is in immediate danger'),
              subtitle: Text(
                'Call Police 999 or SCDF fire/ambulance 995 before reporting here.',
              ),
            ),
          ),
        const SizedBox(height: 12),
        TextField(
          controller: _title,
          readOnly: _saving,
          decoration: const InputDecoration(labelText: 'Short title'),
          maxLength: 120,
          onChanged: (_) => unawaited(_saveDraft()),
        ),
        TextField(
          controller: _description,
          readOnly: _saving,
          decoration: const InputDecoration(
            labelText: 'What happened?',
            hintText:
                'Include when it started and what you have already tried.',
          ),
          minLines: 4,
          maxLines: 8,
          onChanged: (_) => unawaited(_saveDraft()),
        ),
        if (_error != null)
          Text(
            _error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: Text(_saving ? 'Saving…' : 'Submit report'),
        ),
      ],
    )),
  );
}
