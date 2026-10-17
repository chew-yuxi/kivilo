import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/renewal.dart';
import 'package:kivilo/services/api.dart';

class RenewalAdapter implements HttpClientAdapter {
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<dynamic>? requestStream,
    Future<dynamic>? cancelFuture,
  ) async {
    requests.add(options);
    return ResponseBody.fromString(
      options.method == 'POST' ? '{"id":"next-check-in"}' : '{"ok":true}',
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  test(
    'reads the reminder without adding required fields to old inspection models',
    () {
      final reminder = RenewalReminder.fromJson({
        'id': 'term',
        'property': 'Unit 12',
        'tenant': 'Tenant',
        'endDate': '2027-01-17',
      });
      expect(reminder.endDate, '2027-01-17');
    },
  );

  test('sends the choice and next-term dates through the shared API', () async {
    final adapter = RenewalAdapter();
    final dio = Dio()..httpClientAdapter = adapter;
    final api = Api(dio: dio, attachAuth: false);
    await api.respondToRenewal('term', 'LATER');
    final id = await api.createRenewal('term', {
      'startDate': '2027-01-18',
      'endDate': '2029-01-17',
      'monthlyRent': '3000',
      'deposit': '6000',
    });
    expect(id, 'next-check-in');
    expect(adapter.requests.first.method, 'PATCH');
    expect(adapter.requests.first.data, {'choice': 'LATER'});
    expect(adapter.requests.last.path, '/api/v1/renewals/term');
    expect(adapter.requests.last.data['startDate'], '2027-01-18');
    expect(adapter.requests.last.data.containsKey('propertyId'), false);
    dio.close();
  });
}
