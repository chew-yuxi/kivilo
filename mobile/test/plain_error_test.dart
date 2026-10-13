import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/api_failure.dart';

void main() {
  test('a failure written for people is shown as it is', () {
    expect(
      plainError(const ApiFailure('You have been signed out.', 401)),
      'You have been signed out.',
    );
  });

  test('a server refusal is put into words', () {
    final request = RequestOptions(path: '/api/v1/x');
    final refusal = DioException(
      requestOptions: request,
      response: Response(
        requestOptions: request,
        statusCode: 409,
        data: {'error': 'report_frozen'},
      ),
    );
    expect(
      plainError(refusal),
      'This report has been sent for signature and cannot be changed.',
    );
  });

  /// "Bad state: ..." or a file path means nothing to an agent.
  test('a programmer error never reaches the screen', () {
    expect(
      plainError(StateError('Capture lease changed before registration')),
      'Something went wrong. Please try again.',
    );
  });
}
