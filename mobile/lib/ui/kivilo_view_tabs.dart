import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'kivilo_theme.dart';

const _dividerHeight = 1.0;

/// Switches between views of a list. The current view stays visible in a narrow strip.
class KiviloViewTabs extends StatefulWidget {
  const KiviloViewTabs({
    super.key,
    required this.labels,
    required this.selected,
    required this.onChanged,
  });

  final List<String> labels;
  final int selected;
  final ValueChanged<int> onChanged;

  @override
  State<KiviloViewTabs> createState() => _KiviloViewTabsState();
}

class _KiviloViewTabsState extends State<KiviloViewTabs>
    with TickerProviderStateMixin {
  TabController? _controller;

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncController();
  }

  @override
  void didUpdateWidget(KiviloViewTabs oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncController();
  }

  void _syncController() {
    final duration = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : const Duration(milliseconds: 220);
    if (_controller?.length != widget.labels.length ||
        _controller?.animationDuration != duration) {
      _controller?.dispose();
      _controller = TabController(
        length: widget.labels.length,
        initialIndex: widget.selected,
        animationDuration: duration,
        vsync: this,
      );
    } else if (_controller!.index != widget.selected) {
      _controller!.animateTo(widget.selected);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(
        highlightColor: Colors.transparent,
        splashColor: KiviloColors.ink.withValues(alpha: 0.18),
      ),
      child: TabBar(
        splashFactory: MediaQuery.disableAnimationsOf(context)
            ? const _TabRippleFactory(reduceMotion: true)
            : const _TabRippleFactory(reduceMotion: false),
        // Let ink resolve the ripple and pressed surface colours independently.
        overlayColor: const WidgetStatePropertyAll<Color?>(null),
        controller: _controller,
        onTap: (index) {
          if (index != widget.selected) widget.onChanged(index);
        },
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        labelColor: KiviloColors.ink,
        unselectedLabelColor: KiviloColors.muted,
        labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        unselectedLabelStyle: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        labelPadding: const EdgeInsets.symmetric(horizontal: 8),
        dividerHeight: _dividerHeight,
        dividerColor: KiviloColors.border,
        indicator: const _ViewMark(),
        indicatorSize: TabBarIndicatorSize.tab,
        indicatorAnimation: TabIndicatorAnimation.linear,
        tabs: [
          for (final label in widget.labels)
            ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 44, minHeight: 48),
              child: Center(child: Text(label, softWrap: false)),
            ),
        ],
      ),
    );
  }
}

// A Material tab normally sizes its splash to reach the farthest corner.
// Keep a visible circular edge throughout a quick tap and a long press.
class _TabRippleFactory extends InteractiveInkFeatureFactory {
  const _TabRippleFactory({required this.reduceMotion});

  final bool reduceMotion;

  @override
  InteractiveInkFeature create({
    required MaterialInkController controller,
    required RenderBox referenceBox,
    required Offset position,
    required Color color,
    required TextDirection textDirection,
    bool containedInkWell = false,
    RectCallback? rectCallback,
    BorderRadius? borderRadius,
    ShapeBorder? customBorder,
    double? radius,
    VoidCallback? onRemoved,
  }) => _TabRipple(
    controller: controller,
    referenceBox: referenceBox,
    position: position,
    color: color,
    textDirection: textDirection,
    reduceMotion: reduceMotion,
    onRemoved: onRemoved,
  );
}

class _TabRipple extends InteractiveInkFeature {
  _TabRipple({
    required super.controller,
    required super.referenceBox,
    required this.position,
    required super.color,
    required this.textDirection,
    required bool reduceMotion,
    super.onRemoved,
  }) {
    _growth = AnimationController(
      vsync: controller.vsync,
      duration: const Duration(milliseconds: 150),
      value: reduceMotion ? 1 : 0,
    )..addListener(controller.markNeedsPaint);
    _fade =
        AnimationController(
            vsync: controller.vsync,
            duration: const Duration(milliseconds: 240),
          )
          ..addListener(controller.markNeedsPaint)
          ..addStatusListener((status) {
            if (status == AnimationStatus.completed) dispose();
          });
    controller.addInkFeature(this);
    if (!reduceMotion) _growth.forward();
  }

  final Offset position;
  final TextDirection textDirection;
  late final AnimationController _growth;
  late final AnimationController _fade;

  @override
  void confirm() => _fade.forward();

  @override
  void cancel() => confirm();

  @override
  void dispose() {
    _growth.dispose();
    _fade.dispose();
    super.dispose();
  }

  @override
  void paintFeature(Canvas canvas, Matrix4 transform) {
    final size = referenceBox.size;
    final limit = math.min(22.0, size.shortestSide / 2);
    final radius =
        limit * (0.2 + 0.8 * Curves.easeOut.transform(_growth.value));
    // Move only as far as needed to keep the circle inside an edge tap.
    final center = Offset(
      position.dx.clamp(radius, size.width - radius).toDouble(),
      position.dy.clamp(radius, size.height - radius).toDouble(),
    );
    paintInkCircle(
      canvas: canvas,
      transform: transform,
      paint: Paint()
        ..color = color.withValues(
          alpha: color.a * (1 - const Interval(0.35, 1).transform(_fade.value)),
        ),
      center: center,
      radius: radius,
      textDirection: textDirection,
    );
  }
}

class _ViewMark extends Decoration {
  const _ViewMark();
  @override
  BoxPainter createBoxPainter([VoidCallback? onChanged]) => _MarkPainter();
}

class _MarkPainter extends BoxPainter {
  @override
  void paint(Canvas canvas, Offset offset, ImageConfiguration configuration) {
    final size = configuration.size!;
    const width = 22.0;
    const height = 5.0;
    final rect = Rect.fromLTWH(
      offset.dx + (size.width - width) / 2,
      offset.dy + size.height - _dividerHeight - height,
      width,
      height,
    );
    canvas.drawRRect(
      const BorderRadius.vertical(top: Radius.circular(height)).toRRect(rect),
      Paint()..color = KiviloColors.actionPink,
    );
  }
}
