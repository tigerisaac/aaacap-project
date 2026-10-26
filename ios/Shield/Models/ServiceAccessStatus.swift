import Foundation

struct ServiceAccessStatus: Decodable, Sendable {
    let audience: String
    let status: String
    let purchaseAllowed: Bool
    let hasSubscription: Bool
    let expiresAt: Date?
    let accessUntil: Date?
    let willRenew: Bool
    let billingIssue: Bool
    let revenueCat: RevenueCatConfiguration?

    var isPilot: Bool { audience == "pilot" }
    var isPublic: Bool { audience == "public" }
    var isActive: Bool { status == "active" }

    struct RevenueCatConfiguration: Decodable, Sendable, Equatable {
        let customerId: String
        let publicSDKKey: String
        let entitlementId: String
        let offeringId: String
        let monthlyProductId: String
        let annualProductId: String
        let trialOfferingId: String?
        let trialMonthlyProductId: String?
        let trialAnnualProductId: String?

        init(customerId: String, publicSDKKey: String, entitlementId: String, offeringId: String,
             monthlyProductId: String, annualProductId: String, trialOfferingId: String? = nil,
             trialMonthlyProductId: String? = nil, trialAnnualProductId: String? = nil) {
            self.customerId = customerId; self.publicSDKKey = publicSDKKey; self.entitlementId = entitlementId
            self.offeringId = offeringId; self.monthlyProductId = monthlyProductId; self.annualProductId = annualProductId
            self.trialOfferingId = trialOfferingId; self.trialMonthlyProductId = trialMonthlyProductId
            self.trialAnnualProductId = trialAnnualProductId
        }

        var allowedProductIds: [String] {
            [monthlyProductId, annualProductId] + [trialMonthlyProductId].compactMap { $0 }
        }

        /// Only server-approved offerings and complete monthly/yearly pairs can reach the paywall.
        func products(forOffering identifier: String) -> (monthly: String, annual: String)? {
            if identifier == offeringId { return (monthlyProductId, annualProductId) }
            guard identifier == trialOfferingId, let monthly = trialMonthlyProductId else { return nil }
            return (monthly, annualProductId)
        }
    }
}
