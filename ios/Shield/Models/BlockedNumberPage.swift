import Foundation

struct BlockedNumberPage: Decodable, Sendable {
    let items: [BlockedNumber]
    let nextCursor: String?
    let paginationVersion: Int?
}
