import Foundation

struct PhoneChallenge: Decodable, Sendable {
    let challenge: String
    let expiresIn: Int
    let resendAfter: Int
}
