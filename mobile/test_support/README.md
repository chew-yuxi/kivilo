# Native Apple billing simulator checks

`apple_storekit_app.dart` is a debug-only test entry point. It renders the real
`BillingScreen`, uses `AppleBilling` and the native StoreKit plugin, and supplies a
fake in-memory Kivilo API. It does not initialize Supabase or contact the backend.
Never use this entry point for a distribution build.

`ios/RunnerTests/AppleStoreKitTests.swift` drives that fixture through a loopback-only
control socket and Apple's `SKTestSession`. `Kivilo.storekit` contains the 21 prices
read back from App Store Connect on 30 October 2026. Its additional seed product
reserves Xcode's transaction ID zero, which the Flutter plugin treats as the
sentinel for a pending/canceled transaction. That product exists only in this test
configuration, not in App Store Connect.

From `mobile/`, with a dedicated booted simulator:

```sh
flutter build ios --simulator --debug --target test_support/apple_storekit_app.dart \
  --build-number=26 --dart-define-from-file=env.json
TEST_RUNNER_KIVILO_STOREKIT_TEST=1 xcodebuild test \
  -workspace ios/Runner.xcworkspace -scheme Runner \
  -configuration Debug -destination 'platform=iOS Simulator,id=<simulator-id>' \
  -derivedDataPath build/storekit-tests/DerivedData \
  -resultBundlePath build/storekit-tests/<unique-run-name>.xcresult \
  -only-testing:RunnerTests/AppleStoreKitTests -parallel-testing-enabled NO \
  FLUTTER_TARGET=test_support/apple_storekit_app.dart CODE_SIGNING_ALLOWED=NO
```

The explicit test-runner flag keeps these cases skipped during ordinary Xcode
tests that run the normal app entry point. The seven native tests exercise catalog
prices and the screen, purchase/restore,
cancellation, pending approval, failed verification/retry, permanent rejection,
and team upgrade/downgrade timing. They inspect unfinished native transactions to
confirm the app waits for verification before finishing. Screenshot attachments
are simulator test evidence, with a fake backend, not final store listing captures.

Local StoreKit transactions are signed by Xcode. These tests cannot validate the
real App Store Server API or notification delivery. Keep the production verifier
restricted to Apple-signed Sandbox/Production transactions; never add the local
Xcode certificate to its trusted roots.

After testing, restore the ordinary generated build configuration:

```sh
flutter build ios --simulator --debug --target lib/main.dart \
  --build-number=26 --dart-define-from-file=env.json
```

All release commands must also use the normal `lib/main.dart` entry point and an
explicit unused build number, as described in `../RELEASE.md`.
