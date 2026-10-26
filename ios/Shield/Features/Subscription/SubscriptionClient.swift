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
    var hasFreeWeek = false
    var amount: Decimal? = nil
    var currencyCode: String? = nil

    /// Compare regular recurring prices in the same currency, never formatted strings or trial prices.
    func annualSavingsPercent(comparedTo monthly: SubscriptionPlan) -> Int? {
        guard billingPeriod == "year", monthly.billingPeriod == "month",
              let currencyCode, currencyCode == monthly.currencyCode,
              let amount, let monthlyAmount = monthly.amount, amount > 0, monthlyAmount > 0 else { return nil }
        var fraction = (1 - amount / (monthlyAmount * 12)) * 100
        var rounded = Decimal()
        NSDecimalRound(&rounded, &fraction, 0, .down)
        guard let percent = Int(rounded.description), percent > 0, percent < 100 else { return nil }
        return percent
    }
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
