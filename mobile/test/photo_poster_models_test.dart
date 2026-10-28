import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/addenda.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/report.dart';

/// Each photo's 640px copy is optional: the server makes it a minute or so after upload,
/// and an older server never sends it, so every tile falls back to the original.
void main() {
  const original = 'https://example.test/original';
  const poster = 'https://example.test/poster';

  test('finding, comparison, repair and update photos carry their poster', () {
    expect(
      AddendumPhoto.fromJson({
        'id': 'a',
        'url': original,
        'posterUrl': poster,
        'mimeType': 'image/jpeg',
      }).posterUrl,
      poster,
    );
    expect(
      ComparablePhoto.listFromJson([
        {'id': 'c', 'url': original, 'posterUrl': poster},
      ]).single.posterUrl,
      poster,
    );
    expect(
      MaintenanceEvidenceModel.fromJson({
        'id': 'm',
        'purpose': 'BEFORE',
        'mimeType': 'image/jpeg',
        'url': original,
        'posterUrl': poster,
        'createdAt': '2026-10-28T00:00:00.000Z',
      }).posterUrl,
      poster,
    );
    expect(
      DraftEntry.fromJson({
        'id': 'e',
        'change': 'ADD',
        'roomName': 'Kitchen',
        'quantity': 1,
        'photos': [
          {'id': 'p', 'url': original, 'posterUrl': poster},
        ],
      }).photos.single.posterUrl,
      poster,
    );
  });

  test('a photo from an older server has no poster', () {
    expect(
      AddendumPhoto.fromJson({
        'id': 'a',
        'url': original,
        'mimeType': 'image/jpeg',
      }).posterUrl,
      isNull,
    );
    expect(
      ComparablePhoto.listFromJson([
        {'id': 'c', 'url': original},
      ]).single.posterUrl,
      isNull,
    );
  });

  test(
    'repair evidence tiles in a report draw the poster where there is one',
    () {
      final finding = ReportFinding.fromJson({
        'id': 'f',
        'itemLabel': 'Kitchen · Hob',
        'verdict': 'TENANT_LIABLE',
        'rationale': 'Cracked',
        'evidence': [
          {'mimeType': 'image/jpeg', 'url': original, 'posterUrl': poster},
          {'mimeType': 'image/jpeg', 'url': '$original-2'},
          {'mimeType': 'application/pdf', 'url': '$original.pdf'},
        ],
      });
      expect(finding.evidenceImages.map((image) => image.url), [poster, '$original-2']);
    },
  );
}
