import XCTest

/// Runs against the Kivilo build already installed from TestFlight. This target
/// deliberately has no Kivilo app dependency, so Xcode does not replace it.
final class KiviloCaptureUITests: XCTestCase {
  private let kivilo = XCUIApplication(bundleIdentifier: "one.kivilo.kivilo")

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testInstalledKiviloLaunches() {
    kivilo.activate()
    XCTAssertTrue(kivilo.wait(for: .runningForeground, timeout: 20))
  }

  func testOpenExactSyntheticCamera() {
    XCTAssertEqual(ProcessInfo.processInfo.environment["KIVILO_SYNTHETIC_CAPTURE_QA"], "1")
    openExactSyntheticCamera()
    print("QA exact synthetic room and reviewer account confirmed")
  }

  /// The Account page fetches a profile from the server. This probe instead
  /// proves the already verified reviewer's exact cached synthetic fixture is
  /// usable while the device has no server connectivity.
  func testOpenExactSyntheticCameraOffline() {
    XCTAssertEqual(ProcessInfo.processInfo.environment["KIVILO_SYNTHETIC_CAPTURE_QA"], "1")
    openExactSyntheticCamera(verifyAccount: false)
    print("QA exact synthetic room camera available without network")
  }

  /// Explicit opt-in only, after the online reviewer-account check. The test
  /// navigates to one named synthetic fixture and captures blank surfaces.
  /// Its bytes and exactly-once registration are checked independently.
  func testThirtyPhotosAndTenMinuteVideo() throws {
    executionTimeAllowance = 900
    XCTAssertEqual(ProcessInfo.processInfo.environment["KIVILO_SYNTHETIC_CAPTURE_QA"], "1")
    openExactSyntheticCamera(verifyAccount: false)
    takeThirtyPhotos()
    recordTenMinuteVideo()
  }

  /// Separate from video so the host can prove 30 new durable rows and files
  /// before spending ten minutes recording. It does not delete earlier evidence.
  func testThirtyPhotosInExactSyntheticRoom() {
    executionTimeAllowance = 360
    XCTAssertEqual(ProcessInfo.processInfo.environment["KIVILO_SYNTHETIC_CAPTURE_QA"], "1")
    openExactSyntheticCamera(verifyAccount: false)
    takeThirtyPhotos()
  }

  private func takeThirtyPhotos() {
    let photo = kivilo.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "Take photo")
    ).firstMatch
    for _ in 0..<8 where !photo.exists { kivilo.swipeUp() }
    XCTAssertTrue(photo.waitForExistence(timeout: 30), "Synthetic room camera did not open")
    scrollToHittable(photo)
    let initialPhotos = savedPhotoCount()

    for number in 1...30 {
      waitUntilEnabled(photo, name: "photo shutter \(number)")
      photo.tap()
      // The outer Flutter Semantics node can appear enabled even while the
      // inner IconButton is busy. Give native capture and its durable save
      // time to finish before the next tap; the host still checks SQLite.
      Thread.sleep(forTimeInterval: 2)
      XCTAssertFalse(kivilo.staticTexts.matching(
        NSPredicate(format: "label BEGINSWITH %@", "Photo could not be saved:")
      ).firstMatch.exists, "Kivilo reported a photo save error")
      waitUntilEnabled(photo, name: "saved photo \(number)")
      if number.isMultiple(of: 5) {
        print("QA photo shutters: \(number)/30; visible evidence: \(savedPhotoCount() - initialPhotos)")
      }
    }
    print("QA thirty photo shutter sequence completed; verify 30 new local rows and files")
  }

  /// Grant only the microphone permission needed by narrated room walkthroughs.
  /// iOS can present it when Video mode initializes, before Record is visible.
  func testApproveMicrophoneForExactSyntheticRoom() {
    XCTAssertEqual(ProcessInfo.processInfo.environment["KIVILO_SYNTHETIC_CAPTURE_QA"], "1")
    openExactSyntheticCamera()
    _ = prepareVideoMode()
    print("QA synthetic room video mode and microphone permission ready")
  }

  /// Use after a host-side queue audit identifies an unacknowledged shutter tap.
  /// The host checks the exact local row and file before proceeding to video.
  func testOnePhotoInExactSyntheticRoom() {
    XCTAssertEqual(ProcessInfo.processInfo.environment["KIVILO_SYNTHETIC_CAPTURE_QA"], "1")
    openExactSyntheticCamera(verifyAccount: false)
    let photo = kivilo.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "Take photo")
    ).firstMatch
    for _ in 0..<8 where !photo.exists { kivilo.swipeUp() }
    XCTAssertTrue(photo.waitForExistence(timeout: 30))
    scrollToHittable(photo)
    waitUntilEnabled(photo, name: "single photo shutter")
    photo.tap()
    Thread.sleep(forTimeInterval: 1)
    waitUntilEnabled(photo, name: "single photo save")
    print("QA single photo shutter returned; check exact local row and bytes")
  }

  func testTenMinuteVideoInExactSyntheticRoom() {
    executionTimeAllowance = 900
    XCTAssertEqual(ProcessInfo.processInfo.environment["KIVILO_SYNTHETIC_CAPTURE_QA"], "1")
    openExactSyntheticCamera(verifyAccount: false)
    recordTenMinuteVideo()
  }

  /// Run while the test phone still has total packet loss. The helper quits
  /// and relaunches TestFlight Kivilo, then reads the saved evidence from its
  /// own local queue without giving it a chance to sync first.
  func testSyntheticCaptureSurvivesOfflineRestart() {
    XCTAssertEqual(ProcessInfo.processInfo.environment["KIVILO_SYNTHETIC_CAPTURE_QA"], "1")
    openExactSyntheticCamera(verifyAccount: false)
    print("QA offline restart reopened the synthetic camera; verify new rows and files against the private baseline")
  }

  private func openExactSyntheticCamera(verifyAccount: Bool = true) {
    kivilo.terminate()
    kivilo.launch()
    if verifyAccount {
      let account = kivilo.buttons.matching(
        NSPredicate(format: "label CONTAINS %@", "Account")
      ).firstMatch
      XCTAssertTrue(account.waitForExistence(timeout: 30), "Kivilo Home unavailable")
      account.tap()
      let reviewer = kivilo.descendants(matching: .any).matching(
        NSPredicate(format: "label CONTAINS %@", "kivilo-apple-review@nottoosweetlabs.com")
      ).firstMatch
      XCTAssertTrue(reviewer.waitForExistence(timeout: 15), "Wrong signed-in account")
    }

    let inspections = kivilo.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "Inspections")
    ).firstMatch
    XCTAssertTrue(inspections.waitForExistence(timeout: 10))
    inspections.tap()
    let address = kivilo.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@", "DEMO ONLY - iPhone capture QA")
    ).firstMatch
    XCTAssertTrue(address.waitForExistence(timeout: 30), "Synthetic inspection missing")
    scrollToHittable(address)
    address.tap()
    let tenant = kivilo.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@", "Demo Tenant (iPhone QA)")
    ).firstMatch
    XCTAssertTrue(tenant.waitForExistence(timeout: 15),
                  "Inspection is not the synthetic fixture")

    let room = kivilo.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@", "Blank surface capture QA")
    ).firstMatch
    XCTAssertTrue(room.waitForExistence(timeout: 15), "Synthetic room missing")
    scrollToHittable(room)
    room.tap()
    let camera = kivilo.buttons["Open camera & evidence"].firstMatch
    XCTAssertTrue(camera.waitForExistence(timeout: 15))
    scrollToHittable(camera)
    camera.tap()
    XCTAssertTrue(kivilo.staticTexts["LIVE CAMERA"].waitForExistence(timeout: 30),
                  "Camera preview unavailable")
  }

  private func savedPhotoCount() -> Int {
    kivilo.staticTexts.matching(
      NSPredicate(format: "label CONTAINS %@", "Photo on this phone")
    ).count + kivilo.staticTexts.matching(
      NSPredicate(format: "label CONTAINS %@", "Photo synced")
    ).count
  }

  private func prepareVideoMode() -> XCUIElement {
    let videoMode = kivilo.buttons["Video"].firstMatch
    for _ in 0..<8 where !videoMode.exists { kivilo.swipeUp() }
    XCTAssertTrue(videoMode.waitForExistence(timeout: 20))
    let microphoneAlert = XCUIApplication(bundleIdentifier: "com.apple.springboard")
      .alerts.firstMatch
    let start = kivilo.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "Record walkthrough")
    ).firstMatch
    for attempt in 1...5 {
      scrollToHittable(videoMode)
      print("QA video switch attempt \(attempt): enabled=\(videoMode.isEnabled), selected=\(videoMode.isSelected)")
      if videoMode.isEnabled && !videoMode.isSelected { videoMode.tap() }
      if microphoneAlert.waitForExistence(timeout: 7) {
        let allow = microphoneAlert.buttons["Allow"]
        XCTAssertTrue(allow.exists, "Unexpected microphone permission prompt")
        allow.tap()
      }
      Thread.sleep(forTimeInterval: 2)
      let selected = videoMode.isSelected
      print("QA video switch attempt \(attempt): selected after tap=\(selected)")
      if attempt == 1 {
        let afterTap = XCTAttachment(screenshot: kivilo.screenshot())
        afterTap.name = "Synthetic video mode two seconds after selection"
        afterTap.lifetime = .keepAlways
        add(afterTap)
      }
      if selected {
        let selectedScreen = XCTAttachment(screenshot: kivilo.screenshot())
        selectedScreen.name = "Synthetic video mode selected"
        selectedScreen.lifetime = .keepAlways
        add(selectedScreen)
        // The shutter precedes the segmented control in the ListView. A
        // video preview can place it above the visible accessibility tree.
        for _ in 0..<4 {
          if start.exists {
            scrollToRecordShutter(start)
            return start
          }
          kivilo.swipeDown()
        }
        if start.waitForExistence(timeout: 12) {
          scrollToRecordShutter(start)
          return start
        }
      }
      let videoModeScreen = XCTAttachment(screenshot: kivilo.screenshot())
      videoModeScreen.name = "Synthetic video mode attempt \(attempt)"
      videoModeScreen.lifetime = .keepAlways
      add(videoModeScreen)
      Thread.sleep(forTimeInterval: 2)
    }
    let videoModeScreen = XCTAttachment(screenshot: kivilo.screenshot())
    videoModeScreen.name = "Synthetic video mode after bounded retries"
    videoModeScreen.lifetime = .keepAlways
    add(videoModeScreen)
    XCTFail("Video mode did not initialize after bounded retries")
    return start
  }

  private func recordTenMinuteVideo() {
    let start = prepareVideoMode()
    waitUntilEnabled(start, name: "video recorder")
    start.tap()

    let microphoneAlert = XCUIApplication(bundleIdentifier: "com.apple.springboard")
      .alerts.firstMatch
    if microphoneAlert.waitForExistence(timeout: 3) {
      let allow = microphoneAlert.buttons["Allow"]
      XCTAssertTrue(allow.exists, "Unexpected microphone permission prompt")
      allow.tap()
      if start.exists { start.tap() }
    }

    let stop = kivilo.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "Stop and save video")
    ).firstMatch
    XCTAssertTrue(stop.waitForExistence(timeout: 30), "Video did not start")
    print("QA ten-minute video started")
    Thread.sleep(forTimeInterval: 600)
    XCTAssertTrue(stop.exists, "Recording stopped before ten minutes")
    scrollToHittable(stop)
    stop.tap()
    waitUntilEnabled(start, name: "saved ten-minute video", timeout: 90)
    // Offscreen evidence cards may be absent from the accessibility tree.
    // Read the local SQLite queue and matching file sizes before reconnecting.
    print("QA ten-minute video stop/save completed; verify local journal and bytes")
  }

  private func waitUntilEnabled(
    _ element: XCUIElement,
    name: String,
    timeout: TimeInterval = 45
  ) {
    let enabled = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "exists == true AND enabled == true"),
      object: element
    )
    XCTAssertEqual(XCTWaiter.wait(for: [enabled], timeout: timeout), .completed, name)
  }

  private func scrollToRecordShutter(_ shutter: XCUIElement) {
    for _ in 0..<8 {
      if shutter.exists && shutter.isHittable {
        // A hit test can succeed while the ListView is still decelerating;
        // the next tap would only stop that scroll instead of recording.
        Thread.sleep(forTimeInterval: 1.2)
        return
      }
      kivilo.swipeDown()
    }
    XCTAssertTrue(shutter.isHittable, "Video shutter is not visible above the mode selector")
  }

  private func scrollToHittable(_ element: XCUIElement) {
    for _ in 0..<8 {
      if element.isHittable {
        Thread.sleep(forTimeInterval: 1.2)
        return
      }
      // Start above the iOS keyboard: a whole-app swipe begins in the number
      // pad and leaves the form at the top.
      let start = kivilo.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.55))
      let end = kivilo.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2))
      start.press(forDuration: 0.05, thenDragTo: end)
    }
    XCTAssertTrue(element.isHittable, "Required Kivilo control is offscreen")
  }
}
