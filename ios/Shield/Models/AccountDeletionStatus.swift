import Foundation

struct AccountDeletionStatus: Decodable, Sendable {
    struct Phone: Decodable, Identifiable, Hashable, Sendable {
        let id: UUID
        let name: String
        let restorationRequired: Bool
    }
    let restorationRequired: Bool
    let phones: [Phone]
    let subscriptionAudience: String?

    init(restorationRequired: Bool, phones: [Phone], subscriptionAudience: String? = nil) {
        self.restorationRequired = restorationRequired
        self.phones = phones
        self.subscriptionAudience = subscriptionAudience
    }
}
