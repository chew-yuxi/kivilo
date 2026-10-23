import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../services/workspace.dart';
import 'kivilo_components.dart';

/// Not a workspace: choosing it opens team setup and leaves the selection as it was.
const _addTeam = '__add_team__';

class WorkspacePicker extends StatelessWidget {
  const WorkspacePicker({
    super.key,
    required this.workspace,
    required this.onChanged,
    required this.onTeams,
  });
  final Workspace workspace;
  final ValueChanged<String> onChanged;
  final VoidCallback onTeams;

  @override
  Widget build(BuildContext context) {
    final invitations = workspace.index.invitations.length;
    return KiviloSelectField<String>(
      label: t.settingsWorkspace,
      sheetTitle: t.workspaceChoose,
      value: workspace.value,
      options: [
        KiviloSelectOption(value: 'all', label: t.workspaceAll),
        KiviloSelectOption(value: 'personal', label: t.workspacePersonal),
        for (final agency in workspace.index.agencies)
          KiviloSelectOption(value: agency.id, label: agency.name),
        KiviloSelectOption(
          value: _addTeam,
          label: invitations > 0
              ? t.workspaceInvitations(invitations)
              : t.workspaceAddTeam,
          icon: Icons.add,
          action: true,
        ),
      ],
      onChanged: (value) => value == _addTeam ? onTeams() : onChanged(value),
    );
  }
}
