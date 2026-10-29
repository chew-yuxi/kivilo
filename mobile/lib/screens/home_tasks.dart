import 'package:flutter/material.dart';

import '../models/home_tasks.dart';
import '../services/api.dart';
import '../services/notification_route.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';

const homeTaskGroups = {
  'ACTION': 'Needs your action',
  'WAITING': 'Waiting on others',
  'COMING_UP': 'Coming up',
};

/// What a row's date means, in words. Only a passed deadline says overdue.
String? homeTaskDate(HomeTask task, {DateTime? now}) {
  final date = task.date;
  if (date == null) return null;
  final today = (now ?? DateTime.now()).toIso8601String().substring(0, 10);
  return switch (task.dateKind) {
    'DEADLINE' =>
      task.overdue
          ? 'Overdue · was due by ${calendarDate(date)}'
          : 'Due by ${calendarDate(date)}',
    'ENDS' =>
      date.compareTo(today) < 0
          ? 'Ended ${calendarDate(date)}'
          : 'Ends ${calendarDate(date)}',
    'STARTED' => 'Started ${shortDate(date)}',
    'REPORTED' => 'Reported ${shortDate(date)}',
    'REQUESTED' => 'Requested ${shortDate(date)}',
    _ => null,
  };
}

/// Opens the one screen a row names. That screen authorizes its own read, so a stale
/// row reads "not found" there rather than showing anything it should not.
Future<void> openHomeTask(BuildContext context, Api api, HomeTask task) async {
  final messenger = ScaffoldMessenger.of(context);
  final navigator = Navigator.of(context);
  try {
    final screen = await notificationScreen(task.href, api);
    if (screen == null) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Open this on the Kivilo website.')),
      );
      return;
    }
    await navigator.push(MaterialPageRoute<void>(builder: (_) => screen));
  } catch (error) {
    messenger.showSnackBar(SnackBar(content: Text(plainError(error))));
  }
}

class HomeTaskRow extends StatelessWidget {
  const HomeTaskRow({super.key, required this.task, required this.onTap});
  final HomeTask task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final date = homeTaskDate(task);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(task.title, style: text.titleMedium),
                  const SizedBox(height: 3),
                  Text(
                    task.property,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: text.bodyMedium,
                  ),
                  if (task.person != null) ...[
                    const SizedBox(height: 2),
                    Text(task.person!, style: text.bodySmall),
                  ],
                  if (date != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      date,
                      style: text.bodySmall?.copyWith(
                        color: task.overdue ? KiviloColors.red : null,
                        fontWeight: task.overdue ? FontWeight.w700 : null,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: KiviloColors.subtle),
          ],
        ),
      ),
    );
  }
}

/// One group on Home: its first rows, and a way to every row. The count is the whole
/// group, or "at least" when the server stopped at its bound.
class HomeTaskSection extends StatelessWidget {
  const HomeTaskSection({
    super.key,
    required this.group,
    required this.tasks,
    required this.truncated,
    required this.onOpen,
    required this.onViewAll,
    this.excludedTaskId,
    this.limit = 5,
  });
  final String group;
  final List<HomeTask> tasks;
  final bool truncated;
  final ValueChanged<HomeTask> onOpen;
  final VoidCallback onViewAll;
  /// Already shown in Home's inspection shortcut; keep it in the total and View all.
  final String? excludedTaskId;
  final int limit;

  @override
  Widget build(BuildContext context) {
    final count = '${tasks.length}${truncated ? '+' : ''}';
    final shown = tasks
        .where((task) => task.id != excludedTaskId)
        .take(limit)
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text(
            '${homeTaskGroups[group]} · $count',
            style: Theme.of(context).textTheme.titleLarge,
          ),
        ),
        const SizedBox(height: kiviloHeadingGap),
        Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              for (var i = 0; i < shown.length; i++) ...[
                if (i > 0) const Divider(height: 1),
                HomeTaskRow(task: shown[i], onTap: () => onOpen(shown[i])),
              ],
            ],
          ),
        ),
        if (tasks.length > limit || truncated) ...[
          const SizedBox(height: 8),
          TextButton(
            onPressed: onViewAll,
            child: Text('View all $count'),
          ),
        ],
      ],
    );
  }
}

/// Every row of one group, read again from the server so finished work leaves the list.
class HomeTaskListScreen extends StatefulWidget {
  const HomeTaskListScreen({
    super.key,
    required this.api,
    required this.group,
    required this.fetch,
  });
  final Api api;
  final String group;
  final Future<HomeTasks> Function() fetch;

  @override
  State<HomeTaskListScreen> createState() => _HomeTaskListScreenState();
}

class _HomeTaskListScreenState extends State<HomeTaskListScreen> {
  late Loading<HomeTasks> _loading = widget.api.load(widget.fetch);

  /// The list renders a failure itself, in place of the rows.
  Future<void> _refresh() async {
    final next = widget.api.load(widget.fetch, savedFirst: false);
    setState(() => _loading = next);
    await next.fresh.then((_) {}, onError: (Object _) {});
  }

  Future<void> _open(HomeTask task) async {
    await openHomeTask(context, widget.api, task);
    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(homeTaskGroups[widget.group]!)),
    body: KiviloContent(
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: StreamBuilder<HomeTasks>(
          stream: _loading.stream,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return KiviloMessage(
                icon: Icons.cloud_off_outlined,
                title: 'Could not load your tasks',
                body: plainError(snapshot.error!),
                actionLabel: 'Try again',
                onAction: _refresh,
              );
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final data = snapshot.data!;
            final tasks = data.group(widget.group);
            if (tasks.isEmpty) {
              return const KiviloMessage(
                icon: Icons.check_circle_outline,
                title: 'Nothing here now',
                body: 'Everything in this list has been dealt with.',
              );
            }
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: kiviloScreenPadding,
              children: [
                Card(
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      children: [
                        for (var i = 0; i < tasks.length; i++) ...[
                          if (i > 0) const Divider(height: 1),
                          HomeTaskRow(
                            task: tasks[i],
                            onTap: () => _open(tasks[i]),
                          ),
                        ],
                      ],
                    ),
                  ),
                if (data.truncated) ...[
                  const SizedBox(height: 12),
                  const KiviloNotice(
                    tone: KiviloTone.info,
                    child: Text(
                      'There is more than one screen of work. Finish some of '
                      'these, or open Properties to see every record.',
                    ),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    ),
  );
}
