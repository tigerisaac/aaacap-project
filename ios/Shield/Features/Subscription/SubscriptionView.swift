import SwiftUI
import StoreKit

struct SubscriptionView: View {
    @Environment(AppState.self) private var app
    /// Shown before the main app for a public account that hasn't subscribed yet.
    var isFirstScreen = false
    @State private var managing = false

    private var showsOffer: Bool { app.subscription.access?.purchaseAllowed == true && !app.subscription.plans.isEmpty }

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
                    if !showsOffer {
                        ShieldSection("Your Shield access") {
                            Text(access.isActive ? "Your subscription is active." : "Shield checks unfamiliar calls. You choose whether to answer.")
                            if access.isActive, let end = access.billingIssue ? access.accessUntil : access.expiresAt {
                                Text(access.willRenew && !access.billingIssue ? "Renews \(end.formatted(date: .abbreviated, time: .omitted))."
                                     : "Available through \(end.formatted(date: .abbreviated, time: .omitted)).")
                            }
                            if access.billingIssue { Text("Apple needs you to check your payment details. Open Manage subscription for help.") }
                        }
                    }
                    if access.isActive, app.isOwner {
                        ShieldGroup {
                            NavigationLink { ForwardingSetupView() } label: {
                                ActionRow(title: "Continue phone setup", symbol: "phone.badge.plus")
                            }
                        }
                    }
                    if access.purchaseAllowed {
                        if showsOffer {
                            SubscriptionOfferView()
                                .listRowBackground(Color.clear)
                                .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))
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
            if !showsOffer { ShieldGroup { SubscriptionFeedbackView() } }
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
            if isFirstScreen { AccountActionsGroup(showsAccess: false) }
        }
        .shieldListStyle().navigationTitle(isFirstScreen ? "Choose a plan" : "Shield access").navigationBarTitleDisplayMode(.inline)
        .task { if !app.isPreview { await app.subscription.load(api: app.api, includePlans: true) } }
        .manageSubscriptionsSheet(isPresented: $managing)
        .onChange(of: managing) { _, showing in
            if !showing { Task { await app.subscription.synchronize(api: app.api) } }
        }
    }
}
