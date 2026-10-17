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
    }
}
