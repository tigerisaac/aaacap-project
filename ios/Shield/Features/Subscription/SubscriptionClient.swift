import Foundation

protocol ServiceAccessAPI: Sendable {
    func serviceAccess(refresh: Bool) async throws -> ServiceAccessStatus
}

struct SubscriptionPlan: Identifiable, Sendable {
    let id: String
    let title: String
    let price: String
    let billingPeriod: String
    let monthlyEquivalent: String?
}

enum SubscriptionPurchaseResult { case purchased, cancelled, pending }

/// The SDK owns transactions. Shield's server independently decides service access.
@MainActor
protocol SubscriptionClient: AnyObject {
    func identify(_ configuration: ServiceAccessStatus.RevenueCatConfiguration) async throws
    func plans(_ configuration: ServiceAccessStatus.RevenueCatConfiguration) async throws -> [SubscriptionPlan]
    func purchase(_ productID: String) async throws -> SubscriptionPurchaseResult
    func restore() async throws
    var changes: AsyncStream<Void> { get }
}
