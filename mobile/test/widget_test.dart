import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/config.dart';
import 'package:kivilo/models/inspection.dart';

void main() {
  test('a build without configuration is detected rather than failing at first request', () {
    // The test binary carries no --dart-define, so this is the real unconfigured case.
    expect(Config.isComplete, isFalse);
  });

  group('RoomSummary', () {
    RoomSummary room({int photos = 0, int videos = 0, int items = 0, String status = 'PENDING'}) =>
        RoomSummary.fromJson({
          'id': 'r1',
          'name': 'Kitchen',
          'status': status,
          'items': items,
          'photos': photos,
          'videos': videos,
          'newSinceDraft': 0,
        });

    test('says nothing captured when there is nothing', () {
      expect(room().countsLabel, 'Nothing captured yet');
    });

    test('counts what is there, and pluralises like the web app does', () {
      expect(room(videos: 1, photos: 3).countsLabel, '1 video, 3 photos');
      expect(room(videos: 2, photos: 1, items: 4).countsLabel, '2 videos, 1 photo · 4 items');
    });

    /// The two clients must not grow two vocabularies for one workflow.
    test('uses the same status wording as the web room list', () {
      expect(room(status: 'PROCESSING').statusLabel, 'Drafting');
      expect(room(status: 'REVIEW').statusLabel, 'Needs review');
      expect(room(status: 'REVIEWED').statusLabel, 'Reviewed');
    });
  });

  test('an inspection summary parses the shape the API returns', () {
    final summary = InspectionSummary.fromJson({
      'id': 'i1',
      'kind': 'CHECK_IN',
      'status': 'REVIEW',
      'property': '#28-05, 2 Marina Boulevard, Singapore 018987',
      'tenant': 'Priya Raman',
      'rooms': 3,
      'conductedAt': null,
    });
    expect(summary.kindLabel, 'Check-in');
    expect(summary.rooms, 3);
  });
}
