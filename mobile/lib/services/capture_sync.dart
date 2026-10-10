import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'api.dart';
import 'capture_backend.dart';
import 'capture_queue.dart';
import 'capture_store.dart';
import 'uploader.dart';

/// Reconcile camera files and native transfers whenever the app starts or resumes.
/// The returned ids are camera journals without a recoverable source file.
Future<List<String>> resumePendingCaptures() async {
  final ownerId = Supabase.instance.client.auth.currentUser?.id;
  if (ownerId == null) return const [];
  final root = await getApplicationSupportDirectory();
  final queue = CaptureQueue();
  try {
    final unresolved = await CaptureStore(queue: queue, root: root).reconcile(ownerId);
    await Uploader(queue: queue, backend: HttpCaptureBackend(Api().dio),
      root: root, ownerId: ownerId).drain();
    return unresolved;
  } finally {
    await queue.close();
  }
}
