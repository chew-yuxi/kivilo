import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/screens/update_gate.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/app_update.dart';
import 'package:kivilo/services/patch_update.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:package_info_plus/package_info_plus.dart';

const _appStore = 'https://apps.apple.com/app/id6821514302';
const _play = 'https://play.google.com/store/apps/details?id=one.kivilo.kivilo';

Map<String, dynamic> _config({int ios = 0, int android = 0}) => {
  'ios': {'minBuild': ios, 'storeUrl': _appStore},
  'android': {'minBuild': android, 'storeUrl': _play},
};

class _FakeApi extends Api {
  _FakeApi(this._respond) : super(attachAuth: false, cache: ReadCache());
  final Future<Map<String, dynamic>> Function() _respond;

  @override
  Future<Map<String, dynamic>> appConfig() => _respond();
}

class _FakePatchUpdate implements PatchUpdate {
  _FakePatchUpdate([this.availability = PatchAvailability.none]);

  final PatchAvailability availability;
  int installs = 0;

  @override
  Future<PatchAvailability> check() async => availability;

  @override
  Future<void> installAndClose() async {
    installs++;
  }
}

void main() {
  group('updateUrlFor', () {
    test('sends a build below its platform floor to its own store', () {
      expect(
        updateUrlFor(_config(ios: 22), platform: TargetPlatform.iOS, build: 21),
        _appStore,
      );
      expect(
        updateUrlFor(
          _config(android: 22),
          platform: TargetPlatform.android,
          build: 21,
        ),
        _play,
      );
    });

    test('lets the floor build itself and anything newer run', () {
      final config = _config(ios: 22);
      expect(
        updateUrlFor(config, platform: TargetPlatform.iOS, build: 22),
        isNull,
      );
      expect(
        updateUrlFor(config, platform: TargetPlatform.iOS, build: 30),
        isNull,
      );
    });

    /// Apple review lags Play, so the floors move separately.
    test('reads only its own platform floor', () {
      expect(
        updateUrlFor(
          _config(ios: 30),
          platform: TargetPlatform.android,
          build: 21,
        ),
        isNull,
      );
    });
  });

  group('requiredUpdateUrl', () {
    setUp(() {
      PackageInfo.setMockInitialValues(
        appName: 'Kivilo',
        packageName: 'one.kivilo.kivilo',
        version: '1.0.0',
        buildNumber: '21',
        buildSignature: '',
      );
    });

    test('compares the installed build with the server floor', () async {
      expect(
        await requiredUpdateUrl(_FakeApi(() async => _config(android: 22))),
        _play,
      );
      expect(
        await requiredUpdateUrl(_FakeApi(() async => _config(android: 21))),
        isNull,
      );
    });

    /// An inspector is offline by default; no answer must never lock them out.
    test('fails open when the server cannot be reached', () async {
      expect(
        await requiredUpdateUrl(
          _FakeApi(() async => throw const ApiFailure('offline', null)),
        ),
        isNull,
      );
    });

    test('fails open on a response this build does not understand', () async {
      expect(
        await requiredUpdateUrl(_FakeApi(() async => {'android': 'later'})),
        isNull,
      );
    });
  });

  group('UpdateGate', () {
    Widget app(Future<String?> Function() check, {PatchUpdate? patchUpdate}) =>
        MaterialApp(
          theme: buildKiviloTheme(),
          builder: (context, child) => UpdateGate(
            check: check,
            patchUpdate: patchUpdate ?? _FakePatchUpdate(),
            child: child!,
          ),
          home: const _Counter(),
        );

    testWidgets('shows the app when the build is current', (tester) async {
      await tester.pumpWidget(app(() async => null));
      await tester.pumpAndSettle();
      expect(find.text('count 0'), findsOneWidget);
      expect(find.text('Update Kivilo'), findsNothing);
    });

    /// The root's capture retry lives in the app underneath; replacing the app would stop
    /// it and leave captures waiting until after the update.
    testWidgets('covers the app without unmounting it', (tester) async {
      final check = Completer<String?>();
      await tester.pumpWidget(app(() => check.future));
      await tester.tap(find.text('count 0'));
      await tester.pump();

      check.complete(_play);
      await tester.pumpAndSettle();

      expect(find.text('Update Kivilo'), findsOneWidget);
      expect(find.text('Open Google Play'), findsOneWidget);
      expect(find.text('count 1'), findsNothing);
      expect(find.text('count 1', skipOffstage: false), findsOneWidget);
    });

    testWidgets('requires a tap before downloading a Shorebird patch', (
      tester,
    ) async {
      final patch = _FakePatchUpdate(PatchAvailability.downloadRequired);
      await tester.pumpWidget(app(() async => null, patchUpdate: patch));
      await tester.pumpAndSettle();

      expect(find.text('Update Kivilo'), findsOneWidget);
      expect(find.text('Update'), findsOneWidget);
      expect(find.text('count 0'), findsNothing);
      expect(find.text('count 0', skipOffstage: false), findsOneWidget);

      await tester.tap(find.text('Update'));
      await tester.pump();
      expect(patch.installs, 1);
    });

    testWidgets('asks to close when Shorebird already staged the patch', (
      tester,
    ) async {
      final patch = _FakePatchUpdate(PatchAvailability.restartRequired);
      await tester.pumpWidget(app(() async => null, patchUpdate: patch));
      await tester.pumpAndSettle();

      expect(find.text('Update ready'), findsOneWidget);
      expect(find.text('Close and update'), findsOneWidget);
    });

    testWidgets('a required store release takes precedence over a patch', (
      tester,
    ) async {
      final patch = _FakePatchUpdate(PatchAvailability.downloadRequired);
      await tester.pumpWidget(app(() async => _play, patchUpdate: patch));
      await tester.pumpAndSettle();

      expect(find.text('Open Google Play'), findsOneWidget);
      expect(find.text('Update', findRichText: true), findsNothing);
    });
  });
}

class _Counter extends StatefulWidget {
  const _Counter();

  @override
  State<_Counter> createState() => _CounterState();
}

class _CounterState extends State<_Counter> {
  int _count = 0;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: TextButton(
        onPressed: () => setState(() => _count++),
        child: Text('count $_count'),
      ),
    ),
  );
}
