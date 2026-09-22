import Foundation
@preconcurrency import IdentityLookup

final class MessageFilterExtension: ILMessageFilterExtension, ILMessageFilterQueryHandling {
    func handle(_ queryRequest: ILMessageFilterQueryRequest, context: ILMessageFilterExtensionContext,
                completion: @escaping (ILMessageFilterQueryResponse) -> Void) {
        // Only iOS sends eligible unknown-sender queries. No inbox access, direct networking, or shared storage.
        // IdentityLookup's Objective-C contract explicitly permits asynchronous completion,
        // but does not annotate this callback as Sendable. Keep that bridge local and immutable.
        nonisolated(unsafe) let finish = completion
        context.deferQueryRequestToNetwork { networkResponse, _ in
            let response = ILMessageFilterQueryResponse()
            response.action = .none
            if let data = networkResponse?.data,
               let decision = try? JSONDecoder().decode(NetworkDecision.self, from: data), decision.action == "filter" {
                response.action = .junk
            }
            finish(response)
        }
    }
}

private struct NetworkDecision: Decodable {
    let action: String
}
