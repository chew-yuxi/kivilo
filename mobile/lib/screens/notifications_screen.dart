import 'package:flutter/material.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import 'maintenance_case_screen.dart';
import 'report_screen.dart';

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
    final href = item.href ?? '';
    Widget? screen;
    if (href.startsWith('/maintenance/')) {
      screen = MaintenanceCaseScreen(
        caseId: href.substring('/maintenance/'.length),
      );
    } else if (href.startsWith('/updates/')) {
      // An update to a signed report: open the report, where it is acknowledged.
      final reportId = await _api.addendumReport(
        href.substring('/updates/'.length),
      );
      screen = ReportScreen(id: reportId);
    }
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
    body: FutureBuilder<List<NotificationModel>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) return Center(child: Text(plainError(snapshot.error!)));
        final items = snapshot.data!;
        if (items.isEmpty) return const Center(child: Text('No notifications yet.'));
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
    ),
  );
}
