import 'dart:async';
import 'dart:io';

import 'package:image_picker/image_picker.dart';

import 'package:flutter/material.dart';

import '../models/inspection.dart';
import '../services/api.dart';
import '../services/finding_photos.dart';
import 'multi_shot_camera_screen.dart';
import 'photo_mark_screen.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/marked_network_photo.dart';
import '../services/photo_cache.dart';

/// Choose a line with its evidence in view, then write the finding on the same route.
/// Selection changes and a failed save leave the agent's draft intact.
class FindingEditorScreen extends StatefulWidget {
  const FindingEditorScreen({
    super.key,
    this.finding,
    this.inspectionId,
    this.api,
    this.photoSession,
    this.openMultiShotCamera,
    this.onRecover,
    required this.maintenanceHistory,
    this.checkOutItems = const [],
    this.checkInItems = const [],
    required this.onSave,
    this.onRemove,
  });

  final Finding? finding;
  final String? inspectionId;
  final Api? api;
  final FindingPhotos? photoSession;
  final Future<bool?> Function(BuildContext context, FindingPhotos photos)?
  openMultiShotCamera;
  final Future<void> Function(String findingId, Map<String, dynamic>)?
  onRecover;
  final List<Map<String, dynamic>> maintenanceHistory;
  final List<ComparableItem> checkOutItems;
  final List<ComparableItem> checkInItems;
  final Future<void> Function(Map<String, dynamic>) onSave;
  final Future<void> Function()? onRemove;

  @override
  State<FindingEditorScreen> createState() => _FindingEditorScreenState();
}

class _FindingEditorScreenState extends State<FindingEditorScreen> {
  late bool _choosing = widget.finding == null;
  bool _fromCheckIn = false;
  bool _selectedAtCheckIn = false;
  ComparableItem? _selected;
  String? _roomId;
  final _search = TextEditingController();
  final _chooserScroll = ScrollController();
  double _chooserOffset = 0;
  late final _rationale = TextEditingController(
    text: widget.finding?.rationale,
  );
  late final _cost = TextEditingController(text: widget.finding?.estimatedCost);
  late String _changeType = widget.finding?.changeType ?? 'DAMAGE';
  late String _verdict = widget.finding?.verdict ?? 'UNDECIDED';
  late String? _maintenanceCaseId = widget.finding?.maintenanceCaseId;
  bool _changeChosen = false;
  bool _saving = false;
  bool _showItemDetails = false;
  String? _error;
  FindingPhotos? _photos;
  bool _loadingPhotos = false;
  bool _restoringDraft = false;
  bool _photoAction = false;

  @override
  void initState() {
    super.initState();
    final finding = widget.finding;
    if (finding != null) {
      _selected = widget.checkOutItems
          .where((item) => item.id == finding.itemId)
          .firstOrNull;
      if (_selected == null) {
        _selected = widget.checkInItems
            .where((item) => item.id == finding.baselineItemId)
            .firstOrNull;
        _selectedAtCheckIn = _selected != null;
      }
    }
    _rationale.addListener(_draftChanged);
    _cost.addListener(_draftChanged);
    if (widget.photoSession != null || widget.inspectionId != null) {
      _photos =
          widget.photoSession ??
          FindingPhotos(
            api: widget.api ?? Api(),
            inspectionId: widget.inspectionId!,
            findingId: finding?.id,
            savedPhotos: finding?.photos ?? const [],
          );
      _photos!.addListener(_photosChanged);
      _loadingPhotos = true;
      unawaited(_openPhotos());
    }
  }

  Future<void> _openPhotos() async {
    try {
      await _photos!.initialize();
      if (!mounted) return;
      final draft = _photos!.form;
      if (draft.isNotEmpty) {
        _restoringDraft = true;
        _selectedAtCheckIn = draft['atCheckIn'] == true;
        final items = _selectedAtCheckIn
            ? widget.checkInItems
            : widget.checkOutItems;
        if (widget.finding == null) {
          _selected = items
              .where((item) => item.id == draft['selectedId'])
              .firstOrNull;
          _choosing = _selected == null;
          _fromCheckIn = _selectedAtCheckIn;
        }
        _rationale.text = draft['rationale'] as String? ?? '';
        _cost.text = draft['cost'] as String? ?? '';
        _changeType = draft['changeType'] as String? ?? _changeType;
        _verdict = draft['verdict'] as String? ?? _verdict;
        _maintenanceCaseId = draft['maintenanceCaseId'] as String?;
        _changeChosen = draft['changeChosen'] == true;
        _restoringDraft = false;
      }
      if (_photos!.claimed) {
        setState(
          () => _error =
              'This finding was already saved. Save to apply any further changes to it.',
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _loadingPhotos = false);
    }
  }

  void _photosChanged() {
    if (mounted) setState(() {});
  }

  Map<String, dynamic> get _draft => {
    'selectedId': _selected?.id,
    'atCheckIn': _selectedAtCheckIn,
    'rationale': _rationale.text,
    'cost': _cost.text,
    'changeType': _changeType,
    'verdict': _verdict,
    'maintenanceCaseId': _maintenanceCaseId,
    'changeChosen': _changeChosen,
  };

  void _draftChanged() {
    if (_restoringDraft || _photos?.ready != true) return;
    unawaited(_writeDraft());
  }

  Future<void> _writeDraft() async {
    try {
      await _photos?.persistForm(_draft);
    } catch (error) {
      if (mounted) {
        setState(
          () => _error =
              'Could not save the finding draft on this phone. ${plainError(error)}',
        );
      }
    }
  }

  @override
  void dispose() {
    _photos?.removeListener(_photosChanged);
    _photos?.dispose();
    _search.dispose();
    _chooserScroll.dispose();
    _rationale.dispose();
    _cost.dispose();
    super.dispose();
  }

  List<ComparableItem> get _sourceItems => _fromCheckIn
      ? widget.checkInItems
            .where((item) => item.includedAtCheckOutStart != false)
            .toList()
      : widget.checkOutItems;

  void _choose(ComparableItem item) {
    if (_chooserScroll.hasClients) _chooserOffset = _chooserScroll.offset;
    FocusScope.of(context).unfocus();
    setState(() {
      _selected = item;
      _selectedAtCheckIn = _fromCheckIn;
      _choosing = false;
      _showItemDetails = false;
      _error = null;
      if (!_changeChosen) _changeType = _fromCheckIn ? 'MISSING' : 'DAMAGE';
    });
    _draftChanged();
  }

  void _showChooser() {
    FocusScope.of(context).unfocus();
    setState(() => _choosing = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _chooserScroll.hasClients) {
        _chooserScroll.jumpTo(
          _chooserOffset.clamp(0, _chooserScroll.position.maxScrollExtent),
        );
      }
    });
  }

  Future<void> _back() async {
    if (_saving || _photoAction) return;
    if (_choosing && _selected != null) {
      FocusScope.of(context).unfocus();
      setState(() => _choosing = false);
      return;
    }
    if (widget.finding == null && !_choosing && _photos?.ready == true) {
      setState(() => _photoAction = true);
      try {
        await _photos!.persistForm(_draft);
      } catch (error) {
        if (mounted) setState(() => _error = plainError(error));
        return;
      } finally {
        if (mounted) setState(() => _photoAction = false);
      }
    }
    if (mounted) Navigator.pop(context);
  }

  Future<void> _persist(Future<void> Function() action) async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final route = ModalRoute.of(context);
    try {
      await action();
      if (mounted) {
        final navigator = Navigator.of(context);
        if (route == null || route.isCurrent) {
          navigator.pop(true);
        } else {
          navigator.removeRoute(route, true);
        }
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = plainError(error);
        });
      }
    }
  }

  Future<void> _save() async {
    if (_saving || _photoAction || _loadingPhotos) return;
    final cost = _cost.text.trim();
    final error = widget.finding == null && _selected == null
        ? 'Choose an item first.'
        : _rationale.text.trim().isEmpty
        ? 'Describe what changed and why.'
        : cost.isNotEmpty && !RegExp(r'^\d{1,8}(\.\d{1,2})?$').hasMatch(cost)
        ? 'Enter a cost with up to 2 decimal places.'
        : null;
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    final fields = <String, dynamic>{
      'changeType': _changeType,
      'verdict': _verdict,
      'rationale': _rationale.text.trim(),
      'estimatedCost': cost.isEmpty ? null : cost,
      if (widget.finding == null) ...{
        'itemId': _selectedAtCheckIn ? null : _selected!.id,
        'baselineItemId': _selectedAtCheckIn ? _selected!.id : null,
      } else
        'maintenanceCaseId': _maintenanceCaseId,
    };
    await _persist(() async {
      if (_photos != null) {
        if (!_photos!.ready) {
          throw const ApiFailure('Wait until the photo draft is ready.', null);
        }
        await _photos!.persistForm(_draft);
        await _photos!.ensureReady();
        if (_photos!.claimed) {
          final previous = _photos!.submittedForm;
          if (previous != null &&
              (previous['selectedId'] != _draft['selectedId'] ||
                  previous['atCheckIn'] != _draft['atCheckIn'])) {
            throw const ApiFailure(
              'This finding was already saved for its original item. Choose that item to save your latest text, or discard this draft and add another finding.',
              null,
            );
          }
          final savedId = _photos!.claimedFindingId;
          if (savedId == null || widget.onRecover == null) {
            throw const ApiFailure(
              'This finding was already saved. Your latest draft is kept. Reopen the saved finding to make further changes.',
              null,
            );
          }
          fields.remove('itemId');
          fields.remove('baselineItemId');
          await widget.onRecover!(savedId, fields);
          await _photos!.complete();
          return;
        }
        await _photos!.prepareSubmission();
        fields['photoDraftId'] = _photos!.draftId;
        if (widget.finding == null) fields['clientId'] = _photos!.draftId;
      }
      await widget.onSave(fields);
      await _photos?.complete();
    });
  }

  Future<void> _photoOperation(Future<void> Function() action) async {
    if (_saving || _photoAction || _photos?.ready != true) return;
    setState(() {
      _photoAction = true;
      _error = null;
    });
    try {
      await action();
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _photoAction = false);
    }
  }

  Future<void> _pickPhoto(ImageSource source) => _photoOperation(() async {
    await _photos!.persistForm(_draft);
    final ids = await _photos!.pick(source);
    // Every selected original is durable before opening the first mark editor.
    for (final id in ids) {
      if (!mounted) return;
      final photo = _photos!.evidence
          .where((photo) => photo.id == id)
          .firstOrNull;
      if (photo != null) await _markPhoto(photo);
    }
  });

  Future<void> _takePhotos() {
    // Injected pickers keep widget tests deterministic. Production uses the
    // continuous camera and the same durable queue as the finding draft.
    if (widget.openMultiShotCamera == null && _photos!.usesInjectedPicker) {
      return _pickPhoto(ImageSource.camera);
    }
    return _photoOperation(() async {
      final photos = _photos!;
      await photos.persistForm(_draft);
      if (!mounted) return;
      final launcher = widget.openMultiShotCamera;
      if (launcher != null) {
        await launcher(context, photos);
      } else {
        await Navigator.push<bool>(
          context,
          MaterialPageRoute(
            builder: (_) => MultiShotCameraScreen(
              inspectionId: photos.namespace,
              roomId: photos.draftId,
              ownerId: photos.ownerId,
              root: photos.root,
              queue: photos.queue,
              title: 'Finding photos',
            ),
          ),
        );
      }
      await photos.retry();
    });
  }

  Future<void> _markPhoto(FindingEvidence photo) async {
    ImageProvider image;
    ImageProvider? placeholder;
    if (photo.localPath != null && await File(photo.localPath!).exists()) {
      image = MemoryImage(await File(photo.localPath!).readAsBytes());
    } else if (photo.url != null) {
      image = StoredNetworkImage(photo.url!);
      if (photo.posterUrl != null) {
        placeholder = StoredNetworkImage(photo.posterUrl!);
      }
    } else {
      throw const ApiFailure(
        'Connect and retry to open this photo. Its upload is kept on this phone.',
        null,
      );
    }
    if (!mounted) return;
    final result = await Navigator.push<PhotoMarksResult>(
      context,
      MaterialPageRoute(
        builder: (_) => PhotoMarkScreen(
          image: image,
          placeholder: placeholder,
          annotations: photo.annotations,
          saveLabel: photo.awaitingMarkup ? 'Save photo' : 'Save',
          onChanged: (annotations) =>
              _photos!.setAnnotations(photo.id, annotations),
        ),
      ),
    );
    if (result != null) await _photos!.finishMarkup(photo.id);
  }

  Future<void> _viewFindingPhoto(FindingEvidence photo) async {
    ImageProvider? image;
    if (photo.localPath != null && await File(photo.localPath!).exists()) {
      image = MemoryImage(await File(photo.localPath!).readAsBytes());
    }
    if (!mounted) return;
    if (image == null && photo.url == null) {
      throw const ApiFailure('Connect and retry to view this photo.', null);
    }
    final provider = image;
    await Navigator.push<void>(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(title: const Text('Finding photo')),
          body: SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: InteractiveViewer(
                    minScale: 0.75,
                    maxScale: 6,
                    child: Center(
                      child: provider == null
                          ? MarkedNetworkPhoto(
                              url: photo.url!,
                              placeholderUrl: photo.posterUrl,
                              annotations: photo.annotations,
                              fit: BoxFit.contain,
                            )
                          : _LocalFindingPhoto(
                              image: provider,
                              annotations: photo.annotations,
                            ),
                    ),
                  ),
                ),
                if (photo.note?.isNotEmpty == true)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(photo.note!),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _caption(FindingEvidence photo) async {
    final controller = TextEditingController(text: photo.note);
    final value = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Photo caption'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Caption'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save caption'),
          ),
        ],
      ),
    );
    // A dialog can still be disposing its TextField on the next frame.
    if (value != null) {
      await _photos!.setNote(photo.id, value.isEmpty ? null : value);
    }
  }

  Future<void> _discardDraft() async {
    final discard = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Discard this finding draft?'),
        content: const Text(
          'The draft text and newly added photos will be removed. Saved finding photos stay with their finding.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep draft'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: kiviloDangerFilled,
            child: const Text('Discard draft'),
          ),
        ],
      ),
    );
    if (discard == true) await _persist(() => _photos!.discard());
  }

  Widget _photoEvidence() {
    final photos = _photos!.evidence;
    final enabled =
        !_saving && !_photoAction && _photos!.ready && !_photos!.claimed;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Photos', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 4),
        Text(
          'Take several photos, then mark them or add notes. Originals are always kept.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final takePhotos = OutlinedButton.icon(
              onPressed: enabled ? _takePhotos : null,
              icon: const Icon(Icons.camera_alt_outlined),
              label: const Text('Take photos'),
            );
            final gallery = OutlinedButton.icon(
              onPressed: enabled ? () => _pickPhoto(ImageSource.gallery) : null,
              icon: const Icon(Icons.photo_outlined),
              label: const Text('Gallery'),
            );
            if (constraints.maxWidth < 340) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 8,
                children: [takePhotos, gallery],
              );
            }
            return Row(
              children: [
                Expanded(child: takePhotos),
                const SizedBox(width: 8),
                Expanded(child: gallery),
              ],
            );
          },
        ),
        if (photos.any((photo) => photo.pending) || _photos!.error != null)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: enabled ? () => _photoOperation(_photos!.retry) : null,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Retry uploads'),
            ),
          ),
        if (_photoAction) const LinearProgressIndicator(),
        for (final photo in photos) ...[
          const SizedBox(height: 10),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Semantics(
                    label: 'Open finding photo: ${photo.note ?? 'Photo'}',
                    button: true,
                    child: InkWell(
                      onTap: enabled && !photo.removing
                          ? () =>
                                _photoOperation(() => _viewFindingPhoto(photo))
                          : null,
                      child: SizedBox(
                        height: 128,
                        child: photo.url != null
                            ? MarkedNetworkPhoto(
                                url: photo.posterUrl ?? photo.url!,
                                annotations: photo.annotations,
                                fit: BoxFit.contain,
                              )
                            : photo.localPath != null
                            ? _LocalFindingPhoto(
                                image: FileImage(File(photo.localPath!)),
                                annotations: photo.annotations,
                              )
                            : const Center(child: Text('Photo upload pending')),
                      ),
                    ),
                  ),
                  if (photo.note != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(photo.note!),
                    ),
                  const SizedBox(height: 6),
                  Text(
                    photo.removing
                        ? 'Removing photo…'
                        : photo.awaitingMarkup
                        ? 'Saved on this phone · Finish marking'
                        : photo.error != null
                        ? 'Saved on this phone · Upload failed. Retry when connected.'
                        : photo.pending
                        ? photo.progress != null
                              ? 'Uploading ${(photo.progress! * 100).round()}%…'
                              : 'Saving photo…'
                        : 'Uploaded',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  if (photo.pending && !photo.awaitingMarkup && !photo.removing)
                    LinearProgressIndicator(value: photo.progress),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: TextButton.icon(
                          onPressed: enabled && !photo.removing
                              ? () => _photoOperation(() => _markPhoto(photo))
                              : null,
                          style: TextButton.styleFrom(
                            minimumSize: const Size(0, 40),
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          icon: const Icon(Icons.draw_outlined, size: 18),
                          label: Text(photo.awaitingMarkup ? 'Resume' : 'Mark'),
                        ),
                      ),
                      Expanded(
                        child: TextButton.icon(
                          onPressed: enabled && !photo.removing
                              ? () => _photoOperation(() => _caption(photo))
                              : null,
                          style: TextButton.styleFrom(
                            minimumSize: const Size(0, 40),
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          icon: const Icon(Icons.notes_outlined, size: 18),
                          label: const Text('Note'),
                        ),
                      ),
                      IconButton(
                        onPressed: enabled && !photo.removing
                            ? () => _photoOperation(
                                () => _photos!.remove(photo.id),
                              )
                            : null,
                        tooltip: 'Delete photo',
                        color: KiviloColors.red,
                        icon: const Icon(Icons.delete_outline),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) => PopScope<bool>(
    canPop:
        !_saving &&
        !_photoAction &&
        ((_choosing && _selected == null) || widget.finding != null),
    onPopInvokedWithResult: (didPop, _) {
      if (!didPop && !_saving && !_photoAction) _back();
    },
    child: Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: _back),
        title: Text(
          _choosing
              ? 'Choose an item'
              : widget.finding == null
              ? 'Add finding'
              : 'Review finding',
        ),
      ),
      body: KiviloContent(
        child: _loadingPhotos
            ? const Center(child: CircularProgressIndicator())
            : _choosing
            ? _chooser()
            : _form(),
      ),
    ),
  );

  Widget _chooser() {
    final items = _sourceItems;
    final rooms = <String, String>{};
    for (final item in items) {
      if (item.roomId != null) rooms[item.roomId!] = item.roomName ?? 'Room';
    }
    final roomLabels = <String, String>{};
    for (final entry in rooms.entries) {
      final sameName = rooms.entries
          .where((room) => room.value == entry.value)
          .toList();
      roomLabels[entry.key] = sameName.length > 1
          ? '${entry.value} (${sameName.indexWhere((room) => room.key == entry.key) + 1})'
          : entry.value;
    }
    final terms = _search.text
        .toLowerCase()
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty);
    final filtered = items.where((item) {
      if (_roomId != null && item.roomId != _roomId) return false;
      final text = [
        item.label,
        item.name,
        item.roomName,
        item.category,
        item.identifier,
        item.notes,
        item.meterReading,
        item.condition,
        item.checkIn?.name,
        item.checkIn?.notes,
        item.checkIn?.identifier,
      ].whereType<String>().join(' ').toLowerCase();
      return terms.every(text.contains);
    }).toList();
    final groups = <String, List<ComparableItem>>{};
    for (final item in filtered) {
      (groups[item.roomId ?? 'legacy'] ??= []).add(item);
    }
    final rows = <({String? heading, ComparableItem? item})>[];
    for (final entry in groups.entries) {
      rows.add((heading: roomLabels[entry.key] ?? 'Items', item: null));
      rows.addAll(entry.value.map((item) => (heading: null, item: item)));
    }
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: TextField(
            controller: _search,
            textInputAction: TextInputAction.search,
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) => FocusScope.of(context).unfocus(),
            decoration: InputDecoration(
              labelText: 'Search items, rooms or serial numbers',
              suffixIcon: _search.text.isEmpty
                  ? null
                  : TextButton(
                      onPressed: () => setState(() => _search.clear()),
                      child: const Text('Clear'),
                    ),
            ),
          ),
        ),
        Expanded(
          child: CustomScrollView(
            controller: _chooserScroll,
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      KiviloSegmentedControl<bool>(
                        value: _fromCheckIn,
                        options: const [
                          KiviloSegmentOption(
                            value: false,
                            label: 'At check-out',
                          ),
                          KiviloSegmentOption(
                            value: true,
                            label: 'At check-in',
                          ),
                        ],
                        onChanged: (value) => setState(() {
                          _fromCheckIn = value!;
                          _roomId = null;
                          _chooserOffset = 0;
                        }),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _fromCheckIn
                            ? 'For an item no longer here at check-out.'
                            : 'Choose an item using its photos and recorded condition.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      if (rooms.length > 1) ...[
                        const SizedBox(height: 8),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              ChoiceChip(
                                label: const Text('All rooms'),
                                selected: _roomId == null,
                                onSelected: (_) =>
                                    setState(() => _roomId = null),
                              ),
                              for (final room in roomLabels.entries) ...[
                                const SizedBox(width: 8),
                                ChoiceChip(
                                  label: Text(room.value),
                                  selected: _roomId == room.key,
                                  onSelected: (_) =>
                                      setState(() => _roomId = room.key),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 8),
                      Text(
                        '${filtered.length} ${filtered.length == 1 ? 'item' : 'items'}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
              if (filtered.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        items.isEmpty
                            ? 'No items recorded in this inventory.'
                            : 'No matching items. Try another room, name or serial number.',
                      ),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  sliver: SliverList.builder(
                    itemCount: rows.length,
                    itemBuilder: (context, index) {
                      final row = rows[index];
                      if (row.heading != null) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Text(
                            row.heading!,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        );
                      }
                      final item = row.item!;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Card(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () => _choose(item),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: _ItemInformation(
                                item: item,
                                atCheckIn: _fromCheckIn,
                                compact: true,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _choices(
    String label,
    String value,
    Map<String, String> options,
    ValueChanged<String> change,
  ) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: Theme.of(context).textTheme.titleSmall),
      const SizedBox(height: 8),
      Wrap(
        spacing: 8,
        runSpacing: 4,
        children: [
          for (final option in options.entries)
            ChoiceChip(
              label: Text(option.value),
              selected: option.key == value,
              onSelected: _saving || _photoAction
                  ? null
                  : (_) {
                      change(option.key);
                      _draftChanged();
                    },
            ),
        ],
      ),
    ],
  );

  Widget _form() => Column(
    children: [
      Expanded(
        child: ListView(
          padding: kiviloScreenPadding,
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          children: [
            if (_selected != null) ...[
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Item',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ),
                  if (widget.finding == null)
                    TextButton(
                      onPressed: _saving || _photoAction ? null : _showChooser,
                      style: TextButton.styleFrom(
                        minimumSize: const Size(0, 40),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text('Change item'),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _ItemInformation(
                        item: _selected!,
                        atCheckIn: _selectedAtCheckIn,
                        compact: !_showItemDetails,
                        enabled: !_saving && !_photoAction,
                      ),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton.icon(
                          onPressed: _saving
                              ? null
                              : () => setState(
                                  () => _showItemDetails = !_showItemDetails,
                                ),
                          style: TextButton.styleFrom(
                            minimumSize: const Size(0, 40),
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          icon: RotatedBox(
                            quarterTurns: _showItemDetails ? 2 : 0,
                            child: const Icon(
                              Icons.keyboard_arrow_down_rounded,
                              size: 18,
                            ),
                          ),
                          label: Text(
                            _showItemDetails
                                ? 'Hide item details'
                                : 'Show item details',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ] else if (widget.finding != null)
              Text(
                widget.finding!.itemLabel ??
                    widget.finding!.baselineLabel ??
                    widget.finding!.changeType,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            if (_photos != null) ...[
              const SizedBox(height: 20),
              _photoEvidence(),
            ],
            const SizedBox(height: 24),
            _choices(
              'Change',
              _changeType,
              const {
                'DAMAGE': 'Damage',
                'WEAR': 'Wear',
                'MISSING': 'Missing',
                'IMPROVED': 'Improved',
                'UNCHANGED': 'Unchanged',
              },
              (value) => setState(() {
                _changeType = value;
                _changeChosen = true;
              }),
            ),
            const SizedBox(height: 20),
            _choices('Verdict', _verdict, const {
              'UNDECIDED': 'Undecided',
              'TENANT_LIABLE': 'Tenant liable',
              'FAIR_WEAR': 'Fair wear',
              'DISPUTED': 'Disputed',
            }, (value) => setState(() => _verdict = value)),
            const SizedBox(height: 20),
            TextField(
              controller: _rationale,
              enabled: !_saving && !_photoAction,
              minLines: 3,
              maxLines: 6,
              decoration: const InputDecoration(labelText: 'Rationale'),
            ),
            if (widget.finding != null) ...[
              const SizedBox(height: 16),
              KiviloSelectField<String?>(
                label: 'Maintenance media',
                value: _maintenanceCaseId,
                options: [
                  const KiviloSelectOption<String?>(
                    value: null,
                    label: 'No linked maintenance record',
                  ),
                  for (final item in widget.maintenanceHistory)
                    KiviloSelectOption<String?>(
                      value: item['id'] as String,
                      label: item['title'] as String,
                    ),
                ],
                enabled: !_saving && !_photoAction,
                onChanged: (value) => setState(() {
                  _maintenanceCaseId = value;
                  _draftChanged();
                }),
              ),
            ],
            const SizedBox(height: 16),
            TextField(
              controller: _cost,
              enabled: !_saving && !_photoAction,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Estimated cost (SGD)',
              ),
            ),
            if (_photos != null) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: _saving || _photoAction ? null : _discardDraft,
                  style: TextButton.styleFrom(
                    foregroundColor: KiviloColors.red,
                    minimumSize: const Size(0, 40),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  icon: const Icon(Icons.delete_outline, size: 18),
                  label: const Text('Discard draft'),
                ),
              ),
            ],
            if (widget.finding != null && widget.onRemove != null) ...[
              const SizedBox(height: kiviloButtonGap),
              OutlinedButton(
                onPressed: _saving || _photoAction
                    ? null
                    : () => _persist(() async {
                        if (_photos != null) await _photos!.discard();
                        await widget.onRemove!();
                      }),
                style: kiviloDangerOutlined,
                child: const Text('Delete finding'),
              ),
            ],
          ],
        ),
      ),
      Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: KiviloColors.border)),
        ),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: SafeArea(
          top: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if ((_error ?? _photos?.error) != null) ...[
                Semantics(
                  liveRegion: true,
                  child: Text(
                    (_error ?? _photos?.error)!,
                    style: const TextStyle(color: KiviloColors.red),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              FilledButton(
                onPressed: _saving || _photoAction || _loadingPhotos
                    ? null
                    : _save,
                child: Text(
                  _saving
                      ? 'Saving…'
                      : widget.finding == null
                      ? 'Add finding'
                      : 'Save reviewed finding',
                ),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

class _ItemInformation extends StatelessWidget {
  const _ItemInformation({
    required this.item,
    required this.atCheckIn,
    this.compact = false,
    this.enabled = true,
  });
  final ComparableItem item;
  final bool atCheckIn;
  final bool compact;
  final bool enabled;

  String _condition(String value) => value.toLowerCase().replaceAll('_', ' ');

  Future<void> _view(
    BuildContext context,
    ComparablePhoto photo,
    String source,
  ) => Navigator.of(context).push<void>(
    MaterialPageRoute(
      builder: (_) => Scaffold(
        appBar: AppBar(title: Text(source)),
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Center(
            child: InteractiveViewer(
              minScale: 0.8,
              maxScale: 5,
              child: MarkedNetworkPhoto(
                url: photo.url,
                placeholderUrl: photo.posterUrl,
                annotations: photo.annotations,
                semanticLabel: photo.note ?? source,
                fit: BoxFit.contain,
              ),
            ),
          ),
        ),
      ),
    ),
  );

  Widget _photo(
    BuildContext context,
    ComparablePhoto photo,
    String source,
    double size,
  ) => Semantics(
    button: true,
    enabled: enabled,
    label: 'Open $source photo${photo.note == null ? '' : ': ${photo.note}'}',
    child: InkWell(
      onTap: enabled ? () => _view(context, photo, source) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: size,
              height: size * 0.8,
              child: ColoredBox(
                color: KiviloColors.canvas,
                child: MarkedNetworkPhoto(
                  url: photo.posterUrl ?? photo.url,
                  annotations: photo.annotations,
                  semanticLabel: photo.note ?? '$source photo',
                  fit: BoxFit.contain,
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          SizedBox(
            width: size,
            child: Text(source, style: Theme.of(context).textTheme.bodySmall),
          ),
          if (!compact && photo.note?.trim().isNotEmpty == true)
            SizedBox(
              width: size,
              child: Text(
                photo.note!,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
        ],
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final before = item.checkIn;
    final currentPhotos = item.photos;
    final first = currentPhotos.firstOrNull ?? before?.photos.firstOrNull;
    final firstSource = currentPhotos.isNotEmpty
        ? (atCheckIn ? 'At check-in' : 'At check-out')
        : 'At check-in';
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (compact && first != null) ...[
              _photo(context, first, firstSource, 76),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.displayName, style: text.titleMedium),
                  if (item.roomName != null)
                    Text(item.roomName!, style: text.bodySmall),
                  if (item.identifier?.trim().isNotEmpty == true)
                    Text(
                      'Serial / ID: ${item.identifier}',
                      style: text.bodyMedium,
                    ),
                  if (item.quantity != null && item.quantity! > 1)
                    Text('Quantity: ${item.quantity}', style: text.bodySmall),
                  if (item.meterReading?.trim().isNotEmpty == true)
                    Text('Meter: ${item.meterReading}', style: text.bodyMedium),
                ],
              ),
            ),
          ],
        ),
        if (item.condition != null || before != null) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 16,
            runSpacing: 4,
            children: [
              if (before != null && !atCheckIn)
                Text(
                  'Check-in: ${_condition(before.condition)}',
                  style: text.bodySmall,
                ),
              if (item.condition != null)
                Text(
                  '${atCheckIn ? 'Check-in' : 'Check-out'}: ${_condition(item.condition!)}',
                  style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
            ],
          ),
        ],
        if (before?.notes?.trim().isNotEmpty == true &&
            before!.notes != item.notes) ...[
          const SizedBox(height: 8),
          Text(
            'Check-in: ${before.notes}',
            maxLines: compact ? 2 : null,
            overflow: compact ? TextOverflow.ellipsis : null,
            style: text.bodySmall,
          ),
        ],
        if (item.notes?.trim().isNotEmpty == true) ...[
          const SizedBox(height: 8),
          Text(
            '${atCheckIn ? 'Check-in' : 'Check-out'}: ${item.notes}',
            maxLines: compact ? 2 : null,
            overflow: compact ? TextOverflow.ellipsis : null,
            style: text.bodyMedium,
          ),
        ],
        if (atCheckIn && item.representedAtCheckOut == true) ...[
          const SizedBox(height: 8),
          Text('Also listed at check-out', style: text.bodySmall),
        ],
        if (!compact) ...[
          const SizedBox(height: 12),
          if (currentPhotos.isEmpty && (before?.photos.isEmpty ?? true))
            Text(
              'No linked photos recorded for this item.',
              style: text.bodySmall,
            )
          else
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                for (final photo in before?.photos ?? <ComparablePhoto>[])
                  _photo(context, photo, 'At check-in', 120),
                for (final photo in currentPhotos)
                  _photo(
                    context,
                    photo,
                    atCheckIn ? 'At check-in' : 'At check-out',
                    120,
                  ),
              ],
            ),
        ],
      ],
    );
  }
}

/// Local originals use the same upright box as the vector marks. No edited bitmap
/// is written to disk or uploaded.
class _LocalFindingPhoto extends StatelessWidget {
  const _LocalFindingPhoto({required this.image, this.annotations});
  final ImageProvider image;
  final Map<String, dynamic>? annotations;
  @override
  Widget build(BuildContext context) {
    final width = (annotations?['w'] as num?)?.toDouble();
    final height = (annotations?['h'] as num?)?.toDouble();
    final marks = (annotations?['marks'] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>();
    if (width == null || height == null || marks.isEmpty) {
      return Image(
        image: image,
        fit: BoxFit.contain,
        errorBuilder: (_, _, _) =>
            const Center(child: Text('Photo is finishing uploading…')),
      );
    }
    return Center(
      child: AspectRatio(
        aspectRatio: width / height,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image(
              image: image,
              fit: BoxFit.fill,
              errorBuilder: (_, _, _) => const SizedBox(),
            ),
            CustomPaint(painter: MarkPainter(marks)),
          ],
        ),
      ),
    );
  }
}
