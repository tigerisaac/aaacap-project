import Foundation

struct ContactPhoneBackup: Codable, Sendable, Hashable {
    let contactID: String
    let givenName: String
    let familyName: String
    let organization: String
    let label: String?
    let value: String
}
