#if SHIELD_REVENUECAT_TEST_STORE && DEBUG && targetEnvironment(simulator)
import SwiftUI

struct RevenueCatSDKVerificationView: View {
    @State private var model = RevenueCatSDKVerificationModel()

    var body: some View {
        NavigationStack {
            List {
                Section("SDK verification only") {
                    Text(model.outcome).accessibilityIdentifier("sdk-outcome")
                    Text(model.entitlement).accessibilityIdentifier("sdk-entitlement")
                    Text(model.product).accessibilityIdentifier("sdk-product")
                    Text(model.identity).accessibilityIdentifier("sdk-identity")
                    Text("\(model.events)").accessibilityIdentifier("sdk-events")
                    Text("No Shield service is granted.")
                }
                ForEach(model.plans) { plan in
                    Section(plan.title) {
                        Text("\(plan.price) / \(plan.billingPeriod)")
                            .accessibilityIdentifier("sdk-price-\(plan.billingPeriod)")
                        if let equivalent = plan.monthlyEquivalent {
                            Text(equivalent).accessibilityIdentifier("sdk-monthly-equivalent")
                        }
                        Button("Buy \(plan.billingPeriod)") { Task { await model.purchase(plan.id) } }
                            .accessibilityIdentifier("sdk-buy-\(plan.billingPeriod)")
                            .disabled(model.working)
                    }
                }
                Button("Restore") { Task { await model.restore() } }.disabled(model.working)
                Button("Switch account") { Task { await model.switchAccount() } }.disabled(model.working)
                Button("Reload plans") { Task { await model.reloadPlans() } }.disabled(model.working)
            }
            .navigationTitle("RevenueCat QA")
            .task { await model.start() }
        }
    }
}
#endif
