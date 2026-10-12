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

  func testExactSyntheticRoomOffersOnlyNativeCaptureAndLibraryActions() {
    XCTAssertEqual(ProcessInfo.processInfo.environment["KIVILO_SYNTHETIC_CAPTURE_QA"], "1")
    openExactSyntheticCapture()

    XCTAssertTrue(kivilo.buttons["Take photo"].waitForExistence(timeout: 20))
    XCTAssertTrue(kivilo.buttons["Choose photos"].exists)

    let videoMode = kivilo.buttons["Video"].firstMatch
    XCTAssertTrue(videoMode.exists)
    videoMode.tap()
    XCTAssertTrue(kivilo.buttons["Record video"].waitForExistence(timeout: 10))
    XCTAssertTrue(kivilo.buttons["Choose video"].exists)
  }

  private func openExactSyntheticCapture() {
    kivilo.terminate()
    kivilo.launch()

    let inspections = kivilo.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "Inspections")
    ).firstMatch
    XCTAssertTrue(inspections.waitForExistence(timeout: 30), "Kivilo Home unavailable")
    inspections.tap()

    let address = kivilo.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@", "DEMO ONLY - iPhone capture QA")
    ).firstMatch
    XCTAssertTrue(address.waitForExistence(timeout: 30), "Synthetic inspection missing")
    scrollToHittable(address)
    address.tap()

    let room = kivilo.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@", "Blank surface capture QA")
    ).firstMatch
    XCTAssertTrue(room.waitForExistence(timeout: 15), "Synthetic room missing")
    scrollToHittable(room)
    room.tap()

    let capture = kivilo.buttons["Open camera & evidence"].firstMatch
    XCTAssertTrue(capture.waitForExistence(timeout: 15))
    scrollToHittable(capture)
    capture.tap()
  }

  private func scrollToHittable(_ element: XCUIElement) {
    for _ in 0..<10 where !element.isHittable { kivilo.swipeUp() }
    XCTAssertTrue(element.isHittable)
  }
}
