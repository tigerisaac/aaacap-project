import Foundation

private struct TestFailure: Error { let message: String }
private func require(_ condition: Bool, _ message: String) throws { if !condition { throw TestFailure(message: message) } }
private let firstID = "22fce9c6-5c0f-4c40-b600-73710aaad7a1"
private let secondID = "b10cf105-d4e4-4613-8c6e-d03a5bf69be8"
private func state(_ audience: String = "public", active: Bool = false, eligible: Bool = true, id: String = firstID) -> ServiceAccessStatus {
    .init(audience: audience, status: active ? "active" : audience == "pilot" ? "awaiting_activation" : "inactive",
          purchaseAllowed: audience == "public" && eligible && !active, hasSubscription: active,
          expiresAt: active ? Date.now.addingTimeInterval(86400) : nil, accessUntil: active ? Date.now.addingTimeInterval(86400) : nil,
          willRenew: audience == "public" && active, billingIssue: false,
          revenueCat: audience == "public" ? .init(customerId: id, publicSDKKey: "appl_synthetic", entitlementId: "shield_access",
                                                  offeringId: "default", monthlyProductId: "shield_monthly", annualProductId: "shield_annual") : nil)
}

@MainActor private final class AccessAPI: ServiceAccessAPI {
    var value = state()
    var error: Error?
    var requests: [Bool] = []
    var next: (() async throws -> ServiceAccessStatus)?
    func serviceAccess(refresh: Bool) async throws -> ServiceAccessStatus {
        requests.append(refresh)
        if let next { self.next = nil; return try await next() }
        if let error { throw error }
        return value
    }
}
@MainActor private final class PurchaseClient: SubscriptionClient {
    var events: [String] = []
    var result = SubscriptionPurchaseResult.purchased
    var failure: Error?
    var purchaseContinuation: CheckedContinuation<SubscriptionPurchaseResult, Never>?
    var pausePurchase = false
    var changesContinuation: AsyncStream<Void>.Continuation?
    var changes: AsyncStream<Void> { AsyncStream { changesContinuation = $0 } }
    func identify(_ configuration: ServiceAccessStatus.RevenueCatConfiguration) async throws { events.append("identify:\(configuration.customerId)") }
    func plans(_ configuration: ServiceAccessStatus.RevenueCatConfiguration) async throws -> [SubscriptionPlan] {
        events.append("plans")
        if let failure { throw failure }
        return [.init(id: "shield_monthly", title: "Monthly", price: "$9.99", billingPeriod: "month", monthlyEquivalent: nil),
                .init(id: "shield_annual", title: "Yearly", price: "$99.99", billingPeriod: "year", monthlyEquivalent: "$8.33")]
    }
    func purchase(_ productID: String) async throws -> SubscriptionPurchaseResult {
        events.append("purchase:\(productID)")
        if let failure { throw failure }
        if pausePurchase { return await withCheckedContinuation { purchaseContinuation = $0 } }
        return result
    }
    func restore() async throws { events.append("restore"); if let failure { throw failure } }
}

@main private struct SubscriptionTests {
    @MainActor static func main() async throws {
        for audience in ["assisted", "pilot"] {
            let api = AccessAPI(), client = PurchaseClient(), model = SubscriptionModel(client: client)
            api.value = state(audience, active: true)
            await model.load(api: api, includePlans: true)
            try require(client.events.isEmpty && model.plans.isEmpty, "pilot/assisted account touched the store")
            try require(model.access?.isPilot == (audience == "pilot"), "audience was lost")
            model.reset(); api.error = APIError.service(code: "old_backend", status: 404)
            await model.load(api: api, includePlans: true)
            try require(!model.showsAccess && model.access == nil, "old backend displayed a speculative paywall")
            model.reset()
        }
        do {
            let api = AccessAPI(), client = PurchaseClient(), model = SubscriptionModel(client: client)
            await model.load(api: api, includePlans: true)
            try require(model.plans.count == 2 && client.events.first == "identify:\(firstID)", "verified identity or two-plan offer missing")
            api.value = state(eligible: false)
            await model.purchase("shield_monthly", api: api)
            try require(!client.events.contains("purchase:shield_monthly") && model.plans.isEmpty, "stale eligibility allowed a purchase")
            model.reset()
        }
        for result in [SubscriptionPurchaseResult.cancelled, .pending, .purchased] {
            let api = AccessAPI(), client = PurchaseClient(), model = SubscriptionModel(client: client)
            await model.load(api: api, includePlans: true); client.result = result
            await model.purchase("shield_monthly", api: api)
            try require(model.access?.isActive == false, "SDK success bypassed server verification")
            if result == .cancelled { try require(model.message == nil && !model.pendingPurchase && model.error == nil, "cancellation became an error or pending purchase") }
            else {
                try require(model.pendingPurchase, "pending verification allowed another purchase")
                await model.purchase("shield_monthly", api: api)
                try require(client.events.filter { $0 == "purchase:shield_monthly" }.count == 1, "duplicate purchase offered")
                api.value = state(active: true); await model.synchronize(api: api)
                try require(model.access?.isActive == true && model.plans.isEmpty && !model.pendingPurchase, "verified access did not clear the pending state")
            }
            model.reset()
        }
        do {
            let api = AccessAPI(), client = PurchaseClient(), model = SubscriptionModel(client: client)
            await model.load(api: api, includePlans: true)
            try require(!client.events.contains("restore"), "restoring purchases ran without a user action")
            api.value = state(active: true); await model.restore(api: api)
            try require(client.events.contains("restore") && model.access?.isActive == true && api.requests.last == true, "restore did not ask the server")
            model.reset()
        }
        do {
            let api = AccessAPI(), client = PurchaseClient(), model = SubscriptionModel(client: client)
            await model.load(api: api, includePlans: true)
            client.result = .cancelled
            // Multiple tap tasks may arrive before the serialized operation starts.
            let taps = (0..<10).map { _ in Task { await model.purchase("shield_monthly", api: api) } }
            for tap in taps { await tap.value }
            try require(client.events.filter { $0 == "purchase:shield_monthly" }.count == 1, "rapid taps opened multiple purchase sheets")
            await model.purchase("shield_monthly", api: api)
            try require(client.events.filter { $0 == "purchase:shield_monthly" }.count == 2, "a completed cancellation prevented a deliberate retry")
            let restores = (0..<10).map { _ in Task { await model.restore(api: api) } }
            for restore in restores { await restore.value }
            try require(client.events.filter { $0 == "restore" }.count == 1, "rapid taps queued duplicate restores")
            await model.restore(api: api)
            try require(client.events.filter { $0 == "restore" }.count == 2, "a completed restore prevented a deliberate retry")
            model.reset()
        }
        do {
            let api = AccessAPI(), client = PurchaseClient(), model = SubscriptionModel(client: client)
            api.error = URLError(.notConnectedToInternet); await model.load(api: api, includePlans: true)
            try require(model.error != nil && model.plans.isEmpty && client.events.isEmpty, "offline lookup opened the store")
            api.error = nil; client.failure = APIError.service(code: "subscriptions_unavailable", status: 503)
            await model.load(api: api, includePlans: true)
            try require(model.error != nil && !model.working && model.plans.isEmpty, "missing offer did not recover")
            client.failure = nil; await model.load(api: api, includePlans: true)
            try require(model.error == nil && model.plans.count == 2, "retry retained a stale error")
            model.reset()
        }
        do {
            let api = AccessAPI(), client = PurchaseClient(), model = SubscriptionModel(client: client)
            await model.load(api: api, includePlans: true); client.pausePurchase = true
            let purchase = Task { await model.purchase("shield_monthly", api: api) }
            while client.purchaseContinuation == nil { await Task.yield() }
            let requestsBeforeSwitch = api.requests.count
            model.reset(); api.value = state(id: secondID)
            let nextAccount = Task { await model.load(api: api, includePlans: true) }
            await Task.yield()
            try require(!client.events.contains("identify:\(secondID)"), "SDK account changed during the purchase")
            client.purchaseContinuation?.resume(returning: .purchased); client.purchaseContinuation = nil
            await purchase.value; await nextAccount.value
            try require(model.access?.revenueCat?.customerId == secondID && model.message == nil && !model.pendingPurchase, "late purchase contaminated the next account")
            try require(api.requests.count == requestsBeforeSwitch + 1, "old purchase synchronized against the new login")
            model.reset()
        }
        do {
            let api = AccessAPI(), client = PurchaseClient(), model = SubscriptionModel(client: client)
            var release: CheckedContinuation<ServiceAccessStatus, Never>?
            api.next = { await withCheckedContinuation { release = $0 } }
            let load = Task { await model.load(api: api, includePlans: true) }
            while release == nil { await Task.yield() }
            model.reset(); release?.resume(returning: state(active: true)); await load.value
            try require(model.access == nil && client.events.isEmpty && model.plans.isEmpty, "late lookup survived sign-out/deletion")
        }
        print("PASS: pilot isolation, old backend, localized plans, eligibility refresh, cancellation, pending purchase, rapid purchase/restore taps, deliberate retry, server verification, restore, offline retry, purchase/account switch and late-lookup fencing")
    }
}
