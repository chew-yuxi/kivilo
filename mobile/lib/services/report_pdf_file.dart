import 'dart:io';

import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';

/// Downloads the document itself for the native viewer and share sheet. Signed
/// storage URLs expire and must never be shared in place of the PDF attachment.
class ReportPdfFile {
  ReportPdfFile({
    Dio? downloads,
    Future<Directory> Function()? temporaryDirectory,
  }) : _downloads = downloads ?? Dio(),
       _temporaryDirectory = temporaryDirectory ?? getTemporaryDirectory;

  // This client has no auth interceptor: storage needs only its signed URL, never
  // the agent's Supabase bearer token.
  final Dio _downloads;
  final Future<Directory> Function() _temporaryDirectory;

  Future<File> download(String url, String name) async {
    final root = await _temporaryDirectory();
    final reports = await Directory(
      '${root.path}/report-pdfs',
    ).create(recursive: true);
    final expired = DateTime.now().subtract(const Duration(days: 1));
    await for (final entry in reports.list()) {
      if (entry is Directory &&
          (await entry.stat()).modified.isBefore(expired)) {
        await entry.delete(recursive: true);
      }
    }
    // Never overwrite a report another app is still reading, or reuse a copy from
    // before an update was published. The OS can clear this temporary directory.
    final directory = await reports.createTemp('report-');
    final filename = name.replaceAll(RegExp(r'[^A-Za-z0-9 .-]'), ' ').trim();
    final file = File(
      '${directory.path}/${filename.isEmpty ? 'Kivilo report' : filename}.pdf',
    );
    try {
      await _downloads.download(url, file.path);
      final handle = await file.open();
      try {
        final header = await handle.read(5);
        if (header.length != 5 || String.fromCharCodes(header) != '%PDF-') {
          throw const FormatException('Report download is not a PDF');
        }
      } finally {
        await handle.close();
      }
      return file;
    } catch (_) {
      await directory.delete(recursive: true);
      rethrow;
    }
  }
}
