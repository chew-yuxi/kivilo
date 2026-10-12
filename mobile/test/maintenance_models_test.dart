import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/maintenance.dart';

void main() {
  test('case detail retains signed before and after evidence links', () {
    final detail = MaintenanceCaseDetail.fromJson({
      'id': 'case-1',
      'title': 'Leaking tap',
      'description': 'Tap leaks after use',
      'status': 'AWAITING_VERIFICATION',
      'priority': 'ROUTINE',
      'category': 'PLUMBING',
      'property': '1 Example Street',
      'reportedBy': {'id': 'tenant-1', 'name': 'Taylor Tenant'},
      'createdAt': '2026-10-10T08:00:00Z',
      'resolutionReason': null,
      'role': 'TENANT',
      'canManage': false,
      'canLogVisit': false,
      'canVerify': true,
      'responsibility': {
        'arrangedBy': 'LANDLORD',
        'minorRepairCap': null,
        'agreement': null,
        'pending': null,
        'history': <Map<String, dynamic>>[],
        'shares': null,
        'canPropose': true,
        'canAnswer': false,
        'canWithdraw': false,
      },
      'visits': [
        {
          'id': 'visit-1',
          'scheduledAt': null,
          'completedAt': '2026-10-10T10:00:00Z',
          'notes': 'Tap repaired',
          'verification': null,
        },
      ],
      'events': <Map<String, dynamic>>[],
      'evidence': [
        {
          'id': 'evidence-1',
          'visitId': null,
          'purpose': 'BEFORE',
          'mimeType': 'image/jpeg',
          'url': 'https://example.test/before?token=1',
          'note': 'Drip beneath sink',
          'createdAt': '2026-10-10T09:00:00Z',
        },
        {
          'id': 'evidence-2',
          'visitId': 'visit-1',
          'purpose': 'AFTER',
          'mimeType': 'image/jpeg',
          'url': 'https://example.test/after?token=2',
          'note': null,
          'createdAt': '2026-10-10T10:30:00Z',
        },
      ],
    });

    expect(detail.evidence.map((item) => item.purpose), ['BEFORE', 'AFTER']);
    expect(detail.evidence.last.visitId, 'visit-1');
    expect(detail.evidence.last.isImage, isTrue);
    expect(detail.evidence.first.url, contains('token=1'));
  });
}
