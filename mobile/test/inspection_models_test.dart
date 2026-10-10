import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';

void main() {
  test('detail carries native lifecycle, consent and publication state', () {
    final detail = InspectionDetail.fromJson({
      'id': 'inspection-1',
      'kind': 'CHECK_OUT',
      'status': 'AWAITING_SIGNATURE',
      'property': '2 Marina Boulevard',
      'landlord': 'Landlord',
      'landlordId': 'landlord-1',
      'tenant': 'Tenant',
      'tenantId': 'tenant-1',
      'summary': 'Kitchen chip noted',
      'baselineId': 'check-in-1',
      'checkOutId': null,
      'shareToken': null,
      'shareUrl': null,
      'aiConsentAt': '2026-10-10T08:00:00Z',
      'latestAssessment': {'version': 2, 'publishedAt': '2026-10-10T09:00:00Z'},
      'assessmentDraftChanged': true,
      'signatures': [
        {'stakeholderId': 'landlord-1', 'signedAt': '2026-10-10T08:30:00Z'},
      ],
      'findings': [
        {
          'id': 'finding-1',
          'changeType': 'DAMAGE',
          'verdict': 'UNDECIDED',
          'rationale': 'Chip at counter edge',
          'estimatedCost': null,
          'itemLabel': 'Kitchen · Counter',
          'baselineLabel': 'Kitchen · Counter',
          'editedByHuman': false,
        },
      ],
      'rooms': [
        {
          'id': 'room-1',
          'name': 'Kitchen',
          'status': 'REVIEWED',
          'items': 1,
          'photos': 2,
          'videos': 1,
          'newSinceDraft': 0,
          'processingError': null,
        },
      ],
    });

    expect(detail.isOpen, isFalse);
    expect(detail.allRoomsReviewed, isTrue);
    expect(detail.signedBy('landlord-1'), isTrue);
    expect(detail.signedBy('tenant-1'), isFalse);
    expect(detail.latestAssessment!.version, 2);
    expect(detail.assessmentDraftChanged, isTrue);
    expect(detail.findings.single.verdict, 'UNDECIDED');
  });

  test('room review includes model ownership and original photo marks', () {
    final room = RoomDetail.fromJson({
      'room': {
        'id': 'room-1',
        'name': 'Kitchen',
        'status': 'REVIEW',
        'processingError': null,
      },
      'position': {'index': 1, 'total': 1},
      'next': null,
      'items': [
        {
          'id': 'item-1',
          'name': 'Counter',
          'category': 'FIXTURE',
          'condition': 'FAIR',
          'quantity': 1,
          'notes': null,
          'identifier': null,
          'meterReading': null,
          'confidence': 0.8,
          'editedByHuman': false,
        },
      ],
      'captures': [
        {
          'id': 'capture-1',
          'kind': 'PHOTO',
          'url': 'https://example.test/signed',
          'note': 'Counter edge',
          'annotations': {'v': 1, 'marks': []},
        },
      ],
    });

    expect(room.items.single.confidence, 0.8);
    expect(room.items.single.editedByHuman, isFalse);
    expect(room.captures.single.annotations!['v'], 1);
  });
}
