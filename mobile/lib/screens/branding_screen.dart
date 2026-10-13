import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/branding.dart';
import '../models/maintenance.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';

/// The name, agency and logo printed at the top of every report this agent prepares.
class BrandingScreen extends StatefulWidget {
  const BrandingScreen({super.key});

  @override
  State<BrandingScreen> createState() => _BrandingScreenState();
}

class _BrandingScreenState extends State<BrandingScreen> {
  final _form = GlobalKey<FormState>();
  final _api = Api();
  final _picker = ImagePicker();
  final _fields = <String, TextEditingController>{
    for (final name in [
      'agentName',
      'agencyName',
      'agencyLicence',
      'ceaRegistration',
      'phone',
    ])
      name: TextEditingController(),
  };
  AgentBranding? _branding;
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final controller in _fields.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([_api.me(), _api.branding()]);
      final profile = results[0] as UserProfile;
      final branding = results[1] as AgentBranding?;
      _fields['agentName']!.text = profile.name;
      _fields['agencyName']!.text = branding?.agencyName ?? '';
      _fields['agencyLicence']!.text = branding?.agencyLicence ?? '';
      _fields['ceaRegistration']!.text = branding?.ceaRegistration ?? '';
      _fields['phone']!.text = branding?.phone ?? '';
      if (mounted) setState(() => _branding = branding);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    await _run(() async {
      final branding = await _api.saveBranding({
        for (final entry in _fields.entries) entry.key: entry.value.text.trim(),
      });
      if (!mounted) return;
      setState(() => _branding = branding);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Report branding saved')));
    });
  }

  Future<void> _pickLogo() async {
    // Bounded on the phone so the upload stays well under the server's 1 MB limit.
    final picked = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1200,
      maxHeight: 1200,
      imageQuality: 90,
    );
    if (picked == null) return;
    await _run(() async {
      final branding = await _api.uploadBrandingLogo(
        await picked.readAsBytes(),
      );
      if (mounted) setState(() => _branding = branding);
    });
  }

  Future<void> _removeLogo() => _run(() async {
    await _api.removeBrandingLogo();
    final branding = await _api.branding();
    if (mounted) setState(() => _branding = branding);
  });

  Widget _textField(
    String key,
    String label, {
    bool required = false,
    TextInputType? keyboardType,
  }) => TextFormField(
    controller: _fields[key],
    decoration: InputDecoration(labelText: label),
    keyboardType: keyboardType,
    textCapitalization: TextCapitalization.words,
    validator: (value) =>
        required && (value?.trim() ?? '').isEmpty ? '$label is required' : null,
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Report branding')),
    body: _loading
        ? const Center(child: CircularProgressIndicator())
        : Form(
            key: _form,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
              children: [
                Text(
                  'How your reports are headed',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 6),
                Text(
                  'Printed on the cover and every page of the reports you '
                  'prepare, and on the shared link.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 28),
                const KiviloSectionHeading(title: 'You'),
                const SizedBox(height: 12),
                _textField('agentName', 'Your name', required: true),
                const SizedBox(height: 12),
                _textField('ceaRegistration', 'CEA registration number'),
                const SizedBox(height: 12),
                _textField('phone', 'Phone', keyboardType: TextInputType.phone),
                const SizedBox(height: 28),
                const KiviloSectionHeading(title: 'Agency'),
                const SizedBox(height: 12),
                _textField('agencyName', 'Agency name', required: true),
                const SizedBox(height: 12),
                _textField('agencyLicence', 'Agency licence number'),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Logo',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 12),
                        if (_branding?.logoUrl != null)
                          Container(
                            height: 72,
                            alignment: Alignment.centerLeft,
                            child: Image.network(
                              _branding!.logoUrl!,
                              fit: BoxFit.contain,
                            ),
                          )
                        else
                          Text(
                            _branding == null
                                ? 'Save your agency name first, then add its logo.'
                                : 'No logo yet. PNG, JPEG or WebP under 1 MB.',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: _busy || _branding == null
                              ? null
                              : _pickLogo,
                          icon: const Icon(Icons.image_outlined),
                          label: Text(
                            _branding?.logoUrl == null
                                ? 'Choose logo'
                                : 'Replace logo',
                          ),
                        ),
                        if (_branding?.logoUrl != null)
                          TextButton(
                            onPressed: _busy ? null : _removeLogo,
                            child: const Text('Remove logo'),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: KiviloColors.redSoft,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: KiviloColors.red),
                    ),
                  ),
              ],
            ),
          ),
    bottomNavigationBar: SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
        child: FilledButton(
          onPressed: _busy || _loading ? null : _save,
          child: Text(_busy ? 'Saving…' : 'Save'),
        ),
      ),
    ),
  );
}
