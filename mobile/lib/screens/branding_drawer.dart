import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/maintenance.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';

/// Edits how this agent's reports are headed. Saves the text first, because the server
/// only takes a logo for an agency that has a name, then the logo change if any.
/// Pops with the saved branding.
class BrandingDrawer extends StatefulWidget {
  const BrandingDrawer({
    super.key,
    required this.api,
    this.current,
    this.agentName,
  });
  final Api api;
  final AgentBranding? current;

  /// The agent's own name, printed beside the agency. Until they change it, it is the
  /// start of their email address.
  final String? agentName;

  @override
  State<BrandingDrawer> createState() => _BrandingDrawerState();
}

class _BrandingDrawerState extends State<BrandingDrawer> {
  late final _agentName = TextEditingController(text: widget.agentName);
  late final _name = TextEditingController(text: widget.current?.agencyName);
  late final _licence = TextEditingController(
    text: widget.current?.agencyLicence,
  );
  late final _cea = TextEditingController(
    text: widget.current?.ceaRegistration,
  );
  late final _phone = TextEditingController(text: widget.current?.phone);
  Uint8List? _newLogo;
  bool _removeLogo = false;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _agentName.dispose();
    _name.dispose();
    _licence.dispose();
    _cea.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _pickLogo() async {
    // Downscaled on the phone so a camera-roll image fits the 1 MB the server accepts.
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 800,
      maxHeight: 800,
      imageQuality: 90,
    );
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    setState(() {
      _newLogo = bytes;
      _removeLogo = false;
    });
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      var saved = await widget.api.saveBranding({
        if (_agentName.text.trim().isNotEmpty)
          'agentName': _agentName.text.trim(),
        'agencyName': _name.text.trim(),
        'agencyLicence': _licence.text.trim(),
        'ceaRegistration': _cea.text.trim(),
        'phone': _phone.text.trim(),
      });
      if (_newLogo != null) {
        saved = await widget.api.uploadBrandingLogo(_newLogo!);
      } else if (_removeLogo) {
        saved = await widget.api.removeBrandingLogo();
      }
      if (mounted) Navigator.pop(context, saved);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final existingLogo = _removeLogo ? null : widget.current?.logoUrl;
    final Widget? preview = _newLogo != null
        ? Image.memory(_newLogo!, fit: BoxFit.contain)
        : existingLogo != null
        ? Image.network(existingLogo, fit: BoxFit.contain)
        : null;
    return KiviloDrawer(
      title: const Text('Report branding'),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Heads every PDF and shared report you prepare. Landlords and tenants '
            'see it; the signed contents of a report never change.',
            style: text.bodyMedium,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                width: 64,
                height: 64,
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: KiviloColors.canvas,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: KiviloColors.border),
                ),
                child:
                    preview ??
                    const Icon(
                      Icons.storefront_outlined,
                      color: KiviloColors.subtle,
                    ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Logo', style: text.titleMedium),
                    Text(
                      'PNG or JPEG, shown at the top left',
                      style: text.bodySmall,
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: _saving ? null : _pickLogo,
                child: Text(preview == null ? 'Choose' : 'Replace'),
              ),
              if (preview != null)
                IconButton(
                  tooltip: 'Remove logo',
                  onPressed: _saving
                      ? null
                      : () => setState(() {
                          _newLogo = null;
                          _removeLogo = true;
                        }),
                  icon: const Icon(Icons.close_rounded),
                ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _agentName,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(labelText: 'Your name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(labelText: 'Agency name'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _licence,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Agency licence (optional)',
              hintText: 'e.g. L3010000A',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _cea,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Your CEA registration (optional)',
              hintText: 'e.g. R061234B',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Phone (optional)'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: KiviloColors.red)),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving || _name.text.trim().isEmpty ? null : _save,
          child: Text(_saving ? 'Saving…' : 'Save'),
        ),
      ],
    );
  }
}
