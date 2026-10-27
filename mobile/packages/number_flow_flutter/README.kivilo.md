# Kivilo lifecycle fix

This is the published `number_flow_flutter` **0.1.0** package, copied from the
pub.dev archive. `lib/`, `pubspec.yaml` and `LICENSE` are retained; the only
modified Dart file is `lib/src/widgets/flow_render.dart`. The upstream analyzer
settings are retained with one newer style lint disabled so the other vendored
source files do not need formatting changes.

- Archive: https://pub.dev/api/archives/number_flow_flutter-0.1.0.tar.gz
- Archive SHA-256 from Kivilo's original lockfile:
  `262c896539485aa7a7d7e4d26a506641d1a2c87514d3710a37e1087ccb396ffc`
- Official repository: https://github.com/briankariuki/number_flow_flutter
- Upstream main checked on 2026-10-27:
  `23a574a454292ef312158b47263d1cb31e3e704f` (still contains the defect).

The local change gives each exiting slot ownership of its cleanup, preserves an
exit across repeated rebuilds, removes finished slots from repaint listeners,
and invalidates callbacks before disposing active and exiting wheels. This fixes
a canceled exit callback disposing an already-disposed animation controller when
a counter leaves the screen, while preserving the rolling animations.

Remove this local package and restore the hosted dependency when an upstream
release fixes these lifecycle cases and passes
`mobile/test/number_flow_lifecycle_test.dart` against that hosted release.
