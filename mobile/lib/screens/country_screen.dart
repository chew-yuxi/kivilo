import 'package:flutter/material.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';

const _choices = [
  KiviloSegmentOption(value: 'SG', label: 'Singapore'),
  KiviloSegmentOption(value: 'MY', label: 'Malaysia'),
];

/// Asked once, before Home, of an agent who has not said where they work. Their new
/// properties are made in that country. There is no way past without a saved answer:
/// a failed save says why and offers Try again, and the answer is saved on the phone
/// with the profile, so it is never asked twice.
class CountryScreen extends StatefulWidget {
  const CountryScreen({
    super.key,
    required this.api,
    required this.onSaved,
    this.region,
  });

  final Api api;
  final ValueChanged<UserProfile> onSaved;

  /// The phone's region, which picks the first choice. Read from the phone when null.
  final String? region;

  @override
  State<CountryScreen> createState() => _CountryScreenState();
}

class _CountryScreenState extends State<CountryScreen> {
  late String _country =
      (widget.region ??
              WidgetsBinding.instance.platformDispatcher.locale.countryCode) ==
          'MY'
      ? 'MY'
      : 'SG';
  bool _saving = false;
  String? _error;

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final profile = await widget.api.saveCountry(_country);
      if (mounted) widget.onSaved(profile);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: KiviloContent(
          maxWidth: 560,
          child: ListView(
            padding: kiviloScreenPadding,
            children: [
              const SizedBox(height: 24),
              const Align(alignment: Alignment.centerLeft, child: KiviloMark()),
              const SizedBox(height: 24),
              Text('Where do you work?', style: text.headlineMedium),
              const SizedBox(height: 6),
              Text(
                'New properties use that country\'s addresses and currency. '
                'You can change this later in Account.',
                style: text.bodyMedium,
              ),
              const SizedBox(height: kiviloSectionGap),
              KiviloSegmentedControl<String>(
                value: _country,
                options: _choices,
                onChanged: _saving
                    ? null
                    : (value) => setState(() => _country = value!),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                KiviloNotice(
                  tone: KiviloTone.error,
                  child: Text('Could not save where you work. $_error'),
                ),
              ],
            ],
          ),
        ),
      ),
      bottomNavigationBar: KiviloActionFooter(
        maxWidth: 560,
        child: FilledButton(
          onPressed: _saving ? null : _save,
          child: Text(_saving ? 'Saving…' : _error != null ? 'Try again' : 'Continue'),
        ),
      ),
    );
  }
}

/// Changes where the agent works, from Account. Pops with the saved profile.
class CountryDrawer extends StatefulWidget {
  const CountryDrawer({super.key, required this.api, required this.current});

  final Api api;
  final String? current;

  @override
  State<CountryDrawer> createState() => _CountryDrawerState();
}

class _CountryDrawerState extends State<CountryDrawer> {
  late String _country = widget.current ?? 'SG';
  bool _saving = false;
  String? _error;

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final profile = await widget.api.saveCountry(_country);
      if (mounted) Navigator.pop(context, profile);
    } catch (error) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = plainError(error);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => KiviloDrawer(
    title: const Text('Where do you work?'),
    content: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'New properties are made in this country. Properties you already '
          'have keep theirs.',
        ),
        const SizedBox(height: 16),
        KiviloSegmentedControl<String>(
          value: _country,
          options: _choices,
          onChanged: _saving
              ? null
              : (value) => setState(() => _country = value!),
        ),
        if (_error != null) ...[
          const SizedBox(height: 16),
          KiviloNotice(
            tone: KiviloTone.error,
            child: Text('Could not save where you work. $_error'),
          ),
        ],
      ],
    ),
    actions: [
      TextButton(
        onPressed: _saving ? null : () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: _saving ? null : _save,
        child: Text(_saving ? 'Saving…' : 'Save'),
      ),
    ],
  );
}
