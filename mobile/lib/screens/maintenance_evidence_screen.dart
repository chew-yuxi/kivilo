import 'package:flutter/material.dart';

import '../services/api.dart';
import 'evidence_photo_screen.dart';

/// Maintenance keeps its own purpose and visit identity while using the shared
/// save-original, mark and caption workflow.
class MaintenanceEvidenceScreen extends StatelessWidget {
  const MaintenanceEvidenceScreen({
    super.key,
    required this.caseId,
    required this.purpose,
    this.visitId,
    this.api,
  });

  final String caseId;
  final String purpose;
  final String? visitId;
  final Api? api;

  @override
  Widget build(BuildContext context) {
    final client = api ?? Api();
    return EvidencePhotoScreen(
      title: purpose == 'BEFORE' ? 'Before photos' : 'After photos',
      queueOwner: 'maintenance:$caseId',
      targetId: '$purpose${visitId == null ? '' : '|$visitId'}',
      kind: purpose,
      loadPhotos: () async {
        final detail = await client.maintenanceCase(caseId);
        return [
          for (final photo in detail.evidence)
            if (photo.isImage && photo.purpose == purpose && photo.visitId == visitId)
              EvidencePhoto(
                id: photo.id,
                url: photo.url,
                note: photo.note,
                annotations: photo.annotations,
              ),
        ];
      },
    );
  }
}
