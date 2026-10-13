import 'package:flutter/material.dart';

import '../models/report.dart';
import '../services/api.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_theme.dart';
import 'photo_mark_screen.dart';

/// The signed report, read-only: what the landlord and tenant agreed, laid out for a
/// phone. It shows exactly what the shared link shows, because the server loads both
/// from one definition.
class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key, required this.id, this.api});
  final String id;
  final Api? api;

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  late final _api = widget.api ?? Api();
  late Future<SignedReport> _future = _api.report(widget.id);

  Future<void> _refresh() async {
    final next = _api.report(widget.id);
    setState(() => _future = next);
    await next;
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<SignedReport>(
    future: _future,
    builder: (context, snapshot) {
      final report = snapshot.data;
      return Scaffold(
        appBar: AppBar(
          title: Text(
            report == null
                ? 'Report'
                : report.isCheckOut
                ? 'Check-out report'
                : 'Check-in report',
          ),
        ),
        body: snapshot.hasError
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('${snapshot.error}', textAlign: TextAlign.center),
                ),
              )
            : report == null
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(onRefresh: _refresh, child: _body(report)),
      );
    },
  );

  Widget _body(SignedReport report) {
    final text = Theme.of(context).textTheme;
    final agreedAt = report.agreedAt;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
      children: [
        Text(report.property, style: text.headlineSmall),
        const SizedBox(height: 10),
        Align(
          alignment: Alignment.centerLeft,
          child: report.status == 'COMPLETED' && agreedAt != null
              ? Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: KiviloColors.greenSoft,
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    'Signed by both parties · ${shortDate(agreedAt)}',
                    style: const TextStyle(
                      color: KiviloColors.green,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                )
              : KiviloStatusPill(status: report.status),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Wrap(
              runSpacing: 14,
              children: [
                _fact('Landlord', report.landlord),
                _fact('Tenant', report.tenant),
                if (report.agent != null) _fact('Agent', report.agent!),
                _fact(
                  'Tenancy',
                  '${shortDate(report.startDate)} to ${shortDate(report.endDate)}',
                ),
                _fact(
                  'Inspected',
                  [
                    if (report.conductedAt != null)
                      shortDate(report.conductedAt!)
                    else
                      'Not recorded',
                    if (report.conductedBy != null) 'by ${report.conductedBy}',
                  ].join(' '),
                ),
              ],
            ),
          ),
        ),
        for (final room in report.rooms) ...[
          const SizedBox(height: 28),
          KiviloSectionHeading(
            title: room.name,
            subtitle: _count(room.items.length, 'item'),
          ),
          const SizedBox(height: 10),
          _items(room),
          if (room.photos.isNotEmpty) ...[
            const SizedBox(height: 10),
            _photos(room),
          ],
        ],
        const SizedBox(height: 28),
        const KiviloSectionHeading(title: 'Agreed and signed'),
        const SizedBox(height: 10),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (
                  var index = 0;
                  index < report.signatures.length;
                  index++
                ) ...[
                  if (index > 0) const Divider(height: 28),
                  _signature(report.signatures[index]),
                ],
                if (report.signatures.isEmpty)
                  Text('Not yet countersigned.', style: text.bodyMedium),
              ],
            ),
          ),
        ),
        if (report.isCheckOut && report.assessment != null) ...[
          const SizedBox(height: 28),
          _assessment(report, report.assessment!),
        ],
        const SizedBox(height: 28),
        Text(
          'Rooms and items in this report were written by the inspector against a '
          'recorded walkthrough and agreed by the people named above. Where a '
          'photograph carries marks, the inspector drew them to point out a detail; '
          'they are recorded separately and nothing has been painted onto the '
          'photograph itself.',
          style: text.bodySmall?.copyWith(color: KiviloColors.muted),
        ),
      ],
    );
  }

  Widget _fact(String label, String value) => SizedBox(
    width: 150,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            color: KiviloColors.muted,
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 3),
        Text(value, style: Theme.of(context).textTheme.bodyMedium),
      ],
    ),
  );

  Widget _items(ReportRoom room) {
    final text = Theme.of(context).textTheme;
    if (room.items.isEmpty) {
      return Text('No items recorded.', style: text.bodyMedium);
    }
    return Card(
      child: Column(
        children: [
          for (var index = 0; index < room.items.length; index++) ...[
            if (index > 0) const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          room.items[index].quantity > 1
                              ? '${room.items[index].name} ×${room.items[index].quantity}'
                              : room.items[index].name,
                          style: text.titleSmall,
                        ),
                        if (room.items[index].identifier != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            room.items[index].identifier!,
                            style: text.bodySmall?.copyWith(
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                        if (room.items[index].meterReading != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Reading: ${room.items[index].meterReading}',
                            style: text.bodySmall?.copyWith(
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                        if (room.items[index].notes != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            room.items[index].notes!,
                            style: text.bodyMedium,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    _titleCase(room.items[index].condition),
                    style: text.labelMedium?.copyWith(
                      color: KiviloColors.muted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// A marked photo gets the full width, as on the shared report: a ring around a
  /// chip is useless at a third of a phone screen.
  Widget _photos(ReportRoom room) {
    final marked = room.photos.where((photo) => photo.marks.isNotEmpty);
    final plain = room.photos.where((photo) => photo.marks.isEmpty).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final photo in marked) ...[
          GestureDetector(
            onTap: () => _view(photo),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: _MarkedPhoto(photo: photo),
            ),
          ),
          _caption(photo),
          const SizedBox(height: 10),
        ],
        if (plain.isNotEmpty)
          GridView.count(
            crossAxisCount: 3,
            mainAxisSpacing: 6,
            crossAxisSpacing: 6,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              for (final photo in plain)
                GestureDetector(
                  onTap: () => _view(photo),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      photo.url,
                      fit: BoxFit.cover,
                      semanticLabel: photo.note ?? '${room.name} photo',
                      errorBuilder: (_, _, _) =>
                          const ColoredBox(color: KiviloColors.canvas),
                    ),
                  ),
                ),
            ],
          ),
      ],
    );
  }

  Widget _caption(ReportPhoto photo) {
    final lines = [
      [?photo.note, '${_count(photo.marks.length, 'area')} marked'].join(' · '),
      for (var index = 0; index < photo.marks.length; index++)
        if (photo.marks[index]['note'] is String)
          '${index + 1}. ${photo.marks[index]['note']}',
    ];
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Text(
        lines.join('\n'),
        style: Theme.of(context).textTheme.bodySmall,
      ),
    );
  }

  Future<void> _view(ReportPhoto photo) => Navigator.of(context).push<void>(
    MaterialPageRoute(
      builder: (_) => Scaffold(
        appBar: AppBar(title: Text(photo.note ?? 'Photo')),
        backgroundColor: Colors.black,
        body: Center(
          child: InteractiveViewer(
            minScale: 0.8,
            maxScale: 5,
            child: photo.marks.isEmpty
                ? Image.network(photo.url, fit: BoxFit.contain)
                : _MarkedPhoto(photo: photo),
          ),
        ),
      ),
    ),
  );

  Widget _signature(ReportSignature signature) {
    final bytes = UriData.parse(signature.imageData).contentAsBytes();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (bytes.isNotEmpty)
          SizedBox(
            height: 56,
            child: Image.memory(
              bytes,
              alignment: Alignment.centerLeft,
              semanticLabel: 'Signature of ${signature.name}',
            ),
          ),
        const SizedBox(height: 6),
        Text(signature.name, style: Theme.of(context).textTheme.titleSmall),
        Text(
          'Signed ${shortDate(signature.signedAt)}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  Widget _assessment(SignedReport report, ReportAssessment assessment) {
    final text = Theme.of(context).textTheme;
    final liable = assessment.findings.where(
      (finding) => finding.verdict == 'TENANT_LIABLE',
    );
    final claim = liable.fold<double>(
      0,
      (sum, finding) => sum + double.parse(finding.estimatedCost ?? '0'),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        KiviloSectionHeading(
          title: 'Check-out assessment',
          subtitle:
              'Version ${assessment.version}, published '
              '${shortDate(assessment.publishedAt)}. Separate from the signed '
              'inventory above.',
        ),
        const SizedBox(height: 10),
        if (assessment.summary != null) ...[
          Text(assessment.summary!, style: text.bodyMedium),
          const SizedBox(height: 10),
        ],
        Text(
          '${liable.length} of ${assessment.findings.length} findings assess '
          'tenant liability, totalling S\$${claim.toStringAsFixed(2)} against a '
          'deposit of S\$${report.deposit}.',
          style: text.bodyMedium,
        ),
        const SizedBox(height: 10),
        for (final finding in assessment.findings)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(finding.itemLabel, style: text.titleSmall),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        [
                          _verdict(finding.verdict),
                          if (finding.estimatedCost != null)
                            'S\$${finding.estimatedCost}',
                        ].join(', '),
                        style: text.labelMedium?.copyWith(
                          color: KiviloColors.muted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(finding.rationale, style: text.bodyMedium),
                  if (finding.maintenanceTitle != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      'Maintenance record: ${finding.maintenanceTitle}',
                      style: text.labelMedium,
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final url in finding.evidenceImageUrls)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              url,
                              width: 96,
                              height: 96,
                              fit: BoxFit.cover,
                            ),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// The picture at its own aspect ratio with the marks painted over exactly its box, so
/// a ring sits where the inspector drew it at any size.
class _MarkedPhoto extends StatelessWidget {
  const _MarkedPhoto({required this.photo});
  final ReportPhoto photo;

  @override
  Widget build(BuildContext context) {
    final width = (photo.annotations!['width'] as num).toDouble();
    final height = (photo.annotations!['height'] as num).toDouble();
    return AspectRatio(
      aspectRatio: width / height,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.network(
            photo.url,
            fit: BoxFit.fill,
            errorBuilder: (_, _, _) =>
                const ColoredBox(color: KiviloColors.canvas),
          ),
          CustomPaint(painter: MarkPainter(photo.marks)),
        ],
      ),
    );
  }
}

String _count(int n, String noun) => '$n $noun${n == 1 ? '' : 's'}';

String _titleCase(String value) =>
    value[0] + value.substring(1).toLowerCase().replaceAll('_', ' ');

String _verdict(String verdict) => switch (verdict) {
  'TENANT_LIABLE' => 'Tenant liable',
  'FAIR_WEAR' => 'Fair wear and tear',
  'DISPUTED' => 'Disputed',
  _ => 'Undecided',
};
