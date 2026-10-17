import SwiftUI
import StoreKit

struct SubscriptionView: View {
    @Environment(AppState.self) private var app
    @State private var managing = false

    var body: some View {
        List {
            if let access = app.subscription.access {
                if access.isPilot {
                    ShieldSection("Your Shield access") {
                        Text(access.isActive ? "Your pilot access is active." : access.status == "awaiting_activation"
                             ? "Your access starts when phone setup passes its checks." : "Contact Shield to arrange the next steps for your phone.")
                        if let end = access.accessUntil { Text("Available through \(end.formatted(date: .abbreviated, time: .omitted)).") }
                    } footer: { Text("Contact Shield for help restoring ordinary calls.") }
                } else if access.isPublic {
                    ShieldSection("Your Shield access") {
                        Text(access.isActive ? "Your subscription is active." : "Shield checks unfamiliar calls. You choose whether to answer.")
                        if access.isActive, let end = access.billingIssue ? access.accessUntil : access.expiresAt {
                            Text(access.willRenew && !access.billingIssue ? "Renews \(end.formatted(date: .abbreviated, time: .omitted))."
                                 : "Available through \(end.formatted(date: .abbreviated, time: .omitted)).")
                        }
                        if access.billingIssue { Text("Apple needs you to check your payment details. Open Manage subscription for help.") }
                    }
                    if access.purchaseAllowed {
                        ForEach(app.subscription.plans) { plan in
                            ShieldSection(plan.title) {
                                Text("\(plan.price) / \(plan.billingPeriod)").font(.title2.bold())
                                if let monthly = plan.monthlyEquivalent { Text("Equivalent to \(monthly) per month. Billed in full once a year.") }
                                Button {
                                    Task { await app.subscription.purchase(plan.id, api: app.api) }
                                } label: { ShieldActionLabel(title: "Choose \(plan.title.lowercased())") }
                                    .shieldPrimaryButton().disabled(app.subscription.working || app.subscription.pendingPurchase || app.isPreview)
                                    .accessibilityIdentifier("subscribe-\(plan.billingPeriod)")
                            }
                        }
                        if !app.subscription.plans.isEmpty {
                            ShieldGroup { Text("Payment is charged to your Apple Account when you confirm. Your subscription renews automatically unless cancelled at least 24 hours before the current period ends. You can manage or cancel it in your Apple Account settings.") }
                        }
                    } else if !access.isActive {
                        ShieldGroup { Text(access.status == "unavailable" ? "Subscriptions aren’t available yet. Contact Shield for help with your access."
                            : "We need to confirm your phone and carrier setup before a subscription is available. Contact Shield for help.") }
                    }
                    if access.revenueCat != nil {
                        ShieldGroup {
                            Button("Restore purchases") { Task { await app.subscription.restore(api: app.api) } }
                                .disabled(app.subscription.working || app.isPreview)
                            if access.hasSubscription { Button("Manage subscription") { managing = true }.disabled(app.isPreview) }
                        }
                    }
                }
            }
            if app.subscription.working { ShieldGroup { ShieldLoadingView(title: "Checking your access…") } }
            if let message = app.subscription.message { ShieldGroup { Text(message) } }
            if let error = app.subscription.error {
                ShieldGroup { ShieldLoadFailure(title: "Your access couldn’t be checked", detail: error) {
                    if !app.isPreview { Task { await app.subscription.load(api: app.api, includePlans: true) } }
                } }
            }
            ShieldGroup {
                if let email = app.service?.supportEmail, let url = URL(string: "mailto:\(email)") {
                    Link("Contact Shield", destination: url)
                }
                if let base = app.configuration.baseURL {
                    Link("Privacy", destination: base.appending(path: "privacy"))
                    Link("How Shield works", destination: base.appending(path: "service-info"))
                }
                Link("Terms of use", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
                Button("Check access again") { Task { await app.subscription.load(api: app.api, includePlans: true) } }
                    .disabled(app.subscription.working || app.isPreview)
            }
        }
        .shieldListStyle().navigationTitle("Shield access").navigationBarTitleDisplayMode(.inline)
        .task { if !app.isPreview { await app.subscription.load(api: app.api, includePlans: true) } }
        .manageSubscriptionsSheet(isPresented: $managing)
        .onChange(of: managing) { _, showing in
            if !showing { Task { await app.subscription.synchronize(api: app.api) } }
        }
    }
}
