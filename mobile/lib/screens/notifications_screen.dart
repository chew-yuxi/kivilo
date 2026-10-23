import 'package:flutter/material.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import '../services/notification_route.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_components.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _api = Api();
  late Future<List<NotificationModel>> _future = _api.notifications();

  Future<void> _open(NotificationModel item) async {
    await _api.markNotificationRead(item.id);
    final screen = await notificationScreen(item.href, _api);
    if (!mounted || screen == null) return;
    final destination = screen;
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => destination));
    if (!mounted) return;
    setState(() {
      _future = _api.notifications();
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Notifications')),
    body: KiviloContent(maxWidth: 840, child: FutureBuilder<List<NotificationModel>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return KiviloMessage(
            icon: Icons.cloud_off_outlined,
            title: 'Could not load notifications',
            body: plainError(snapshot.error!),
            actionLabel: 'Try again',
            onAction: () => setState(() {
              _future = _api.notifications();
            }),
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
              leading: Icon(item.readAt == null
                  ? Icons.notifications_active_outlined
                  : Icons.notifications_none),
              title: Text(item.title),
              subtitle: Text(item.body),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _open(item),
            );
          },
        );
      },
    )),
  );
}
