import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../l10n/l10n.dart';
import '../models/inspection.dart' show itemConditionLabels;
import '../models/report.dart';
import '../services/api.dart';
import '../services/product_events.dart';
import '../services/saved_signature.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_theme.dart';
import '../ui/marked_network_photo.dart';
import '../ui/page_context_title.dart';
import '../ui/tenant_handover.dart';
import 'photo_mark_screen.dart';
import 'signature_screen.dart';

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
    setState(() {
      _future = next;
    });
    await next;
  }

  String? _acknowledging;

  /// "I acknowledge this update", as whoever is signed in. The server decides which
  /// party that is; a failure leaves the button for another try.
  Future<void> _acknowledge(ReportAddendum addendum) async {
    setState(() => _acknowledging = addendum.id);
    try {
      await _api.acknowledgeAddendum(addendum.id);
      if (mounted) await _refresh();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    } finally {
      if (mounted) setState(() => _acknowledging = null);
    }
  }

  Future<void> _dispute(ReportAddendum addendum) async {
    var reason = '';
    final result = await showKiviloDrawer<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDrawerState) => KiviloDrawer(
          title: Text(t.disputeMoveIn),
          content: TextField(
            autofocus: true,
            minLines: 3,
            maxLines: 6,
            maxLength: 2000,
            decoration: InputDecoration(
              labelText: t.disputeMoveInLabel,
              helperText: t.disputeMoveInHelper,
            ),
            onChanged: (value) => setDrawerState(() => reason = value),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(t.cancel),
            ),
            FilledButton(
              onPressed: reason.trim().isEmpty
                  ? null
                  : () => Navigator.pop(context, reason.trim()),
              child: Text(t.recordDispute),
            ),
          ],
        ),
      ),
    );
    if (result == null) return;
    setState(() => _acknowledging = addendum.id);
    try {
      await _api.disputeAddendum(addendum.id, result);
      if (mounted) await _refresh();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    } finally {
      if (mounted) setState(() => _acknowledging = null);
    }
  }

  /// The landlord or tenant is with the agent, or has no email: they read the update on
  /// this phone and tap to acknowledge it here, as they would sign here. The server
  /// checks the party belongs to the tenancy and records it as given in person.
  Future<void> _acknowledgeInPerson(
    ReportAddendum addendum,
    AddendumAcknowledgement party,
  ) async {
    final confirmed = await showKiviloDrawer<bool>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: Text(t.handPhoneTo(party.name)),
        content: Text(
          t.acknowledgeInPersonBody(party.name, t.partyRole(party.role).toLowerCase(), addendum.number, addendum.title),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(t.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(t.acknowledgeUpdate),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _acknowledging = addendum.id);
    try {
      await _api.acknowledgeAddendumInPerson(addendum.id, party.stakeholderId!);
      if (mounted) await _refresh();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    } finally {
      if (mounted) setState(() => _acknowledging = null);
    }
  }

  bool _answering = false;

  /// Agrees or disputes the deposit statement: as whoever is signed in, or, with
  /// `party`, for a landlord or tenant handed this phone. A dispute asks for the reason
  /// first. The version shown goes with the answer, so a revision published meanwhile
  /// is refused rather than answered unread.
  Future<void> _answerStatement(
    SignedReport report,
    ReportAssessment assessment, {
    required bool agreed,
    StatementParty? party,
  }) async {
    String? reason;
    if (!agreed) {
      var draft = '';
      reason = await showKiviloDrawer<String>(
        context: context,
        builder: (context) => StatefulBuilder(
          builder: (context, setDrawerState) => KiviloDrawer(
            title: Text(
              party == null
                  ? t.disputeDeductions
                  : t.partyDisputesDeductions(party.name),
            ),
            content: TextField(
              autofocus: true,
              minLines: 3,
              maxLines: 6,
              maxLength: 2000,
              decoration: InputDecoration(
                labelText: t.disputeDeductionsLabel,
                helperText: t.disputeDeductionsHelper,
              ),
              onChanged: (value) => setDrawerState(() => draft = value),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(t.cancel),
              ),
              FilledButton(
                onPressed: draft.trim().isEmpty
                    ? null
                    : () => Navigator.pop(context, draft.trim()),
                child: Text(t.recordDispute),
              ),
            ],
          ),
        ),
      );
      if (reason == null) return;
    } else if (party != null) {
      final confirmed = await showKiviloDrawer<bool>(
        context: context,
        builder: (context) => KiviloDrawer(
          title: Text(t.handPhoneTo(party.name)),
          content: Text(
            t.agreeInPersonBody(party.name, t.partyRole(party.role).toLowerCase()),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(t.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(t.agreeDeductions),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }
    if (!mounted) return;
    setState(() => _answering = true);
    try {
      await _api.answerDepositStatement(
        report.id,
        version: assessment.version,
        agreed: agreed,
        reason: reason,
        stakeholderId: party?.stakeholderId,
      );
      if (mounted) await _refresh();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(plainError(error))));
      }
    } finally {
      if (mounted) setState(() => _answering = false);
    }
  }

  Widget _statement(
    SignedReport report,
    ReportAssessment assessment,
    DepositStatement statement,
    int findingCount,
  ) {
    final text = Theme.of(context).textTheme;
    String money(double amount) => t.money(amount.toStringAsFixed(2));
    Widget line(String label, String value, {bool bold = false}) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(label, style: bold ? text.titleSmall : text.bodyMedium),
          ),
          const SizedBox(width: 12),
          Text(value, style: bold ? text.titleSmall : text.bodyMedium),
        ],
      ),
    );
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(t.depositStatement, style: text.titleSmall),
            const SizedBox(height: 8),
            line(t.deposit, money(statement.deposit)),
            line(
              t.deductionsLine(statement.deductedCount, findingCount),
              '-${money(statement.deductions)}',
            ),
            const Divider(),
            line(
              statement.toReturn >= 0
                  ? t.toReturnToTenant
                  : t.deductionsExceed,
              money(statement.toReturn.abs()),
              bold: true,
            ),
            const SizedBox(height: 8),
            for (final response in statement.responses)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  [
                    '${response.name} (${t.partyRole(response.role).toLowerCase()}): ',
                    switch (response.answer) {
                      'AGREED' => t.answerAgreed,
                      'DISPUTED' => t.answerDisputed,
                      _ => t.answerNotYet,
                    },
                    if (response.inPerson) t.inPersonSuffix,
                    if (response.respondedAt != null)
                      ', ${shortDate(response.respondedAt!)}',
                    if (response.reason != null) '. "${response.reason}"',
                  ].join(),
                  style: text.bodySmall,
                ),
              ),
            const SizedBox(height: 6),
            Text(
              t.depositRecordsOnly,
              style: text.bodySmall?.copyWith(color: KiviloColors.muted),
            ),
            if (statement.answerAs != null) ...[
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _answering
                    ? null
                    : () => _answerStatement(report, assessment, agreed: true),
                child: Text(
                  _answering ? t.recording : t.iAgreeDeductions,
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: _answering
                    ? null
                    : () => _answerStatement(report, assessment, agreed: false),
                child: Text(t.dispute),
              ),
            ],
            for (final party in statement.answerInPerson) ...[
              const SizedBox(height: 12),
              Text(
                t.inPersonParty(t.partyRole(party.role).toLowerCase(), party.name),
                style: text.labelLarge,
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _answering
                          ? null
                          : () => _answerStatement(
                              report,
                              assessment,
                              agreed: true,
                              party: party,
                            ),
                      icon: const Icon(Icons.handshake_outlined),
                      label: Text(t.agrees),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _answering
                          ? null
                          : () => _answerStatement(
                              report,
                              assessment,
                              agreed: false,
                              party: party,
                            ),
                      child: Text(t.disputes),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _sign(SignedReport report) async {
    final landlord = report.signAs == 'LANDLORD';
    final signed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => SignatureScreen.own(
          inspectionId: report.id,
          name: landlord ? report.landlord : report.tenant,
          role: landlord ? 'Landlord' : 'Tenant',
          savedSignature: SavedSignature(
            Supabase.instance.client.auth.currentUser!.id,
          ),
          api: _api,
        ),
      ),
    );
    if (signed == true && mounted) {
      await _refresh();
      if (mounted && !landlord && !report.isCheckOut) {
        await showTenantHandover(context, inspectionId: report.id, api: _api);
      }
    }
  }

  @override
  Widget build(BuildContext context) => ProductScreen(
    screen: ProductScreenName.report,
    child: FutureBuilder<SignedReport>(
      future: _future,
      builder: (context, snapshot) {
        final report = snapshot.data;
        return Scaffold(
          appBar: AppBar(
            centerTitle: false,
            toolbarHeight: 72,
            title: PageContextTitle(
              title: report == null
                  ? t.report
                  : report.isCheckOut
                  ? t.checkOutReport
                  : t.checkInReport,
              contextLabel: report?.property ?? t.propertyReport,
            ),
          ),
          body: KiviloContent(
            maxWidth: 960,
            child: snapshot.hasError
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        '${snapshot.error}',
                        textAlign: TextAlign.center,
                      ),
                    ),
                  )
                : report == null
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(onRefresh: _refresh, child: _body(report)),
          ),
          bottomNavigationBar: report != null && report.signAs != null
              ? KiviloContent(
                  maxWidth: 720,
                  child: SafeArea(
                    minimum: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    child: FilledButton(
                      onPressed: () => _sign(report),
                      child: Text(
                        report.signAs == 'LANDLORD'
                            ? t.signAsLandlord
                            : t.signAsTenant,
                      ),
                    ),
                  ),
                )
              : null,
        );
      },
    ),
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
                    t.signedByBoth(shortDate(agreedAt)),
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
        if (!report.isCheckOut &&
            report.signatures.any(
              (signature) => signature.name == report.tenant,
            )) ...[
          OutlinedButton(
            onPressed: () =>
                showTenantHandover(context, inspectionId: report.id, api: _api),
            child: Text(t.tenantHandover),
          ),
          const SizedBox(height: 16),
        ],
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Wrap(
              runSpacing: 14,
              children: [
                _fact(t.landlord, report.landlord),
                _fact(t.tenant, report.tenant),
                if (report.agent != null) _fact(t.agent, report.agent!),
                _fact(
                  t.newTenancy,
                  t.dateRange(shortDate(report.startDate), shortDate(report.endDate)),
                ),
                _fact(
                  t.inspected,
                  [
                    if (report.conductedAt != null)
                      shortDate(report.conductedAt!)
                    else
                      t.notRecorded,
                    if (report.conductedBy != null) t.byName(report.conductedBy!),
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
            subtitle: t.itemCount(room.items.length),
          ),
          const SizedBox(height: 10),
          _items(room),
          if (room.photos.isNotEmpty) ...[
            const SizedBox(height: 10),
            _photos(room),
          ],
        ],
        const SizedBox(height: 28),
        KiviloSectionHeading(title: t.agreedAndSigned),
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
                  Text(t.notCountersigned, style: text.bodyMedium),
              ],
            ),
          ),
        ),
        if (report.addenda.isNotEmpty) ...[
          const SizedBox(height: 28),
          KiviloSectionHeading(
            title: t.updatesSinceSigning,
            subtitle:
                t.updatesSinceSigningDetail,
          ),
          for (final addendum in report.addenda) ...[
            const SizedBox(height: 10),
            _addendum(addendum),
          ],
        ],
        if (report.isCheckOut && report.assessment != null) ...[
          const SizedBox(height: 28),
          _assessment(report, report.assessment!),
        ],
        const SizedBox(height: 28),
        Text(
          t.reportFooter,
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
      return Text(t.nothingRecordedInRoom, style: text.bodyMedium);
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
                            t.readingValue(room.items[index].meterReading!),
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
                    itemConditionLabels[room.items[index].condition] ?? _titleCase(room.items[index].condition),
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
                      semanticLabel: photo.note ?? t.roomPhoto(room.name),
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
      [?photo.note, t.areasMarked(photo.marks.length)].join(' · '),
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
        appBar: AppBar(title: Text(photo.note ?? t.photo)),
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
              semanticLabel: t.signatureOf(signature.name),
            ),
          ),
        const SizedBox(height: 6),
        Text(signature.name, style: Theme.of(context).textTheme.titleSmall),
        Text(
          t.signedOn(shortDate(signature.signedAt)),
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  Widget _addendum(ReportAddendum addendum) {
    final text = Theme.of(context).textTheme;
    final pending = addendum.acknowledgedAt == null && addendum.dispute == null;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: KiviloColors.amberSoft,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                [
                  t.updatedOn(shortDate(addendum.effectiveDate), addendum.number),
                  if (addendum.dispute != null)
                    t.verdictDisputed
                  else if (pending)
                    t.pendingAcknowledgement,
                ].join(' · '),
                style: const TextStyle(
                  color: KiviloColors.amber,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(addendum.title, style: text.titleMedium),
            if (addendum.moveInDefect case final claim?) ...[
              const SizedBox(height: 6),
              Text(
                t.moveInConditionLine(shortDate(claim.reportedAt), calendarDate(claim.deadline)),
                style: text.bodySmall,
              ),
            ],
            if (addendum.dispute case final dispute?) ...[
              const SizedBox(height: 8),
              Text(
                t.disputedByOn(dispute.disputedBy, shortDate(dispute.disputedAt)),
                style: text.titleSmall,
              ),
              Text(dispute.reason),
              Text(
                t.disputedNoticeKept,
              ),
            ],
            if (addendum.reason != null) ...[
              const SizedBox(height: 4),
              Text(addendum.reason!, style: text.bodyMedium),
            ],
            const SizedBox(height: 4),
            Text(
              t.publishedByOn(addendum.publishedBy, shortDate(addendum.publishedAt)),
              style: text.bodySmall?.copyWith(color: KiviloColors.muted),
            ),
            for (final entry in addendum.entries) ...[
              const Divider(height: 24),
              Text(
                addendum.isMoveInDefect
                    ? t.conditionReported(entry.name ?? entry.targetName ?? t.itemFallback)
                    : entry.heading,
                style: text.titleSmall,
              ),
              Text(
                entry.roomName,
                style: text.bodySmall?.copyWith(color: KiviloColors.muted),
              ),
              if (!addendum.isMoveInDefect &&
                  entry.change == 'REPLACED' &&
                  entry.targetIdentifier != null)
                Text(
                  t.wasValue(entry.targetIdentifier!),
                  style: text.bodySmall?.copyWith(fontFamily: 'monospace'),
                ),
              if (entry.identifier != null)
                Text(
                  entry.identifier!,
                  style: text.bodySmall?.copyWith(fontFamily: 'monospace'),
                ),
              if (entry.condition != null)
                Text(itemConditionLabels[entry.condition!] ?? _titleCase(entry.condition!), style: text.labelMedium),
              if (entry.notes != null) ...[
                const SizedBox(height: 4),
                Text(entry.notes!, style: text.bodyMedium),
              ],
              if (entry.maintenanceTitle != null)
                Text(
                  t.fromRepairRecord(entry.maintenanceTitle!),
                  style: text.bodySmall,
                ),
              if (entry.photos.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final photo in entry.photos)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              photo.url,
                              width: 96,
                              height: 96,
                              fit: BoxFit.cover,
                              semanticLabel: photo.note ?? entry.heading,
                              errorBuilder: (_, _, _) => const SizedBox(
                                width: 96,
                                height: 96,
                                child: ColoredBox(color: KiviloColors.canvas),
                              ),
                            ),
                          ),
                          if (photo.label != null)
                            Text(photo.label!, style: text.bodySmall),
                        ],
                      ),
                  ],
                ),
              ],
            ],
            const Divider(height: 24),
            for (final ack in addendum.acknowledgements)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Icon(
                      ack.acknowledgedAt == null
                          ? Icons.schedule_rounded
                          : Icons.check_circle_outline,
                      size: 16,
                      color: ack.acknowledgedAt == null
                          ? KiviloColors.amber
                          : KiviloColors.green,
                    ),
                    const SizedBox(width: 6),
                    Expanded(child: Text(ack.status, style: text.bodySmall)),
                  ],
                ),
              ),
            if (addendum.acknowledgeInPerson && !addendum.isMoveInDefect)
              for (final ack in addendum.acknowledgements)
                if (ack.acknowledgedAt == null && ack.stakeholderId != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: OutlinedButton.icon(
                      onPressed: _acknowledging == null
                          ? () => _acknowledgeInPerson(addendum, ack)
                          : null,
                      icon: const Icon(Icons.handshake_outlined),
                      label: Text(t.inPersonParty(t.partyRole(ack.role), ack.name)),
                    ),
                  ),
            if (addendum.acknowledgeAs != null) ...[
              const SizedBox(height: 8),
              FilledButton(
                onPressed: _acknowledging == null
                    ? () => _acknowledge(addendum)
                    : null,
                child: Text(
                  _acknowledging == addendum.id
                      ? t.recording
                      : addendum.isMoveInDefect
                      ? t.agreePresentAtMoveIn
                      : t.acknowledgeUpdate,
                ),
              ),
            ],
            if (addendum.disputeAs == 'LANDLORD') ...[
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: _acknowledging == null
                    ? () => _dispute(addendum)
                    : null,
                child: Text(t.disputeMoveIn),
              ),
            ],
          ],
        ),
      ),
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
          title: t.checkOutAssessment,
          subtitle:
              t.assessmentVersionLine(assessment.version, shortDate(assessment.publishedAt)),
        ),
        const SizedBox(height: 10),
        if (assessment.summary != null) ...[
          Text(assessment.summary!, style: text.bodyMedium),
          const SizedBox(height: 10),
        ],
        if (assessment.statement != null)
          _statement(
            report,
            assessment,
            assessment.statement!,
            assessment.findings.length,
          )
        else
          Text(
            t.liabilitySummary(liable.length, assessment.findings.length, claim.toStringAsFixed(2), report.deposit),
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
                            t.money('${finding.estimatedCost}'),
                        ].join(', '),
                        style: text.labelMedium?.copyWith(
                          color: KiviloColors.muted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(finding.rationale, style: text.bodyMedium),
                  if (finding.photos.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(t.findingPhotos, style: text.labelMedium),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final photo in finding.photos)
                          SizedBox(
                            width: 160,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Semantics(
                                  button: true,
                                  label:
                                      t.openFindingPhoto(photo.note ?? t.photo),
                                  child: InkWell(
                                    onTap: () => _viewFindingPhoto(photo),
                                    child: SizedBox(
                                      height: 120,
                                      child: MarkedNetworkPhoto(
                                        url: photo.url,
                                        annotations: photo.annotations,
                                        fit: BoxFit.contain,
                                      ),
                                    ),
                                  ),
                                ),
                                if (photo.note != null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Text(
                                      photo.note!,
                                      style: text.bodySmall,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                  if (finding.maintenanceTitle != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      t.maintenanceRecord(finding.maintenanceTitle!),
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

  Future<void> _viewFindingPhoto(ReportPhoto photo) =>
      Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => Scaffold(
            appBar: AppBar(title: Text(photo.note ?? t.findingPhoto)),
            body: SafeArea(
              child: Center(
                child: InteractiveViewer(
                  minScale: 0.75,
                  maxScale: 6,
                  child: MarkedNetworkPhoto(
                    url: photo.url,
                    annotations: photo.annotations,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
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

String _titleCase(String value) =>
    value[0] + value.substring(1).toLowerCase().replaceAll('_', ' ');

String _verdict(String verdict) => switch (verdict) {
  'TENANT_LIABLE' => t.verdictTenantLiable,
  'FAIR_WEAR' => t.basisFairWear,
  'DISPUTED' => t.verdictDisputed,
  _ => t.verdictUndecided,
};
