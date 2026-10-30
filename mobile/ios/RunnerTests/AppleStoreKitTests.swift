import StoreKit
import StoreKitTest
import UIKit
import XCTest

// Run with FLUTTER_TARGET=test_support/apple_storekit_app.dart, never lib/main.dart.
// The StoreKit plugin and billing UI/service are real; server verification is a fake.
@available(iOS 17.0, *)
final class AppleStoreKitTests: XCTestCase {
    private var session: SKTestSession!
    private let personal = "kivilo_pro_monthly"

    override func setUp() async throws {
        guard ProcessInfo.processInfo.environment["KIVILO_STOREKIT_TEST"] == "1" else {
            throw XCTSkip("Run the dedicated StoreKit simulator fixture; see test_support/README.md.")
        }
        continueAfterFailure = true
        let file = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Kivilo", withExtension: "storekit"))
        session = try SKTestSession(contentsOf: file)
        session.resetToDefaultState()
        session.clearTransactions()
        session.disableDialogs = true
        session.storefront = "SGP"
        session.locale = Locale(identifier: "en_SG")
        // Xcode starts transaction IDs at zero, which the Flutter plugin uses
        // for pending/canceled results. Reserve that local-only sentinel first.
        let seed = try await session.buyProduct(identifier: "kivilo_test_seed")
        try session.deleteTransaction(identifier: UInt(seed.id))
    }

    private func command(_ path: String, _ body: [String: Any] = [:]) async throws -> [String: Any] {
        var request = URLRequest(url: URL(string: "http://127.0.0.1:9776/\(path)")!)
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let (bytes, response) = try await URLSession.shared.data(for: request)
        let result = try XCTUnwrap(JSONSerialization.jsonObject(with: bytes) as? [String: Any])
        XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 200, String(describing: result))
        return result
    }

    private func waitState(_ predicate: ([String: Any]) -> Bool) async throws -> [String: Any] {
        for _ in 0..<100 {
            let state = try await command("state")
            if predicate(state) { return state }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        let state = try await command("state")
        XCTFail("Timed out waiting for billing state: \(state)")
        return state
    }

    private func capture(_ name: String) async {
        await MainActor.run {
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let window = scene.windows.first(where: { $0.isKeyWindow }) else { return }
            let renderer = UIGraphicsImageRenderer(bounds: window.bounds)
            let image = renderer.image { _ in window.drawHierarchy(in: window.bounds, afterScreenUpdates: true) }
            let attachment = XCTAttachment(image: image)
            attachment.name = name
            attachment.lifetime = .keepAlways
            add(attachment)
        }
    }

    func testCatalogAndPurchaseScreen() async throws {
        _ = try await command("reset")
        let result = try await command("catalog")
        let products = try XCTUnwrap(result["products"] as? [[String: Any]])
        XCTAssertEqual(products.count, 21)
        XCTAssertTrue(products.allSatisfy { $0["currency"] as? String == "SGD" })
        XCTAssertEqual(products.first { $0["id"] as? String == personal }?["rawPrice"] as? Double, 39)
        let teamPrice = try XCTUnwrap(products.first { $0["id"] as? String == "kivilo_pro_team_3_monthly" }?["rawPrice"] as? Double)
        XCTAssertEqual(teamPrice, 116.98, accuracy: 0.00001)
        let state = try await waitState { ($0["texts"] as? [String] ?? []).contains(where: { $0.contains("39.00/month") }) }
        let texts = try XCTUnwrap(state["texts"] as? [String])
        XCTAssertTrue(texts.contains("Restore purchases"))
        XCTAssertTrue(texts.contains(where: { $0.contains("Renews automatically") }))
        await capture("Personal subscription — local StoreKit prices")
        _ = try await command("configure", ["workspace": "team"])
        _ = try await waitState { ($0["texts"] as? [String] ?? []).contains("Pro for Amber Property Team") }
        await capture("Team subscription — local StoreKit prices")
    }

    func testPurchaseAndRestore() async throws {
        _ = try await command("reset")
        _ = try await command("purchase", ["productId": personal])
        var state = try await waitState { ($0["verified"] as? Int ?? 0) >= 1 && ($0["unfinished"] as? [String]) == [] }
        XCTAssertEqual((state["paid"] as? [String: String])?["personal"], personal)
        let previous = try XCTUnwrap(state["verified"] as? Int)
        _ = try await command("configure", ["forgetPlan": true])
        _ = try await command("restore")
        state = try await waitState { ($0["verified"] as? Int ?? 0) > previous }
        XCTAssertEqual((state["paid"] as? [String: String])?["personal"], personal)
        XCTAssertEqual(state["unfinished"] as? [String], [])
        let signed = try await command("signed-transaction")
        let receipt = XCTAttachment(data: try JSONSerialization.data(withJSONObject: signed), uniformTypeIdentifier: "public.json")
        receipt.name = "Local Xcode transaction for server rejection check"
        receipt.lifetime = .keepAlways
        add(receipt)
    }

    func testVerificationFailureKeepsTransactionForRetry() async throws {
        _ = try await command("reset", ["verification": "offline"])
        _ = try await command("purchase", ["productId": personal])
        let failed = try await waitState { $0["error"] as? String == "Verification offline" }
        XCTAssertEqual(failed["verified"] as? Int, 0)
        XCTAssertEqual(failed["unfinished"] as? [String], [personal])
        _ = try await command("configure", ["verification": "success"])
        _ = try await command("resume")
        let recovered = try await waitState { ($0["verified"] as? Int ?? 0) > 0 && ($0["unfinished"] as? [String]) == [] }
        XCTAssertEqual((recovered["paid"] as? [String: String])?["personal"], personal)
    }

    func testDefinitiveRejectionDoesNotFinishPurchase() async throws {
        _ = try await command("reset", ["verification": "rejected"])
        _ = try await command("purchase", ["productId": personal])
        let state = try await waitState { $0["error"] as? String == "Purchase belongs to another account" }
        XCTAssertEqual(state["verified"] as? Int, 0)
        XCTAssertEqual(state["unfinished"] as? [String], [personal])
    }

    func testCanceledPurchaseDoesNotGrantPlan() async throws {
        _ = try await command("reset")
        try await session.setSimulatedError(.generic(.userCancelled), forAPI: .purchase)
        _ = try await command("purchase", ["productId": personal])
        let state = try await waitState { ($0["message"] as? String ?? "").contains("canceled") }
        XCTAssertEqual(state["attempts"] as? Int, 0)
        XCTAssertEqual(state["unfinished"] as? [String], [])
    }

    func testPendingApprovalDoesNotGrantUntilApproved() async throws {
        _ = try await command("reset")
        session.askToBuyEnabled = true
        _ = try await command("purchase", ["productId": personal])
        let pending = try await waitState { ($0["message"] as? String ?? "").contains("pending") }
        XCTAssertEqual(pending["verified"] as? Int, 0)
        let transaction = try XCTUnwrap(session.allTransactions().last)
        try session.approveAskToBuyTransaction(identifier: transaction.identifier)
        _ = try await waitState { ($0["verified"] as? Int ?? 0) > 0 && ($0["unfinished"] as? [String]) == [] }
    }

    func testTeamUpgradeAndDowngradeTiming() async throws {
        _ = try await command("reset", ["workspace": "team"])
        _ = try await command("purchase", ["productId": "kivilo_pro_team_2_monthly"])
        _ = try await waitState { ($0["paid"] as? [String: String])?["team"] == "kivilo_pro_team_2_monthly" }
        _ = try await command("purchase", ["productId": "kivilo_pro_team_3_monthly"])
        _ = try await waitState { ($0["paid"] as? [String: String])?["team"] == "kivilo_pro_team_3_monthly" }
        _ = try await command("purchase", ["productId": "kivilo_pro_team_2_monthly"])
        let beforeRenewal = try await command("state")
        XCTAssertEqual((beforeRenewal["paid"] as? [String: String])?["team"], "kivilo_pro_team_3_monthly")
        let products = try await Product.products(for: ["kivilo_pro_team_3_monthly"])
        let product = try XCTUnwrap(products.first)
        let statuses = try await product.subscription!.status
        let renewal = try XCTUnwrap(statuses.first).renewalInfo.payloadValue
        XCTAssertEqual(renewal.autoRenewPreference, "kivilo_pro_team_2_monthly")
    }
}
