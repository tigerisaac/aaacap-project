import Foundation

struct AuthTokens: Codable, Sendable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
}
