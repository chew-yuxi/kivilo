import 'package:flutter/material.dart';

import 'kivilo_theme.dart';

Future<T?> showKiviloDrawer<T>({
  required BuildContext context,
  required WidgetBuilder builder,
}) => showModalBottomSheet<T>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: builder,
);

class KiviloDrawer extends StatelessWidget {
  const KiviloDrawer({
    super.key,
    required this.title,
    required this.content,
    this.actions = const [],
  });

  final Widget title;
  final Widget content;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        4,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DefaultTextStyle.merge(
            style: Theme.of(context).textTheme.titleLarge,
            child: title,
          ),
          const SizedBox(height: 12),
          Flexible(child: SingleChildScrollView(child: content)),
          if (actions.isNotEmpty) ...[
            const SizedBox(height: 20),
            Row(
              children: [
                for (var index = 0; index < actions.length; index++) ...[
                  if (index > 0) const SizedBox(width: 10),
                  Expanded(child: actions[index]),
                ],
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class KiviloMark extends StatelessWidget {
  const KiviloMark({super.key, this.size = 34});
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: KiviloColors.pink,
      borderRadius: BorderRadius.circular(size * 0.28),
    ),
    alignment: Alignment.center,
    child: Container(
      width: size * 0.36,
      height: size * 0.36,
      decoration: const BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
      ),
    ),
  );
}

class KiviloSectionHeading extends StatelessWidget {
  const KiviloSectionHeading({
    super.key,
    required this.title,
    this.subtitle,
    this.action,
  });

  final String title;
  final String? subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.center,
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium),
            ],
          ],
        ),
      ),
      ?action,
    ],
  );
}

class KiviloSelectOption<T> {
  const KiviloSelectOption({
    required this.value,
    required this.label,
    this.description,
    this.icon,
  });

  final T value;
  final String label;
  final String? description;
  final IconData? icon;
}

class KiviloSelectField<T> extends StatelessWidget {
  const KiviloSelectField({
    super.key,
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
    this.sheetTitle,
    this.enabled = true,
  });

  final String label;
  final T value;
  final List<KiviloSelectOption<T>> options;
  final ValueChanged<T> onChanged;
  final String? sheetTitle;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final selected = options.firstWhere((option) => option.value == value);
    return Semantics(
      button: true,
      enabled: enabled,
      label: label,
      value: selected.label,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: enabled ? () => _showOptions(context) : null,
          borderRadius: BorderRadius.circular(12),
          child: Ink(
            decoration: BoxDecoration(
              color: enabled ? Colors.white : const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFD1D5DB)),
            ),
            padding: const EdgeInsets.fromLTRB(16, 10, 10, 10),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label, style: Theme.of(context).textTheme.bodySmall),
                      const SizedBox(height: 3),
                      Text(
                        selected.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              color: enabled
                                  ? KiviloColors.ink
                                  : KiviloColors.muted,
                            ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: enabled
                        ? KiviloColors.pinkSoft
                        : KiviloColors.border,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.keyboard_arrow_down_rounded,
                    color: enabled ? KiviloColors.pinkDark : KiviloColors.muted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _showOptions(BuildContext context) async {
    final result = await showModalBottomSheet<_KiviloSelection<T>>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _KiviloSelectSheet<T>(
        title: sheetTitle ?? 'Choose $label',
        value: value,
        options: options,
      ),
    );
    if (result != null && context.mounted) onChanged(result.value);
  }
}

class _KiviloSelection<T> {
  const _KiviloSelection(this.value);
  final T value;
}

class _KiviloSelectSheet<T> extends StatelessWidget {
  const _KiviloSelectSheet({
    required this.title,
    required this.value,
    required this.options,
  });

  final String title;
  final T value;
  final List<KiviloSelectOption<T>> options;

  @override
  Widget build(BuildContext context) => Container(
    constraints: BoxConstraints(
      maxHeight: MediaQuery.sizeOf(context).height * 0.78,
    ),
    decoration: const BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 10),
        Container(
          width: 38,
          height: 4,
          decoration: BoxDecoration(
            color: KiviloColors.border,
            borderRadius: BorderRadius.circular(99),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 12, 10),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              IconButton(
                tooltip: 'Close',
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded),
              ),
            ],
          ),
        ),
        Flexible(
          child: ListView.separated(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
            itemCount: options.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final option = options[index];
              final isSelected = option.value == value;
              return Material(
                color: isSelected ? KiviloColors.pinkSoft : Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(
                    color: isSelected ? KiviloColors.pink : KiviloColors.border,
                    width: isSelected ? 1.5 : 1,
                  ),
                ),
                clipBehavior: Clip.antiAlias,
                child: ListTile(
                  minTileHeight: 60,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 3,
                  ),
                  leading: option.icon == null
                      ? null
                      : Icon(
                          option.icon,
                          color: isSelected
                              ? KiviloColors.pinkDark
                              : KiviloColors.muted,
                        ),
                  title: Text(
                    option.label,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  subtitle: option.description == null
                      ? null
                      : Text(option.description!),
                  trailing: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: isSelected
                          ? KiviloColors.pink
                          : Colors.transparent,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isSelected
                            ? KiviloColors.pink
                            : KiviloColors.subtle,
                      ),
                    ),
                    child: isSelected
                        ? const Icon(
                            Icons.check_rounded,
                            size: 16,
                            color: Colors.white,
                          )
                        : null,
                  ),
                  onTap: () =>
                      Navigator.pop(context, _KiviloSelection<T>(option.value)),
                ),
              );
            },
          ),
        ),
      ],
    ),
  );
}

class KiviloStatusPill extends StatelessWidget {
  const KiviloStatusPill({super.key, required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, foreground, background) = switch (status) {
      'COMPLETED' => ('Completed', KiviloColors.green, KiviloColors.greenSoft),
      'REVIEWED' => ('Reviewed', KiviloColors.green, KiviloColors.greenSoft),
      'AWAITING_SIGNATURE' => (
        'Awaiting signatures',
        KiviloColors.amber,
        KiviloColors.amberSoft,
      ),
      'REVIEW' => ('Needs review', KiviloColors.amber, KiviloColors.amberSoft),
      'FAILED' => ('Needs attention', KiviloColors.red, KiviloColors.redSoft),
      'PROCESSING' => (
        'Drafting',
        KiviloColors.pinkDark,
        KiviloColors.pinkSoft,
      ),
      'CAPTURING' => (
        'Capturing',
        KiviloColors.pinkDark,
        KiviloColors.pinkSoft,
      ),
      'PENDING' => ('Not started', KiviloColors.muted, KiviloColors.canvas),
      _ => ('Draft', KiviloColors.muted, KiviloColors.canvas),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
