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
    return TabBar(
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
