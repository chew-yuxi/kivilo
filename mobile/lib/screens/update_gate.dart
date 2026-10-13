import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';

/// Covers every route with an update screen once [check] names a store page. The app
/// stays mounted offstage rather than being replaced, so the capture retry in the root
/// keeps draining the queue behind the wall: an update must never strand a capture.
class UpdateGate extends StatefulWidget {
  const UpdateGate({super.key, required this.check, required this.child});

  final Future<String?> Function() check;
  final Widget child;

  @override
  State<UpdateGate> createState() => _UpdateGateState();
}

class _UpdateGateState extends State<UpdateGate> {
  String? _storeUrl;

  @override
  void initState() {
    super.initState();
    widget.check().then((url) {
      if (mounted && url != null) setState(() => _storeUrl = url);
    });
  }

  @override
  Widget build(BuildContext context) {
    final storeUrl = _storeUrl;
    return Stack(
      fit: StackFit.expand,
      children: [
        Offstage(offstage: storeUrl != null, child: widget.child),
        if (storeUrl != null) _UpdateRequired(storeUrl: storeUrl),
      ],
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
      if (mounted) setState(() => _error = '$error');
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
                    'This version is no longer supported. Captures already on '
                    'this phone are kept and finish uploading after the update.',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: KiviloColors.redSoft,
                        borderRadius: BorderRadius.circular(12),
                      ),
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
