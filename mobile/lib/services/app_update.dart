import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'api.dart';

/// The store page to send this build to, or null when it may keep running. The server
/// holds a minimum build per platform, so an old build can be retired without shipping
/// anything to it. Shorebird patches cannot do this job: a build with no wall in it, or
/// a change a patch cannot carry, needs the store.
///
/// Fails open. Offline, an error, or a response this build does not understand all mean
/// no wall: an inspector is offline by default, and a check that could lock them out of a
/// walkthrough would do more harm than an old build.
Future<String?> requiredUpdateUrl(Api api) async {
  try {
    final config = await api.appConfig();
    final info = await PackageInfo.fromPlatform();
    return updateUrlFor(
      config,
      platform: defaultTargetPlatform,
      build: int.parse(info.buildNumber),
    );
  } catch (error) {
    debugPrint('update check error: $error');
    return null;
  }
}

String? updateUrlFor(
  Map<String, dynamic> config, {
  required TargetPlatform platform,
  required int build,
}) {
  final entry =
      config[platform == TargetPlatform.iOS ? 'ios' : 'android']
          as Map<String, dynamic>;
  return build < (entry['minBuild'] as int) ? entry['storeUrl'] as String : null;
}
