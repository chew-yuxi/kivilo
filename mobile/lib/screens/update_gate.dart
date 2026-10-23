import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/api_failure.dart';
import '../services/patch_update.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';

/// Covers every route when the store requires a release or Shorebird has a patch. The
/// app stays mounted offstage rather than being replaced, so the capture retry in the
/// root keeps draining the queue behind the wall: an update must never strand a capture.
class UpdateGate extends StatefulWidget {
  const UpdateGate({
    super.key,
    required this.check,
    required this.patchUpdate,
    required this.child,
  });

  final Future<String?> Function() check;
  final PatchUpdate patchUpdate;
  final Widget child;

  @override
  State<UpdateGate> createState() => _UpdateGateState();
}

class _UpdateGateState extends State<UpdateGate> {
  String? _storeUrl;
  PatchAvailability _patch = PatchAvailability.none;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    final results = await Future.wait<Object?>([
      widget.check(),
      widget.patchUpdate.check(),
    ]);
    if (!mounted) return;
    final storeUrl = results[0] as String?;
    final patch = results[1] as PatchAvailability;
    setState(() {
      _storeUrl = storeUrl;
      _patch = storeUrl == null ? patch : PatchAvailability.none;
    });
  }

  @override
  Widget build(BuildContext context) {
    final storeUrl = _storeUrl;
    final patch = _patch;
    final blocked = storeUrl != null || patch != PatchAvailability.none;
    return Stack(
      fit: StackFit.expand,
      children: [
        Offstage(offstage: blocked, child: widget.child),
        if (storeUrl != null) _UpdateRequired(storeUrl: storeUrl),
        if (storeUrl == null && patch != PatchAvailability.none)
          _PatchUpdateRequired(
            patchUpdate: widget.patchUpdate,
            restartOnly: patch == PatchAvailability.restartRequired,
          ),
      ],
    );
  }
}

class _PatchUpdateRequired extends StatefulWidget {
  const _PatchUpdateRequired({
    required this.patchUpdate,
    required this.restartOnly,
  });

  final PatchUpdate patchUpdate;
  final bool restartOnly;

  @override
  State<_PatchUpdateRequired> createState() => _PatchUpdateRequiredState();
}

class _PatchUpdateRequiredState extends State<_PatchUpdateRequired> {
  bool _installing = false;
  String? _error;

  Future<void> _install() async {
    setState(() {
      _installing = true;
      _error = null;
    });
    try {
      await widget.patchUpdate.installAndClose();
    } catch (error) {
      debugPrint('Shorebird update install error: $error');
      if (mounted) {
        setState(() {
          _installing = false;
          _error = plainError(error);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Center(child: KiviloMark(size: 68)),
                  const SizedBox(height: 48),
                  Text(
                    widget.restartOnly ? 'Update ready' : 'Update Kivilo',
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.restartOnly
                        ? 'The update is downloaded. Kivilo will close, then notify you when it is ready to reopen.'
                        : 'A Kivilo update is available. Download it now; Kivilo will close, then notify you when it is ready to reopen.',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    KiviloNotice(
                      tone: KiviloTone.error,
                      child: Text(
                        _error!,
                        style: const TextStyle(color: KiviloColors.red),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _installing ? null : _install,
                    child: _installing
                        ? const SizedBox.square(
                            dimension: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(
                            widget.restartOnly ? 'Close and update' : 'Update',
                          ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _UpdateRequired extends StatefulWidget {
  const _UpdateRequired({required this.storeUrl});

  final String storeUrl;

  @override
  State<_UpdateRequired> createState() => _UpdateRequiredState();
}

class _UpdateRequiredState extends State<_UpdateRequired> {
  String? _error;

  Future<void> _openStore() async {
    final uri = Uri.parse(widget.storeUrl);
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw StateError('Could not open $uri');
      }
    } catch (error) {
      debugPrint('store link error: $error');
      if (mounted) {
        setState(
          () => _error =
              'Could not open the store. Search for Kivilo in it instead.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = defaultTargetPlatform == TargetPlatform.iOS
        ? 'the App Store'
        : 'Google Play';
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Center(child: KiviloMark(size: 68)),
                  const SizedBox(height: 48),
                  Text(
                    'Update Kivilo',
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'This version is no longer supported. Photos and videos already on '
                    'this phone are kept and finish uploading after the update.',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    KiviloNotice(
                      tone: KiviloTone.error,
                      child: Text(
                        _error!,
                        style: const TextStyle(color: KiviloColors.red),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _openStore,
                    child: Text('Open $store'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
