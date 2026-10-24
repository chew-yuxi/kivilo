import 'package:flutter/material.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import '../services/notification_route.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_components.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key, this.api});
  final Api? api;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late final _api = widget.api ?? Api();
  late Loading<List<NotificationModel>> _loading = _api.load(
    _api.notifications,
    retainKey: 'notifications',
  );

  Future<void> _refresh() async {
    final next = _api.load(
      _api.notifications,
      savedFirst: false,
      retainKey: 'notifications',
    );
    setState(() => _loading = next);
    await next.fresh;
  }

  Future<void> _open(NotificationModel item) async {
    await _api.markNotificationRead(item.id);
    final screen = await notificationScreen(item.href, _api);
    if (!mounted || screen == null) return;
    final destination = screen;
    await Navigator.of(context)
        .push(MaterialPageRoute<void>(builder: (_) => destination));
    if (!mounted) return;
    await _refresh();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Notifications')),
    body: KiviloContent(
      maxWidth: 840,
      child: StreamBuilder<List<NotificationModel>>(
        stream: _loading.stream,
      builder: (context, snapshot) {
          if (!snapshot.hasData && !snapshot.hasError) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return KiviloMessage(
            icon: Icons.cloud_off_outlined,
            title: 'Could not load notifications',
            body: plainError(snapshot.error!),
            actionLabel: 'Try again',
              onAction: _refresh,
          );
        }
        final items = snapshot.data!;
        if (items.isEmpty) {
          return const KiviloMessage(
            icon: Icons.notifications_none_outlined,
            title: 'No notifications yet',
            body: 'Updates about your properties, repairs and reports will appear here.',
          );
        }
        return ListView.separated(
          itemCount: items.length,
          separatorBuilder: (_, _) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final item = items[index];
            return ListTile(
                leading: Icon(
                  item.readAt == null
                  ? Icons.notifications_active_outlined
                      : Icons.notifications_none,
                ),
              title: Text(item.title),
              subtitle: Text(item.body),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _open(item),
            );
          },
        );
      },
      ),
    ),
  );
}
