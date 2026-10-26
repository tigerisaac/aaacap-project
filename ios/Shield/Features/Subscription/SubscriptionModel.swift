import Foundation
import Observation

/// Account identity comes from Shield's authenticated backend. A server lookup, never an SDK success,
/// determines whether Shield can activate telephone service. Operations cannot cross account changes.
@MainActor @Observable
final class SubscriptionModel {
    private(set) var access: ServiceAccessStatus?
    private(set) var plans: [SubscriptionPlan] = []
    private(set) var working = false
    private(set) var pendingPurchase = false
    private(set) var error: String?
    private(set) var message: String?
    private(set) var workingTitle = "Checking your access…"
    private(set) var errorTitle = "Your access couldn’t be checked"
    private var failedOperation = "load"
    var errorActionTitle: String {
        failedOperation == "restore" ? "Try restoring again" : failedOperation == "purchase" ? "Check purchase status" : "Try again"
    }
    private let client: any SubscriptionClient
    private var generation = 0
    private var storeOperationRequested = false
    private var operation: Task<Void, Never>?
    private var updates: Task<Void, Never>?

    init(client: any SubscriptionClient) { self.client = client }
    var showsAccess: Bool { access?.isPublic == true || access?.isPilot == true || error != nil }

    func reset() {
        generation += 1
        updates?.cancel(); updates = nil
        access = nil; plans = []; pendingPurchase = false; error = nil; message = nil
        // An Apple sheet may still be completing. Let that operation finish against its original RevenueCat ID;
        // generation checks discard its result, and the next account waits before identifying itself.
    }

    private func serialize(kind: String = "load", _ action: @escaping @MainActor (Int) async throws -> Void) async {
        let previous = operation, current = generation
        let task = Task { @MainActor [weak self] in
            await previous?.value
            guard let self, self.generation == current, !Task.isCancelled else { return }
            self.working = true; self.error = nil
            self.workingTitle = kind == "purchase" ? "Confirming your purchase…" : kind == "restore" ? "Restoring your purchases…" : "Checking your access…"
            defer { self.working = false }
            do { try await action(current) }
            catch is CancellationError { }
            catch {
                guard self.generation == current else { return }
                self.error = error.localizedDescription
                self.failedOperation = kind
                self.errorTitle = kind == "purchase" ? "Your purchase couldn’t be confirmed" : kind == "restore" ? "Your purchases couldn’t be restored" : "Your access couldn’t be checked"
                if kind == "purchase", self.pendingPurchase {
                    self.message = "Your purchase went through. We still need to confirm your Shield access."
                    self.errorTitle = "Check your purchase status"
                }
            }
        }
        operation = task
        await task.value
    }

    func load(api: any ServiceAccessAPI, includePlans: Bool = false) async {
        await serialize { [self] current in
            let next: ServiceAccessStatus
            do { next = try await api.serviceAccess(refresh: false) }
            catch APIError.service(_, let status) where status == 404 {
                guard current == generation else { return }
                access = nil; plans = []; return
            }
            guard current == generation else { return }
            access = next
            if next.isActive { pendingPurchase = false }
            guard next.isPublic, let configuration = next.revenueCat else { plans = []; return }
            try await identify(configuration, api: api, generation: current)
            guard current == generation else { return }
            if includePlans && next.purchaseAllowed {
                let choices = try await client.plans(configuration)
                guard current == generation else { throw CancellationError() }
                plans = choices
            } else if !next.purchaseAllowed { plans = [] }
        }
    }

    private func identify(_ configuration: ServiceAccessStatus.RevenueCatConfiguration, api: any ServiceAccessAPI, generation current: Int) async throws {
        try await client.identify(configuration)
        guard current == generation else { throw CancellationError() }
        if updates == nil {
            let changes = client.changes
            updates = Task { @MainActor [weak self] in
                for await _ in changes {
                    guard !Task.isCancelled, let self, self.generation == current else { return }
                    await self.synchronize(api: api, showResult: false)
                }
            }
        }
    }

    func purchase(_ id: String, api: any ServiceAccessAPI) async {
        guard !working, !pendingPurchase, !storeOperationRequested else { return }
        // Claim the user action before yielding to the serialized task. Rapid taps
        // can otherwise queue another store sheet before `working` becomes true.
        storeOperationRequested = true
        defer { storeOperationRequested = false }
        await serialize(kind: "purchase") { [self] current in
            message = nil
            let fresh = try await api.serviceAccess(refresh: true)
            guard current == generation else { throw CancellationError() }
            access = fresh
            guard fresh.isPublic, fresh.purchaseAllowed, let configuration = fresh.revenueCat,
                  plans.contains(where: { $0.id == id }), configuration.allowedProductIds.contains(id) else {
                plans = []
                throw APIError.service(code: "service_access_required", status: 409)
            }
            try await identify(configuration, api: api, generation: current)
            guard current == generation else { throw CancellationError() }
            let result = try await client.purchase(id)
            guard current == generation else { throw CancellationError() }
            switch result {
            case .cancelled: return
            case .pending:
                pendingPurchase = true
                message = "Your purchase is waiting for approval. You won’t need to buy it again."
            case .purchased:
                pendingPurchase = true
                message = "Your purchase is complete. Checking your access…"
                try await syncResult(api: api, generation: current, showResult: true)
            }
        }
    }

    func restore(api: any ServiceAccessAPI) async {
        guard !working, !storeOperationRequested else { return }
        storeOperationRequested = true
        defer { storeOperationRequested = false }
        await serialize(kind: "restore") { [self] current in
            message = nil
            let fresh = try await api.serviceAccess(refresh: false)
            guard current == generation else { throw CancellationError() }
            access = fresh
            guard fresh.isPublic, let configuration = fresh.revenueCat else { throw APIError.service(code: "subscriptions_unavailable", status: 503) }
            try await identify(configuration, api: api, generation: current)
            guard current == generation else { throw CancellationError() }
            try await client.restore()
            guard current == generation else { throw CancellationError() }
            try await syncResult(api: api, generation: current, showResult: true)
        }
    }

    func synchronize(api: any ServiceAccessAPI, showResult: Bool = true) async {
        await serialize { [self] current in
            try await syncResult(api: api, generation: current, showResult: showResult)
        }
    }

    func retry(api: any ServiceAccessAPI) async {
        switch failedOperation {
        case "restore": await restore(api: api)
        case "purchase": await synchronize(api: api)
        default: await load(api: api, includePlans: true)
        }
    }

    private func syncResult(api: any ServiceAccessAPI, generation current: Int, showResult: Bool) async throws {
        let fresh = try await api.serviceAccess(refresh: true)
        guard current == generation else { throw CancellationError() }
        access = fresh
        if fresh.isActive { plans = []; pendingPurchase = false }
        if showResult { message = fresh.isActive ? "Your Shield access is ready." : "No active subscription is confirmed yet. If Apple is still processing your purchase, check again shortly." }
    }

    #if DEBUG && targetEnvironment(simulator)
    /// Layout fixtures never initialize the SDK or make network requests.
    func preview(_ state: String) {
        reset()
        let pilot = state.hasPrefix("pilot"), active = ["pilot", "subscribed", "billing-issue"].contains(state)
        access = .init(audience: pilot ? "pilot" : "public", status: active ? "active" : state == "pilot-expired" ? "expired" : state == "unavailable" ? "unavailable" : "inactive",
            purchaseAllowed: !pilot && !active && state != "unavailable", hasSubscription: ["subscribed", "billing-issue"].contains(state),
            expiresAt: active ? .now.addingTimeInterval(86400 * (state == "billing-issue" ? -1 : 30)) : nil,
            accessUntil: active ? .now.addingTimeInterval(86400 * (state == "billing-issue" ? 2 : 30)) : nil, willRenew: !pilot && active, billingIssue: state == "billing-issue",
            revenueCat: pilot ? nil : .init(customerId: "22fce9c6-5c0f-4c40-b600-73710aaad7a1", publicSDKKey: "appl_synthetic",
                entitlementId: "shield_access", offeringId: "default", monthlyProductId: "shield_monthly", annualProductId: "shield_annual"))
        if access?.purchaseAllowed == true {
            plans = [.init(id: "shield_monthly", title: "Monthly", price: "$9.99", billingPeriod: "month", monthlyEquivalent: nil, amount: 9.99, currencyCode: "USD"),
                .init(id: "shield_annual", title: "Yearly", price: "$99.99", billingPeriod: "year", monthlyEquivalent: "$8.33", amount: 99.99, currencyCode: "USD")]
        }
        if state == "trial" {
            plans = [.init(id: "shield_monthly_trial", title: "Monthly", price: "$9.99", billingPeriod: "month", monthlyEquivalent: nil, hasFreeWeek: true, amount: 9.99, currencyCode: "USD"),
                .init(id: "shield_annual", title: "Yearly", price: "$99.99", billingPeriod: "year", monthlyEquivalent: "$8.33", amount: 99.99, currencyCode: "USD")]
        }
        if state == "pending" { pendingPurchase = true; message = "Your purchase is waiting for approval. You won’t need to buy it again." }
        if state == "error" { plans = []; error = "Your connection was interrupted. Please try again." }
    }
    #endif
}
