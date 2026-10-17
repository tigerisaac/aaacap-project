import Foundation
import RevenueCat

@MainActor
final class RevenueCatClient: SubscriptionClient {
    private var configuredKey: String?
    private var packages: [String: Package] = [:]

    func identify(_ configuration: ServiceAccessStatus.RevenueCatConfiguration) async throws {
        #if SHIELD_REVENUECAT_TEST_STORE && DEBUG && targetEnvironment(simulator)
        // Only the separate SDK verification build defines this flag. That build
        // accepts Test Store keys exclusively, so it cannot make an Apple purchase.
        let validKey = configuration.publicSDKKey.hasPrefix("test_")
        #else
        let validKey = configuration.publicSDKKey.hasPrefix("appl_")
        #endif
        guard validKey, UUID(uuidString: configuration.customerId) != nil else { throw APIError.invalidResponse }
        if !Purchases.isConfigured {
            Purchases.logLevel = .error
            Purchases.configure(withAPIKey: configuration.publicSDKKey, appUserID: configuration.customerId)
            configuredKey = configuration.publicSDKKey
        } else {
            guard configuredKey == configuration.publicSDKKey else { throw APIError.service(code: "subscription_configuration_changed", status: 409) }
            if Purchases.shared.appUserID != configuration.customerId {
                packages = [:]
                do { _ = try await Purchases.shared.logIn(configuration.customerId) }
                catch { throw readable(error) }
            }
        }
    }

    func plans(_ configuration: ServiceAccessStatus.RevenueCatConfiguration) async throws -> [SubscriptionPlan] {
        let offerings: Offerings
        do { offerings = try await Purchases.shared.offerings() }
        catch { throw readable(error) }
        guard let offering = offerings.all[configuration.offeringId] else { throw APIError.service(code: "subscriptions_unavailable", status: 503) }
        let choices = [(configuration.monthlyProductId, "Monthly", "month", SubscriptionPeriod.Unit.month),
                       (configuration.annualProductId, "Yearly", "year", SubscriptionPeriod.Unit.year)]
        var next: [SubscriptionPlan] = [], nextPackages: [String: Package] = [:]
        for (id, title, period, unit) in choices {
            guard let package = offering.availablePackages.first(where: { $0.storeProduct.productIdentifier == id }),
                  package.storeProduct.subscriptionPeriod?.value == 1,
                  package.storeProduct.subscriptionPeriod?.unit == unit else { throw APIError.service(code: "subscriptions_unavailable", status: 503) }
            next.append(.init(id: id, title: title, price: package.localizedPriceString, billingPeriod: period,
                              monthlyEquivalent: unit == .year ? package.storeProduct.localizedPricePerMonth : nil))
            nextPackages[id] = package
        }
        packages = nextPackages
        return next
    }

    func purchase(_ productID: String) async throws -> SubscriptionPurchaseResult {
        guard let package = packages[productID] else { throw APIError.service(code: "subscriptions_unavailable", status: 503) }
        do {
            let result = try await Purchases.shared.purchase(package: package)
            return result.userCancelled ? .cancelled : .purchased
        } catch {
            switch error as? RevenueCat.ErrorCode {
            case .purchaseCancelledError: return .cancelled
            case .paymentPendingError: return .pending
            default: throw readable(error)
            }
        }
    }

    func restore() async throws {
        do { _ = try await Purchases.shared.restorePurchases() }
        catch { throw readable(error) }
    }

    var changes: AsyncStream<Void> {
        AsyncStream { continuation in
            let task = Task { @MainActor in
                for await _ in Purchases.shared.customerInfoStream {
                    guard !Task.isCancelled else { break }
                    continuation.yield(())
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    private func readable(_ error: Error) -> APIError {
        if let code = error as? RevenueCat.ErrorCode,
           [.receiptAlreadyInUseError, .receiptInUseByOtherSubscriberError, .purchaseBelongsToOtherUser].contains(code) {
            return .service(code: "subscription_other_account", status: 409)
        }
        return .service(code: "subscription_store_unavailable", status: 503)
    }
}
