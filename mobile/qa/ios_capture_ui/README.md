# Physical iPhone capture QA

This isolated XCUITest target controls the Kivilo build already installed from
TestFlight. Its scheme builds only the test runner; it has no Kivilo app target or
dependency. Do not add one: replacing the TestFlight app would erase the value
of testing the release build and could lose its saved captures.

Use a company-signed development runner on a connected iPhone with Developer
Mode enabled. Install and start the runner **while the phone is online**. Then
keep that same runner installed for the offline steps; reinstalling a test
runner during network loss can fail Apple's first-launch profile check. The
TestFlight app itself does not require Developer Mode.

Only the launch smoke test is safe without a fixture. The other methods require
`KIVILO_SYNTHETIC_CAPTURE_QA=1` in the **test runner's environment**, passed
through the `.xctestrun` file or test controller, and an already signed-in
`kivilo-apple-review@nottoosweetlabs.com` account. The online first step
verifies that account; every later step verifies the exact
`DEMO ONLY - iPhone capture QA` inspection, fictional tenant and
`Blank surface capture QA` room before capturing. They do not create
an inspection or add a room. Do not run against a customer account.

Run selected methods in this order, one at a time:

1. Online: `testOpenExactSyntheticCamera` verifies the reviewer account, named
   fixture, room and working camera. Run
   `testApproveMicrophoneForExactSyntheticRoom` online to handle the first iOS
   microphone prompt before video testing. Snapshot the exact room's current
   local queue identities as the baseline if it already contains synthetic
   evidence. The private baseline file should live outside the repository.
2. With verified total network loss and the **same installed runner**:
   `testOpenExactSyntheticCameraOffline` force-quits and relaunches Kivilo, then
   verifies the cached inspection, room and camera. Stop if it fails.
3. Still offline: `testThirtyPhotosInExactSyntheticRoom` takes 30 paced photos
   of a blank surface. Independently verify **30 new** exact-room local rows,
   unique capture identities and matching on-device file sizes relative to the
   baseline. A shutter tap is not proof of a saved capture. Stop if fewer than
   30 new records exist; inspect the app's visible error before trying again.
   A fast XCUITest tap while the ListView is still decelerating can stop the
   scroll without activating the shutter. The controller waits for the scroll
   to settle, but the journal remains the authority.
4. Still offline: `testTenMinuteVideoInExactSyntheticRoom` records and saves a
   ten-minute walkthrough. Verify one new VIDEO row, matching file size and
   duration before reconnecting. Keep the phone connected and do not point it
   at private documents.
5. Still offline: `testSyntheticCaptureSurvivesOfflineRestart` force-quits and
   relaunches Kivilo. Repeat the local queue and file-size check before giving
   the app network access again. Flutter may omit offscreen evidence cards from
   the accessibility tree, so their visible count is not proof of saved rows.
6. Restore connectivity. Independently verify the new photo batch and video
   in production, unique capture identities,
   storage handover, video duration, and that the local queue drains only after
   confirmed registration. Record any automatic-lock or XCTest wake-state
   limitation separately.

For an ordinary online selected run, use Xcode's `test-without-building` with
the signed `.xctestrun`, the physical device destination, and an explicit
`-only-testing:KiviloCaptureUITests/KiviloCaptureUITests/<method>` argument.
Pass the opt-in in the runner's environment, not merely the shell's environment.
The offline steps need a test controller that starts the **installed** runner
over USB without reinstalling it; they cannot be run by a normal Xcode command
that attempts a fresh installation after connectivity is removed. Verify that
any induced network condition is cleared even when a test fails.

## USB controller used for the release check

`run_installed_test.py` and `network_condition.py` use `pymobiledevice3==11.27.2`.
Install that pinned version in a temporary Python environment; these tools do not
need Kivilo credentials. Pass the connected QA device's UDID explicitly. The
controller launches the already installed `one.kivilo.qa.capturetests.xctrunner`
and fails unless exactly the selected test completes successfully.

```sh
python run_installed_test.py testOpenExactSyntheticCamera --udid "$KIVILO_QA_UDID" --userspace
python network_condition.py SlowNetwork100PctLoss --seconds 1200 --udid "$KIVILO_QA_UDID" --userspace
```

Run the second command in a separately monitored process. It refuses to replace
an existing device condition, verifies the selected profile, and clears it in
`finally` after the specified duration (at most 30 minutes). Creating
`/private/tmp/kivilo-network-condition.stop` requests early cleanup; remove that
marker only before starting the next run. Verify the `RESTORED` message and
inactive condition read-back even if the test fails. A host crash or disconnected
USB cable can prevent cleanup, so do not leave the condition unattended.

While that process is active, select the offline probe, capture, and restart
methods listed above through `run_installed_test.py`. Total packet loss is a
real device network condition; it is not an extraction stub or an app-level
mock. It does not switch off the iPhone's radios. Record that distinction in
release evidence. Do not run the entire mutating XCTest suite at once.

`check_local_captures.py` independently copies the capture SQLite journal (and
its WAL/SHM if present) through Apple's `devicectl`, then checks only the supplied
synthetic room. It compares each pending row with its actual app-support file's
size, requires unique capture identities, and reports counts and byte totals.
Its temporary database copies are removed on exit. Run it when the capture is
saved and the queue is idle/offline, before and after the offline restart:

```sh
python check_local_captures.py --device "$KIVILO_QA_UDID" --room "$KIVILO_QA_ROOM" \
  --baseline-out /private/tmp/kivilo-qa-baseline-ids.json
python check_local_captures.py --device "$KIVILO_QA_UDID" --room "$KIVILO_QA_ROOM" \
  --baseline-in /private/tmp/kivilo-qa-baseline-ids.json \
  --expected-new-photos 30 --expected-new-videos 1
```

The baseline file contains synthetic capture IDs and is created mode 0600;
remove it after the test. Existing pending rows may hand over while the batch
is in progress, so compare *new IDs*, not just the current total row count.

An accessibility tree can omit offscreen evidence cards; use this scoped journal
and file check for the total, followed by independent server/Storage verification
after reconnection. Do not infer missing capture bytes from a visible-card count.
