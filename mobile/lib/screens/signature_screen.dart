import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/api.dart';
import '../services/capture_queue.dart';
import '../services/saved_signature.dart';

class SignatureScreen extends StatefulWidget {
  /// The agent's phone, handed to the landlord or tenant at handover.
  const SignatureScreen({
    super.key,
    required this.inspectionId,
    required this.stakeholderId,
    required this.name,
    required this.role,
    this.api,
  }) : savedSignature = null;

  /// The signed-in landlord or tenant signing their own report on their own phone.
  const SignatureScreen.own({
    super.key,
    required this.inspectionId,
    required this.name,
    required this.role,
    required SavedSignature this.savedSignature,
    this.api,
  }) : stakeholderId = null;

  final String inspectionId;

  /// The party the agent is collecting a signature from, or null when the signer is
  /// whoever is signed in.
  final String? stakeholderId;
  final String name;
  final String role;

  /// The signer's own saved signature, offered instead of the pad and replaced by the
  /// one they draw. Only [SignatureScreen.own] takes one. On the agent's phone the
  /// person holding it is not the signed-in user, and offering or keeping a saved
  /// signature there would put one person's signature on another person's report.
  final SavedSignature? savedSignature;
  final Api? api;

  @override
  State<SignatureScreen> createState() => _SignatureScreenState();
}

class _SignatureScreenState extends State<SignatureScreen> {
  late final _api = widget.api ?? Api();
  final List<List<Offset>> _strokes = [];
  int? _activePointer;
  bool _busy = false;
  String? _error;
  bool _reading = false;

  /// The saved signature while it is on offer, until the signer chooses to draw.
  Uint8List? _saved;
  bool _saveForNextTime = true;

  @override
  void initState() {
    super.initState();
    final saved = widget.savedSignature;
    if (saved == null) return;
    _reading = true;
    // One that cannot be read back is reported as an error, and the pad is offered
    // instead.
    saved.read().then((png) => _saved = png).whenComplete(() {
      if (mounted) setState(() => _reading = false);
    });
  }

  /// Sends [savedPng] when the signer chose their saved signature, otherwise the pad.
  Future<void> _sign([Uint8List? savedPng]) async {
    if (savedPng == null &&
        !_strokes.any(
          (stroke) => stroke
              .skip(1)
              .any((point) => (point - stroke.first).distanceSquared > 25),
        )) {
      setState(() => _error = 'Draw a signature first.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final stakeholderId = widget.stakeholderId;
      // Only the agent's phone holds captures for this report.
      if (stakeholderId != null) {
        final ownerId = Supabase.instance.client.auth.currentUser?.id;
        if (ownerId == null) throw StateError('Sign in again before signing.');
        final queue = CaptureQueue();
        late final ({int captures, int edits}) pending;
        try {
          pending = await queue.pendingForInspection(
            widget.inspectionId,
            ownerId,
          );
        } finally {
          await queue.close();
        }
        if (pending.captures > 0 || pending.edits > 0) {
          throw const ApiFailure(
            'Some photos, videos or changes have not uploaded yet. Go back to the '
            'rooms and tap Retry uploads before either person signs.',
            null,
          );
        }
      }
      var png = savedPng;
      if (png == null) {
        final recorder = ui.PictureRecorder();
        final canvas = Canvas(recorder);
        canvas.drawColor(Colors.white, BlendMode.src);
        canvas.scale(2);
        _SignaturePainter(_strokes).paint(canvas, const Size(320, 180));
        final image = await recorder.endRecording().toImage(640, 360);
        final data = await image.toByteData(format: ui.ImageByteFormat.png);
        image.dispose();
        if (data == null) throw StateError('Could not render signature');
        png = data.buffer.asUint8List();
      }
      final imageData = 'data:image/png;base64,${base64Encode(png)}';
      if (stakeholderId == null) {
        await _api.signOwnReport(widget.inspectionId, imageData);
      } else {
        await _api.sign(widget.inspectionId, stakeholderId, imageData);
      }
      // Only now the report has accepted it, so a refused signature is never offered.
      // Not awaited: the report is signed either way, and a phone that cannot keep the
      // signature is reported as an error, not shown as a failed signature.
      final store = widget.savedSignature;
      if (store != null && savedPng == null) {
        unawaited(_saveForNextTime ? store.save(png) : store.forget());
      }
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text('${widget.role} signature')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(widget.name, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Text(
          widget.stakeholderId == null
              ? 'Your signature confirms that the report you just read '
                    'records the property as it was handed over.'
              : 'Review the agreed inventory with this person before they sign. '
                    'Their signature confirms the report as shown.',
        ),
        const SizedBox(height: 16),
        if (_reading)
          const SizedBox(
            height: 180,
            child: Center(child: CircularProgressIndicator()),
          )
        else if (_saved case final saved?) ...[
          Align(
            alignment: Alignment.center,
            child: Container(
              width: 320,
              height: 180,
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: Colors.grey),
              ),
              child: Image.memory(saved, fit: BoxFit.contain),
            ),
          ),
          const SizedBox(height: 16),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          FilledButton(
            onPressed: _busy ? null : () => _sign(saved),
            child: Text(_busy ? 'Saving…' : 'Use this signature'),
          ),
          TextButton(
            onPressed: _busy
                ? null
                : () => setState(() {
                    _saved = null;
                    _error = null;
                  }),
            child: const Text('Draw a new one'),
          ),
        ] else ...[
          Align(
            alignment: Alignment.center,
            child: Container(
              width: 320,
              height: 180,
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: Colors.grey),
              ),
              child: RawGestureDetector(
                behavior: HitTestBehavior.opaque,
                gestures: {
                  EagerGestureRecognizer:
                      GestureRecognizerFactoryWithHandlers<
                        EagerGestureRecognizer
                      >(() => EagerGestureRecognizer(), (_) {}),
                },
                child: Listener(
                  behavior: HitTestBehavior.opaque,
                  onPointerDown: (event) {
                    if (_activePointer != null) return;
                    _activePointer = event.pointer;
                    setState(() => _strokes.add([event.localPosition]));
                  },
                  onPointerMove: (event) {
                    if (_activePointer != event.pointer) return;
                    setState(() => _strokes.last.add(event.localPosition));
                  },
                  onPointerUp: (event) {
                    if (_activePointer == event.pointer) _activePointer = null;
                  },
                  onPointerCancel: (event) {
                    if (_activePointer == event.pointer) _activePointer = null;
                  },
                  child: CustomPaint(
                    painter: _SignaturePainter(_strokes),
                    size: const Size(320, 180),
                  ),
                ),
              ),
            ),
          ),
          TextButton(
            onPressed: _busy
                ? null
                : () => setState(() {
                    _activePointer = null;
                    _strokes.clear();
                  }),
            child: const Text('Clear signature'),
          ),
          if (widget.savedSignature != null)
            CheckboxListTile(
              value: _saveForNextTime,
              onChanged: _busy
                  ? null
                  : (value) => setState(() => _saveForNextTime = value!),
              title: const Text('Save for next time'),
              subtitle: const Text(
                'Kept only on this phone, and removed when you sign out.',
              ),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
            ),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          FilledButton(
            onPressed: _busy ? null : _sign,
            child: Text(_busy ? 'Saving…' : 'Confirm signature'),
          ),
        ],
      ],
    ),
  );
}

class _SignaturePainter extends CustomPainter {
  const _SignaturePainter(this.strokes);
  final List<List<Offset>> strokes;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF111827)
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    for (final stroke in strokes) {
      if (stroke.length == 1) {
        canvas.drawPoints(ui.PointMode.points, stroke, paint);
      } else if (stroke.isNotEmpty) {
        final path = Path()..moveTo(stroke.first.dx, stroke.first.dy);
        for (final point in stroke.skip(1)) {
          path.lineTo(point.dx, point.dy);
        }
        canvas.drawPath(path, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SignaturePainter oldDelegate) => true;
}
