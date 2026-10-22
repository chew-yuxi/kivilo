import '../models/agency.dart';
import 'api.dart';

/// Shared by Home and Inspections. The saved choice belongs to the signed-in
/// account; team membership is read again before loading any workspace.
class Workspace {
  Workspace(this.api);
  final Api api;
  AgencyIndex index = const AgencyIndex(agencies: [], invitations: []);
  String? _choice;

  String get value => _choice ?? index.agencies.firstOrNull?.id ?? 'personal';
  bool get personal => value == 'personal';
  bool get all => value == 'all';
  AgencySummary? get agency =>
      index.agencies.where((team) => team.id == value).firstOrNull;

  Future<void> refresh() async {
    _choice = await api.workspacePreference();
    AgencyIndex next;
    try {
      next = await api.agencies();
    } on ApiFailure catch (error) {
      // An explicit All my work choice can reopen the existing offline library
      // on first launch after upgrading, before a team index was ever cached.
      if (all && error.statusCode == null) return;
      rethrow;
    }
    final choice = _choice;
    final valid =
        choice == null ||
        choice == 'personal' ||
        choice == 'all' ||
        next.agencies.any((team) => team.id == choice);
    if (!valid) await api.saveWorkspacePreference(null);
    index = next;
    _choice = valid ? choice : null;
  }

  Future<void> select(String value) async {
    if (value != 'personal' &&
        value != 'all' &&
        !index.agencies.any((team) => team.id == value)) {
      throw const ApiFailure(
        'Team access changed. Refresh and try again.',
        404,
      );
    }
    await api.saveWorkspacePreference(value);
    _choice = value;
  }
}
