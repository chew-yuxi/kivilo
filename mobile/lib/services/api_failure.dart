import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'error_reporter.dart';

class ApiFailure implements Exception {
  const ApiFailure(this.message, this.statusCode);

  static const noConnection = ApiFailure(
    'No connection. Anything you took is saved on this phone, so try again when you have signal.',
    null,
  );

  factory ApiFailure.fromDio(DioException error) {
    final status = error.response?.statusCode;
    final code = error.response?.data is Map
        ? (error.response!.data as Map)['error']
        : null;
    final message = switch (code) {
      'unauthorized' => 'You have been signed out. Please sign in again.',
      'not_found' => 'This could not be found, or your account cannot open it.',
      'report_frozen' =>
        'This report has been sent for signature and cannot be changed.',
      'invalid_request' => 'Please check the details and try again.',
      'review_incomplete' =>
        'Each room needs at least one item and a review first.',
      'assessment_review_incomplete' =>
        'Open and confirm every finding before publishing the assessment.',
      'no_damage_unconfirmed' =>
        'Add a finding, or confirm that no damage was found, before publishing.',
      'invalid_state' => 'This cannot be done at this stage of the report.',
      'capture_conflict' =>
        'This photo or video clashes with one already in the report. Refresh the room and check it.',
      'capture_missing' =>
        'The upload did not finish. The file is still on this phone, so try again.',
      'evidence_missing' =>
        'The upload did not finish. The photo is still on this phone, so try again.',
      // Says what happened and nothing about buying: store rules forbid pointing an
      // app user at a purchase made outside the store.
      'plan_limit' =>
        'Your plan\'s active properties are all in use. A property stops counting when its check-out is signed or its tenancy ends.',
      'maintenance_conflict' =>
        'Someone already updated this repair. Refresh and check the timeline.',
      'move_in_defect_stale_target' =>
        'This item has since been replaced or removed. The notice cannot be agreed, but you can still dispute it.',
      _ =>
        status == null
            ? noConnection.message
            : 'Kivilo could not do that just now. Please try again. (Error $status)',
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
  return 'Something went wrong. Please try again.';
}
