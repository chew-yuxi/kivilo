import 'package:flutter/material.dart';

import '../services/workspace.dart';
import 'kivilo_components.dart';

class WorkspacePicker extends StatelessWidget {
  const WorkspacePicker({
    super.key,
    required this.workspace,
    required this.onChanged,
    required this.onTeams,
    this.compact = false,
  });
  final Workspace workspace;
  final bool compact;
  final ValueChanged<String> onChanged;
  final VoidCallback onTeams;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Row(
        children: [
          Expanded(
            child: KiviloSelectField<String>(
              label: 'Workspace',
              value: workspace.value,
              options: [
                for (final agency in workspace.index.agencies)
                  KiviloSelectOption(value: agency.id, label: agency.name),
                const KiviloSelectOption(value: 'personal', label: 'Personal'),
                const KiviloSelectOption(value: 'all', label: 'All my work'),
              ],
              onChanged: onChanged,
            ),
          ),
          if (compact) ...[
            const SizedBox(width: 8),
            TextButton(
              onPressed: onTeams,
              child: Text(
                workspace.index.invitations.isNotEmpty
                    ? 'Invites (${workspace.index.invitations.length})'
                    : workspace.index.agencies.isEmpty
                    ? 'Set up team'
                    : 'Teams',
              ),
            ),
          ],
        ],
      ),
      if (!compact) ...[
        const SizedBox(height: 8),
        Text(
          workspace.agency != null
              ? 'Agents see assigned properties. Owners and managers see all team properties.'
              : workspace.personal
              ? 'Your personal properties, including work shared with you.'
              : 'Your assignments, shared tenancies and previous reports across workspaces.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: onTeams,
            icon: const Icon(Icons.person_outline),
            label: Text(
              workspace.index.invitations.isNotEmpty
                  ? 'Team invitations (${workspace.index.invitations.length})'
                  : workspace.index.agencies.isEmpty
                  ? 'Create or join a team'
                  : 'Manage teams',
            ),
          ),
        ),
      ],
    ],
  );
}
