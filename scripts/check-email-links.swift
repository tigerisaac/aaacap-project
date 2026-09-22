import Foundation

@main
enum CheckEmailLinks {
    static func main() {
        let host = "shield-test-project.firebaseapp.com"
        let code = "synthetic_code_123456"
        let direct = "https://\(host)/__/auth/action?mode=signIn&oobCode=\(code)&apiKey=public-test-key"
        guard let directURL = URL(string: direct) else { fatalError("Invalid fixture") }
        precondition(EmailSignInLink.code(from: directURL, allowedHost: host) == code)
        var nested = URLComponents(string: "https://\(host)/__/auth/links")
        nested?.queryItems = [URLQueryItem(name: "link", value: direct)]
        guard let nestedURL = nested?.url else { fatalError("Invalid fixture") }
        precondition(EmailSignInLink.code(from: nestedURL, allowedHost: host) == code)
        let rejected = [
            direct.replacing("https:", with: "http:"),
            direct.replacing(host, with: "untrusted.example"),
            direct.replacing("/__/auth/action", with: "/unrelated"),
            direct.replacing("mode=signIn", with: "mode=resetPassword"),
            direct + "&oobCode=duplicate_code_12345",
            direct.replacing(code, with: "short"),
            direct.replacing(code, with: "bad%2Fcode_123456789"),
            direct.replacing("https://", with: "https://user@"),
            direct.replacing(host, with: host + ":8443")
        ]
        for value in rejected {
            guard let url = URL(string: value) else { fatalError("Invalid fixture") }
            precondition(EmailSignInLink.code(from: url, allowedHost: host) == nil)
        }
        nested?.queryItems = [URLQueryItem(name: "link", value: direct.replacing(host, with: "untrusted.example"))]
        guard let foreignLink = nested?.url else { fatalError("Invalid fixture") }
        precondition(EmailSignInLink.code(from: foreignLink, allowedHost: host) == nil)
        print("Email sign-in link checks passed: 2 accepted, 10 rejected.")
    }
}
