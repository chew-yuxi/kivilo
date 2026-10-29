import 'package:flutter/material.dart';

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
      label: homes ? 'Showing' : 'Workspace',
      sheetTitle: homes ? 'Choose what to show' : 'Choose workspace',
      value: workspace.value,
      options: [
        if (workspace.hasWork) ...[
          KiviloSelectOption(value: 'all', label: 'All my work', group: work),
          KiviloSelectOption(value: 'personal', label: 'Personal', group: work),
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
                : 'Add a team',
            icon: Icons.add,
            action: true,
            group: work,
          ),
        ],
        if (contexts.landlord)
          const KiviloSelectOption(
            value: 'landlord',
            label: 'Homes I own',
            description: 'Where you are the landlord',
            group: 'Your homes',
          ),
        if (contexts.tenant)
          const KiviloSelectOption(
            value: 'tenant',
            label: 'Homes I rent',
            description: 'Where you are the tenant',
            group: 'Your homes',
          ),
      ],
      onChanged: (value) => value == _addTeam ? onTeams() : onChanged(value),
    );
  }
}
