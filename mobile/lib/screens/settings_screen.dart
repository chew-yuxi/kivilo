import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';
import '../services/api.dart';
import '../services/push_notifications.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _api = Api();
  late Future<Map<String, dynamic>> _request = _api.deletionRequest();
  bool _busy = false;
  String? _error;

  Future<void> _openPage(String path) async {
    final uri = Uri.parse(Config.apiBase).resolve(path);
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw StateError('Could not open $uri');
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  Future<void> _requestDeletion() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Request account deletion?'),
        content: const Text(
          'We will confirm your request and complete eligible deletion within '
          '30 days. Inspection and report records may need to be retained under '
          'the applicable tenancy record retention policy.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Request deletion'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _api.requestDeletion();
      if (mounted) setState(() => _request = _api.deletionRequest());
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _signOut() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (Config.isPushComplete) {
        try {
          await PushNotifications.instance.disableBeforeSignOut().timeout(
            const Duration(seconds: 5),
          );
        } catch (error) {
          // Push registration needs a connection, but a disconnected phone
          // must still be able to clear its local account session.
          debugPrint('Could not disable push before sign-out: $error');
        }
      }
      try {
        await Supabase.instance.client.auth.signOut().timeout(
          const Duration(seconds: 5),
        );
      } catch (error) {
        // Supabase clears the local session before attempting server revocation.
        // A failed remote request must not leave the person trapped in the app.
        if (Supabase.instance.client.auth.currentSession != null) rethrow;
        debugPrint('Remote sign-out could not be confirmed: $error');
      }
    } catch (error) {
      if (mounted) setState(() => _error = 'Could not sign out: $error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Settings')),
    body: FutureBuilder<Map<String, dynamic>>(
      future: _request,
      builder: (context, snapshot) {
        if (!snapshot.hasData && !snapshot.hasError) {
          return const Center(child: CircularProgressIndicator());
        }
        final deletion = snapshot.data?['request'] as Map<String, dynamic>?;
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              Supabase.instance.client.auth.currentUser?.email ?? '',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 24),
            const Text(
              'Account deletion',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18),
            ),
            const SizedBox(height: 8),
            const Text(
              'You can request deletion here or at the website below.',
            ),
            const SizedBox(height: 8),
            SelectableText(
              Uri.parse(Config.apiBase).resolve('/delete-account').toString(),
            ),
            TextButton.icon(
              onPressed: () => _openPage('/delete-account'),
              icon: const Icon(Icons.open_in_new),
              label: const Text('Open deletion page'),
            ),
            const SizedBox(height: 12),
            if (snapshot.hasError)
              Text('Could not load request status: ${snapshot.error}'),
            if (deletion != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Status: ${deletion['status']}\n'
                    'Requested: ${deletion['requestedAt']}\n'
                    'Due: ${deletion['dueAt']}'
                    '${deletion['completedAt'] == null ? '' : '\nCompleted: ${deletion['completedAt']}'}',
                  ),
                ),
              )
            else
              FilledButton(
                onPressed: _busy ? null : _requestDeletion,
                child: Text(_busy ? 'Sending…' : 'Request account deletion'),
              ),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 24),
            ListTile(
              title: const Text('Support'),
              subtitle: const Text('Help with your inspection or account'),
              trailing: const Icon(Icons.open_in_new),
              onTap: () => _openPage('/support'),
            ),
            OutlinedButton.icon(
              onPressed: _busy ? null : _signOut,
              icon: const Icon(Icons.logout),
              label: const Text('Sign out'),
            ),
          ],
        );
      },
    ),
  );
}
