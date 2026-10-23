import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../l10n/l10n.dart';
import 'error_reporter.dart';

/// The server explains a team refusal in an English sentence and no code, so the
/// sentence is the key. One the app does not know yet is shown as the server wrote it.
Map<String, String> get _agencyMessages => {
  'A landlord or tenant cannot be assigned as an agent on their own tenancy.': t.agencyErrPartyAsAgent,
  'A tenancy already assigned to a team cannot be moved to another team.': t.agencyErrAlreadyInTeam,
  'An invitation is already pending. Use Resend invitation if needed.': t.agencyErrInvitationPending,
  'Choose a responsible lead agent.': t.agencyErrChooseLead,
  'Choose a team before assigning team members.': t.agencyErrChooseTeam,
  'Choose active members of this team.': t.agencyErrChooseActive,
  'Choose an active team member to take over this person’s properties.': t.agencyErrChooseSuccessor,
  'Make another active member an owner before removing the last owner.': t.agencyErrLastOwner,
  'Make another member an owner of each team you own before requesting account deletion.': t.agencyErrOwnerDeletion,
  'Only a team owner can change ownership.': t.agencyErrOwnerOnly,
  'The new lead cannot be a landlord or tenant on one of these tenancies.': t.agencyErrLeadIsParty,
  'This invitation has expired. Ask a team manager to send it again.': t.agencyErrInvitationExpired,
  'This person has already joined the team.': t.agencyErrAlreadyJoined,
  'This person has team-wide access as an owner or manager. Change their team role to remove that access.': t.agencyErrTeamWideAccess,
  'This person is already a team member.': t.agencyErrAlreadyMember,
  'This team member must accept an invitation before being assigned work.': t.agencyErrMustAccept,
  'This tenancy’s team changed. Refresh and try again.': t.agencyErrTeamChanged,
  'Use Remove member to remove an active team member.': t.agencyErrUseRemove,
  'Wait for the invitation to be accepted before changing this role.': t.agencyErrWaitAccept,
};

class ApiFailure implements Exception {
  const ApiFailure(this.message, this.statusCode);

  static ApiFailure get noConnection => ApiFailure(t.errorNoConnection, null);

  factory ApiFailure.fromDio(DioException error) {
    final status = error.response?.statusCode;
    final code = error.response?.data is Map
        ? (error.response!.data as Map)['error']
        : null;
    final message = switch (code) {
      'unauthorized' => t.errorSignedOut,
      'not_found' => t.errorNotFound,
      'report_frozen' =>
        t.errorReportFrozen,
      'invalid_request' => t.errorInvalidRequest,
      'review_incomplete' =>
        t.errorReviewIncomplete,
      'assessment_review_incomplete' =>
        t.errorAssessmentReviewIncomplete,
      'no_damage_unconfirmed' =>
        t.errorNoDamageUnconfirmed,
      'invalid_state' => t.errorInvalidState,
      'capture_conflict' =>
        t.errorCaptureConflict,
      'capture_missing' =>
        t.errorCaptureMissing,
      'evidence_missing' =>
        t.errorEvidenceMissing,
      // Says what happened and nothing about buying: store rules forbid pointing an
      // app user at a purchase made outside the store.
      'plan_limit' =>
        t.errorPlanLimit,
      'maintenance_conflict' =>
        t.errorMaintenanceConflict,
      'move_in_defect_stale_target' =>
        t.errorMoveInDefectStale,
      'agency_conflict' => switch ((error.response!.data as Map)['message']) {
        final String message => _agencyMessages[message] ?? message,
        _ => t.errorAgencyConflict,
      },
      'property_history' =>
        t.errorPropertyHistory,
      'property_restore_expired' =>
        t.errorPropertyRestoreExpired,
      'property_trashed' =>
        t.errorPropertyTrashed,
      'finding_save_conflict' =>
        t.errorFindingSaveConflict,
      _ =>
        status == null
            ? noConnection.message
            : t.errorServer(status),
    };
    return ApiFailure(message, status);
  }

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

/// The sentence to show when [error] stops something a person asked for. A failure
/// from the server, or one this app raised for a person to read, already carries one.
/// Anything else is a programmer's message, such as a file the phone could not read or
/// a plugin that failed, which means nothing to an agent: it is reported to us and a
/// plain sentence is shown instead.
String plainError(Object error) {
  if (error is ApiFailure) return error.message;
  if (error is DioException) return ApiFailure.fromDio(error).message;
  debugPrint('$error');
  // Where it was thrown when the error carries that, otherwise where it was shown.
  ErrorReporter.report(
    error,
    (error is Error ? error.stackTrace : null) ?? StackTrace.current,
    'caught',
  );
  return t.errorUnexpected;
}
