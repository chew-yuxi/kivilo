import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../services/workspace.dart';
import 'kivilo_components.dart';

/// Not a workspace: choosing it opens team setup and leaves the selection as it was.
const _addTeam = '__add_team__';

/// One picker for every context the account holds: its work, by team, and the homes
/// it owns or rents. Choosing a context is a view, never a role or a permission.
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
    final contexts = workspace.contexts;
    final homes = contexts.landlord || contexts.tenant;
    final work = homes && workspace.hasWork ? 'My work' : null;
    return KiviloSelectField<String>(
      label: homes ? t.showing : t.settingsWorkspace,
      sheetTitle: homes ? 'Choose what to show' : t.workspaceChoose,
      value: workspace.value,
      options: [
        if (workspace.hasWork) ...[
          KiviloSelectOption(value: 'all', label: t.allMyWork, group: work),
          KiviloSelectOption(
            value: 'personal',
            label: t.workspacePersonal,
            group: work,
          ),
          for (final agency in workspace.index.agencies)
            KiviloSelectOption(
              value: agency.id,
              label: agency.name,
              group: work,
            ),
          KiviloSelectOption(
            value: _addTeam,
            label: invitations > 0
                ? 'Team invitations ($invitations)'
                : t.workspaceAddTeam,
            icon: Icons.add,
            action: true,
            group: work,
          ),
        ],
        if (contexts.landlord)
          KiviloSelectOption(
            value: 'landlord',
            label: t.homesIOwn,
            description: t.whereYouAreTheLandlord,
            group: 'Your homes',
          ),
        if (contexts.tenant)
          KiviloSelectOption(
            value: 'tenant',
            label: t.homesIRent,
            description: t.whereYouAreTheTenant,
            group: 'Your homes',
          ),
      ],
      onChanged: (value) => value == _addTeam ? onTeams() : onChanged(value),
    );
  }
}
