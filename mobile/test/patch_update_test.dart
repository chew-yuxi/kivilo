import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/patch_update.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';

class Updater implements ShorebirdUpdater {
  UpdateStatus status = UpdateStatus.outdated;
  bool fails = false;
  int downloads = 0;
  @override
  bool get isAvailable => true;
  @override
  Future<UpdateStatus> checkForUpdate({UpdateTrack? track}) async => status;
  @override
  Future<void> update({UpdateTrack? track}) async {
    downloads++;
    if (fails) throw StateError('No connection');
    status = UpdateStatus.restartRequired;
  }
  @override
  Future<Patch?> readCurrentPatch() async => null;
  @override
  Future<Patch?> readNextPatch() async => null;
}

void main() {
  test('installs without any notification plugin, permission, or process exit', () async {
    final updater = Updater();
    final service = DevicePatchUpdate(updater: updater);
    await service.install();
    expect(updater.downloads, 1);
    expect(await service.check(), PatchAvailability.restartRequired);
  });
  test('keeps a failed download retryable', () async {
    final updater = Updater()..fails = true;
    final service = DevicePatchUpdate(updater: updater);
    await expectLater(service.install(), throwsStateError);
    expect(await service.check(), PatchAvailability.downloadRequired);
    updater.fails = false;
    await service.install();
    expect(await service.check(), PatchAvailability.restartRequired);
  });
  test('does not download an already staged update again', () async {
    final updater = Updater()..status = UpdateStatus.restartRequired;
    await DevicePatchUpdate(updater: updater).install();
    expect(updater.downloads, 0);
  });
}
