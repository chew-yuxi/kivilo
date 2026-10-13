import 'dart:convert';
import 'dart:ui' as ui;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/api.dart';
import '../services/capture_queue.dart';

class SignatureScreen extends StatefulWidget {
  const SignatureScreen({
    super.key,
    required this.inspectionId,
    required this.stakeholderId,
    required this.name,
    required this.role,
  });

  /// The signed-in landlord or tenant signing their own report on their own phone.
  const SignatureScreen.own({
    super.key,
    required this.inspectionId,
    required this.name,
    required this.role,
  }) : stakeholderId = null;

  final String inspectionId;

  /// The party the agent is collecting a signature from, or null when the signer is
  /// whoever is signed in.
  final String? stakeholderId;
  final String name;
  final String role;

  @override
  State<SignatureScreen> createState() => _SignatureScreenState();
}

class _SignatureScreenState extends State<SignatureScreen> {
  final _api = Api();
  final List<List<Offset>> _strokes = [];
  int? _activePointer;
  bool _busy = false;
  String? _error;

  Future<void> _sign() async {
    if (!_strokes.any(
      (stroke) => stroke.skip(1).any(
        (point) => (point - stroke.first).distanceSquared > 25,
      ),
    )) {
      setState(() => _error = 'Draw a signature first.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final ownerId = Supabase.instance.client.auth.currentUser?.id;
      if (ownerId == null) throw StateError('Sign in again before signing.');
      // Only the agent's phone holds captures for this report.
      if (widget.stakeholderId != null) {
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
          throw StateError(
            '${pending.captures} capture(s) and ${pending.edits} '
            'edit(s) still need to sync. Return to the rooms and retry uploads '
            'before either person signs.',
          );
        }
      }
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      canvas.drawColor(Colors.white, BlendMode.src);
      canvas.scale(2);
      _SignaturePainter(_strokes).paint(canvas, const Size(320, 180));
      final image = await recorder.endRecording().toImage(640, 360);
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      image.dispose();
      if (data == null) throw StateError('Could not render signature');
      final imageData =
          'data:image/png;base64,${base64Encode(data.buffer.asUint8List())}';
      final stakeholderId = widget.stakeholderId;
      if (stakeholderId == null) {
        await _api.signOwnReport(widget.inspectionId, imageData);
      } else {
        await _api.sign(widget.inspectionId, stakeholderId, imageData);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
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
        if (_error != null)
          Text(_error!, style: const TextStyle(color: Colors.red)),
        FilledButton(
          onPressed: _busy ? null : _sign,
          child: Text(_busy ? 'Saving…' : 'Confirm signature'),
        ),
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
