import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/models/report.dart';

const _marks = {
  'v': 1,
  'w': 1200,
  'h': 1600,
  'by': 'agent-1',
  'at': '2026-10-21T08:00:00.000Z',
  'marks': [
    {
      'shape': 'ring',
      'cx': 0.45,
      'cy': 0.6,
      'rx': 0.1,
      'ry': 0.08,
      'note': 'Fresh chip',
    },
  ],
};

Map<String, dynamic> _photo() => {
  'id': 'photo-1',
  'url': 'https://storage.test/finding-photo?token=private',
  'mimeType': 'image/jpeg',
  'note': 'Worktop edge at check-out',
  'annotations': _marks,
};

Map<String, dynamic> _finding() => {
  'id': 'finding-1',
  'itemId': 'item-1',
  'baselineItemId': null,
  'itemLabel': 'Kitchen · Worktop',
  'baselineLabel': null,
  'changeType': 'DAMAGE',
  'verdict': 'UNDECIDED',
  'rationale': 'A fresh chip on the edge.',
  'estimatedCost': null,
  'editedByHuman': true,
};

void main() {
  test('an old cached finding has no new photo evidence', () {
    final finding = Finding.fromJson(_finding());
    expect(finding.photos, isEmpty);
    expect(finding.itemId, 'item-1');
    expect(finding.rationale, 'A fresh chip on the edge.');
  });

  test('working finding photos retain their original marks and signed URL', () {
    final finding = Finding.fromJson({
      ..._finding(),
      'photos': [_photo()],
    });
    final photo = finding.photos.single;
    expect(photo.id, 'photo-1');
    expect(photo.url, _photo()['url']);
    expect(photo.note, 'Worktop edge at check-out');
    expect(photo.annotations, _marks);
    expect(finding.baselineItemId, isNull);
  });

  test(
    'an old published finding keeps maintenance evidence without photos',
    () {
      final finding = ReportFinding.fromJson({
        ..._finding(),
        'maintenanceTitle': 'Earlier repair',
        'evidence': [
          {'mimeType': 'image/jpeg', 'url': 'https://storage.test/repair.jpg'},
          {
            'mimeType': 'application/pdf',
            'url': 'https://storage.test/receipt.pdf',
          },
        ],
      });
      expect(finding.photos, isEmpty);
      expect(finding.evidenceImageUrls, ['https://storage.test/repair.jpg']);
    },
  );

  test(
    'a published finding keeps marked photos separate from repair evidence',
    () {
      final finding = ReportFinding.fromJson({
        ..._finding(),
        'photos': [_photo()],
        'evidence': [
          {'mimeType': 'image/jpeg', 'url': 'https://storage.test/repair.jpg'},
        ],
      });
      expect(finding.photos.single.annotations, _marks);
      expect(finding.photos.single.note, 'Worktop edge at check-out');
      expect(finding.evidenceImageUrls, ['https://storage.test/repair.jpg']);
    },
  );
}
