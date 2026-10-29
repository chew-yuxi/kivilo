import 'package:flutter/foundation.dart';

import '../models/agency.dart';
import '../models/maintenance.dart';
import 'api.dart';

/// Shared by Home and Properties. The saved choice belongs to the signed-in
/// account; team membership and relationships are read again before loading any
/// context. `all`, `personal` and a team id are the account's agent work; `landlord`
/// and `tenant` are the homes it owns or rents. A choice only narrows what the server
/// already scopes: it never grants anything.
class Workspace extends ChangeNotifier {
  Workspace(this.api);
  final Api api;
  AgencyIndex index = const AgencyIndex(agencies: [], invitations: []);
  UserProfile? profile;
  String? _choice;

  UserContexts get contexts {
    final profile = this.profile;
    if (profile == null) {
      return const UserContexts(work: true, landlord: false, tenant: false);
    }
    // A server from before contexts: one role per tenancy, as `roles` always meant.
    return profile.contexts ??
        UserContexts(
          work: profile.roles.contains('AGENT'),
          landlord: profile.roles.contains('LANDLORD'),
          tenant: profile.roles.contains('TENANT'),
        );
  }

  /// A fresh account has no relationships yet and starts with work, so it can begin a
  /// check-in; a landlord or tenant only gets their homes.
  bool get hasWork =>
      contexts.work || (!contexts.landlord && !contexts.tenant);

  /// One choice is no choice: a tenant of one home never sees the picker.
  bool get showPicker => hasWork || (contexts.landlord && contexts.tenant);

  String get value =>
      _choice ??
      (hasWork
          ? 'all'
          : contexts.landlord
          ? 'landlord'
          : 'tenant');
  bool get personal => value == 'personal';
  bool get all => value == 'all';

  /// `LANDLORD` or `TENANT` while showing homes rather than work.
  String? get party => switch (value) {
    'landlord' => 'LANDLORD',
    'tenant' => 'TENANT',
    _ => null,
  };
  AgencySummary? get agency =>
      index.agencies.where((team) => team.id == value).firstOrNull;

  bool _valid(String? choice) =>
      choice == null ||
      switch (choice) {
        'landlord' => contexts.landlord,
        'tenant' => contexts.tenant,
        'personal' || 'all' => hasWork,
        _ => hasWork && index.agencies.any((team) => team.id == choice),
      };

  Future<void> refresh() async {
    _choice = await api.workspacePreference();
    UserProfile nextProfile;
    AgencyIndex next;
    try {
      nextProfile = await api.me();
      next = await api.agencies();
    } on ApiFailure catch (error) {
      // An explicit All properties choice can reopen the existing offline library
      // on first launch after upgrading, before a team index was ever cached.
      if (all && error.statusCode == null) return;
      rethrow;
    }
    profile = nextProfile;
    index = next;
    final valid = _valid(_choice);
    if (!valid) await api.saveWorkspacePreference(null);
    _choice = valid ? _choice : null;
  }

  Future<void> select(String value) async {
    if (!_valid(value)) {
      throw ApiFailure(
        value == 'landlord' || value == 'tenant'
            ? 'Access changed. Refresh and try again.'
            : 'Team access changed. Refresh and try again.',
        404,
      );
    }
    final changed = value != this.value;
    await api.saveWorkspacePreference(value);
    _choice = value;
    if (changed) notifyListeners();
  }
}
