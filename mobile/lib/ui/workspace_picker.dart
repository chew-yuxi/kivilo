import 'package:flutter/material.dart';

import '../services/workspace.dart';

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
            child: DropdownButtonFormField<String>(
              key: ValueKey('workspace:${workspace.value}'),
              initialValue: workspace.value,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Workspace'),
              items: [
                for (final agency in workspace.index.agencies)
                  DropdownMenuItem(
                    value: agency.id,
                    child: Text(agency.name, overflow: TextOverflow.ellipsis),
                  ),
                const DropdownMenuItem(
                  value: 'personal',
                  child: Text('Personal'),
                ),
                const DropdownMenuItem(
                  value: 'all',
                  child: Text('All my work'),
                ),
              ],
              onChanged: (value) {
                if (value != null) onChanged(value);
              },
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
