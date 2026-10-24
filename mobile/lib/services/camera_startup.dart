/// Serializes camera startup across lifecycle changes and permission prompts.
/// A denied permission needs a deliberate retry, not another automatic resume.
class CameraStartup {
  Future<void>? _opening;
  bool _permissionDenied = false;
  bool _resumeRequested = false;

  void markPermissionDenied() {
    _permissionDenied = true;
    _resumeRequested = false;
  }

  Future<void> open(
    Future<bool> Function() attempt, {
    bool explicitRetry = false,
  }) {
    if (explicitRetry) _permissionDenied = false;
    if (_permissionDenied) return Future<void>.value();
    final opening = _opening;
    if (opening != null) {
      _resumeRequested = true;
      return opening;
    }
    late final Future<void> next;
    next = _run(attempt).whenComplete(() {
      if (identical(_opening, next)) _opening = null;
    });
    _opening = next;
    return next;
  }

  Future<void> _run(Future<bool> Function() attempt) async {
    try {
      final opened = await attempt();
      if (!opened && _resumeRequested && !_permissionDenied) {
        _resumeRequested = false;
        await attempt();
      }
    } finally {
      _resumeRequested = false;
    }
  }
}
