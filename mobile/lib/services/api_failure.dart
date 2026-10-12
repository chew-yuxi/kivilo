import 'package:dio/dio.dart';

class ApiFailure implements Exception {
  const ApiFailure(this.message, this.statusCode);

  factory ApiFailure.fromDio(DioException error) {
    final status = error.response?.statusCode;
    final code = error.response?.data is Map
        ? (error.response!.data as Map)['error']
        : null;
    final message = switch (code) {
      'unauthorized' => 'Your session has expired. Please sign in again.',
      'not_found' => 'This record was not found or you cannot access it.',
      'report_frozen' =>
        'This report has been sent for signature and cannot be changed.',
      'invalid_request' => 'Please check the details and try again.',
      'review_incomplete' =>
        'Each room needs at least one item and a review first.',
      'assessment_review_incomplete' =>
        'Open and confirm every finding before publishing the assessment.',
      'invalid_state' =>
        'This action is not available at the current report stage.',
      'capture_conflict' => 'This capture was already registered differently.',
      'capture_missing' =>
        'Upload has not reached storage. The saved file remains on this phone; retry upload.',
      'evidence_missing' =>
        'Evidence has not reached storage. The saved file remains on this phone; retry upload.',
      'maintenance_conflict' =>
        'This maintenance update was already recorded differently. Refresh and check the timeline.',
      _ =>
        status == null
            ? 'Check your connection and retry. Saved captures remain on this device.'
            : 'The server could not complete this request ($status).',
    };
    return ApiFailure(message, status);
  }

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}
