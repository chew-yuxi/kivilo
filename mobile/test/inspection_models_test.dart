import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';

void main() {
  test('detail carries native lifecycle, comparison and publication state', () {
    final detail = InspectionDetail.fromJson({
      'id': 'inspection-1',
      'tenancyRecordId': 'tenancy-1',
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
      'latestAssessment': {'version': 2, 'publishedAt': '2026-10-10T09:00:00Z'},
      'assessmentDraftChanged': true,
      'checkOutItems': [
        {'id': 'item-out', 'label': 'Kitchen · Counter'},
      ],
      'checkInItems': [
        {'id': 'item-in', 'label': 'Kitchen · Counter'},
      ],
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
    expect(detail.checkOutItems.single.id, 'item-out');
    expect(detail.checkInItems.single.label, 'Kitchen · Counter');
  });

  test('room review carries its items and original photo marks', () {
    final room = RoomDetail.fromJson({
      'room': {
        'id': 'room-1',
        'name': 'Kitchen',
        'status': 'REVIEW',
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

    expect(room.items.single.condition, 'FAIR');
    expect(room.items.single.baselineKey, isNull);
    expect(room.captures.single.posterUrl, isNull);
    expect(room.captures.single.annotations!['v'], 1);
    // A check-in room, or a server older than the field.
    expect(room.checkIn, isNull);
  });

  test('a check-out room carries the room as it was at check-in', () {
    final room = RoomDetail.fromJson({
      'room': {'id': 'room-out', 'name': 'Kitchen', 'status': 'REVIEW'},
      'position': {'index': 1, 'total': 1},
      'next': null,
      'items': [
        {
          'id': 'item-out',
          'name': 'Hob',
          'category': 'APPLIANCE',
          'condition': 'DAMAGED',
          'quantity': 1,
          'notes': 'Cracked glass',
          'identifier': null,
          'meterReading': null,
          'baselineKey': 'item:item-in',
        },
        {
          'id': 'item-new',
          'name': 'Toaster',
          'category': 'APPLIANCE',
          'condition': 'GOOD',
          'quantity': 1,
          'notes': null,
          'identifier': null,
          'meterReading': null,
          'baselineKey': null,
        },
      ],
      'captures': [],
      'checkIn': {
        'baselineId': 'check-in-1',
        'conductedAt': '2024-01-02T03:00:00.000Z',
        'lines': [
          {
            'key': 'item:item-in',
            'name': 'Hob',
            'condition': 'GOOD',
            'quantity': 2,
            'notes': 'Light scratches',
            'identifier': 'HOB-42',
            'meterReading': null,
          },
        ],
        'photos': [
          {
            'id': 'capture-in',
            'url': 'https://example.test/check-in',
            'caption': 'Fridge rating plate',
            'update': false,
            'annotations': null,
          },
        ],
      },
    });

    final checkIn = room.checkIn!;
    expect(checkIn.baselineId, 'check-in-1');
    expect(checkIn.photos.single.url, 'https://example.test/check-in');
    expect(checkIn.lines.single.key, room.items.first.baselineKey);
    expect(checkIn.lines.single.identifier, 'HOB-42');
    expect(room.items.last.baselineKey, isNull);
  });

  test('a video capture carries its server-made poster when there is one', () {
    final video = EvidenceCapture.fromJson({
      'id': 'capture-2',
      'kind': 'VIDEO',
      'url': 'https://example.test/video',
      'posterUrl': 'https://example.test/poster',
    });
    expect(video.posterUrl, 'https://example.test/poster');
  });
}
