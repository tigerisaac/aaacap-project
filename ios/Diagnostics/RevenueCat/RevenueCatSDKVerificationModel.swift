#if SHIELD_REVENUECAT_TEST_STORE && DEBUG && targetEnvironment(simulator)
import Foundation
import Observation
import RevenueCat

@MainActor @Observable
final class RevenueCatSDKVerificationModel {
    private(set) var plans: [SubscriptionPlan] = []
    private(set) var outcome = "Starting"
    private(set) var entitlement = "Unknown"
    private(set) var product = "None"
    private(set) var events = 0
    private(set) var working = false
    private(set) var identity = "Primary"
    private let client = RevenueCatClient()
    private var listener: Task<Void, Never>?
    private var primary: ServiceAccessStatus.RevenueCatConfiguration?
    private var secondary: ServiceAccessStatus.RevenueCatConfiguration?

    func start() async {
        await perform {
            let environment = ProcessInfo.processInfo.environment
            guard let key = environment["SHIELD_RC_TEST_KEY"], key.hasPrefix("test_"),
                  let customer = environment["SHIELD_RC_CUSTOMER"], UUID(uuidString: customer) != nil,
                  let alternate = environment["SHIELD_RC_SECOND_CUSTOMER"], UUID(uuidString: alternate) != nil else {
                throw APIError.invalidResponse
            }
            func config(_ id: String) -> ServiceAccessStatus.RevenueCatConfiguration {
                .init(customerId: id, publicSDKKey: key, entitlementId: "shield_qa_access",
                      offeringId: "shield_sdk_qa", monthlyProductId: "shield_qa_monthly", annualProductId: "shield_qa_annual")
            }
            let configuration = config(customer)
            self.primary = configuration; self.secondary = config(alternate)
            try await self.client.identify(configuration)
            self.listener = Task { @MainActor [weak self, client = self.client] in
                for await _ in client.changes {
                    guard !Task.isCancelled, let self else { return }
                    self.events += 1
                }
            }
            self.plans = try await self.client.plans(configuration)
            try await self.refreshInfo()
            self.outcome = "Ready"
        }
    }

    func purchase(_ id: String) async {
        await perform {
            let result = try await self.client.purchase(id)
            switch result {
            case .purchased: self.outcome = "Purchased"
            case .cancelled: self.outcome = "Cancelled"
            case .pending: self.outcome = "Pending"
            }
            try await self.refreshInfo()
        }
    }

    func restore() async {
        await perform {
            try await self.client.restore()
            try await self.refreshInfo()
            self.outcome = "Restored"
        }
    }

    func switchAccount() async {
        await perform {
            guard let configuration = self.identity == "Primary" ? self.secondary : self.primary else {
                throw APIError.invalidResponse
            }
            try await self.client.identify(configuration)
            self.identity = self.identity == "Primary" ? "Secondary" : "Primary"
            // Leave visible plan IDs in place to exercise the adapter's stale-package fence.
            try await self.refreshInfo()
            self.outcome = "Switched"
        }
    }

    func reloadPlans() async {
        await perform {
            guard let configuration = self.identity == "Primary" ? self.primary : self.secondary else {
                throw APIError.invalidResponse
            }
            self.plans = try await self.client.plans(configuration)
            self.outcome = "Ready"
        }
    }

    private func refreshInfo() async throws {
        let info = try await Purchases.shared.customerInfo(fetchPolicy: .fetchCurrent)
        if let active = info.entitlements.active["shield_qa_access"] {
            guard active.isSandbox else { throw APIError.invalidResponse }
            entitlement = "Active sandbox"; product = active.productIdentifier
        } else {
            entitlement = "Inactive"; product = "None"
        }
    }

    private func perform(_ action: () async throws -> Void) async {
        guard !working else { return }
        working = true; outcome = "Working"
        defer { working = false }
        do { try await action() }
        catch { outcome = error.localizedDescription }
    }
}
#endif
