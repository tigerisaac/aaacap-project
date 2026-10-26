import SwiftUI

/// Store-backed prices and eligibility, with a single explicit purchase decision.
struct SubscriptionOfferView: View {
    @Environment(AppState.self) private var app
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var selectedID: String?
    @State private var explainsPreview = false

    private var selected: SubscriptionPlan? {
        app.subscription.plans.first { $0.id == selectedID }
            ?? app.subscription.plans.first { $0.billingPeriod == "month" }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 10) {
                Label("SHIELD", systemImage: "checkmark.shield.fill")
                    .font(.subheadline.weight(.semibold)).foregroundStyle(ShieldTheme.action)
                Text("Your calls.\nYour choice.")
                    .font(ShieldTheme.Typography.display.weight(.semibold))
                    .accessibilityAddTraits(.isHeader)
                Text("Shield checks unfamiliar calls before you decide to answer.")
                    .foregroundStyle(ShieldTheme.secondaryText)
            }
            VStack(spacing: 12) {
                ForEach(app.subscription.plans) { plan in
                    planOption(plan)
                }
            }
            if let selected {
                VStack(alignment: .leading, spacing: 12) {
                    SubscriptionFeedbackView()
                    Button {
                        guard !app.isPreview else { explainsPreview = true; return }
                        Task { await app.subscription.purchase(selected.id, api: app.api) }
                    } label: {
                        ShieldActionLabel(title: purchaseTitle(selected), isWorking: app.subscription.working)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .tint(ShieldTheme.action)
                    .buttonBorderShape(typeSize.isAccessibilitySize ? .roundedRectangle(radius: 20) : .capsule)
                    .disabled(app.subscription.working || app.subscription.pendingPurchase)
                    .accessibilityIdentifier("subscribe-\(selected.billingPeriod)")
                    .alert("Sample app", isPresented: $explainsPreview) { Button("OK", role: .cancel) {} } message: { Text("This preview cannot make purchases. Your Apple account has not been charged.") }
                    Text(renewalTerms(selected))
                        .font(.footnote).foregroundStyle(ShieldTheme.secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("subscription-renewal-terms")
                }
            }
            Label("After subscribing, finish phone setup to start call checks.", systemImage: "phone.badge.plus")
                .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 12)
        .foregroundStyle(ShieldTheme.ink)
    }

    private func planOption(_ plan: SubscriptionPlan) -> some View {
        let isSelected = selected?.id == plan.id
        return Button { selectedID = plan.id } label: {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title2).foregroundStyle(isSelected ? ShieldTheme.action : ShieldTheme.secondaryText)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 6) {
                    ViewThatFits(in: .horizontal) {
                        HStack { Text(plan.title).font(.headline); Spacer(minLength: 8); badge(plan) }
                        VStack(alignment: .leading, spacing: 6) { Text(plan.title).font(.headline); badge(plan) }
                    }
                    Text(plan.hasFreeWeek ? "Then \(plan.price) / \(plan.billingPeriod)" : "\(plan.price) / \(plan.billingPeriod)")
                        .font(.title3.weight(.semibold)).fixedSize(horizontal: false, vertical: true)
                    if let monthly = plan.monthlyEquivalent {
                        Text("\(monthly) / month, billed yearly")
                            .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                            .lineLimit(nil).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(isSelected ? ShieldTheme.action.opacity(0.07) : ShieldTheme.card, in: .rect(cornerRadius: 18))
            .overlay { RoundedRectangle(cornerRadius: 18).strokeBorder(isSelected ? ShieldTheme.action : ShieldTheme.fieldBorder, lineWidth: isSelected ? 2 : 1) }
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .disabled(app.subscription.working || app.subscription.pendingPurchase)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityIdentifier("plan-\(plan.billingPeriod)")
    }

    @ViewBuilder private func badge(_ plan: SubscriptionPlan) -> some View {
        if plan.hasFreeWeek {
            badgeText("1 week free")
        } else if let monthly = app.subscription.plans.first(where: { $0.billingPeriod == "month" }),
                  let savings = plan.annualSavingsPercent(comparedTo: monthly) {
            badgeText("Save \(savings)%")
                .accessibilityLabel("Save \(savings) percent compared with 12 regular monthly payments")
                .accessibilityIdentifier("annual-savings")
        }
    }

    private func badgeText(_ text: String) -> some View {
        Text(text).font(.subheadline.weight(.semibold))
            .foregroundStyle(ShieldTheme.action)
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(ShieldTheme.action.opacity(0.1), in: .capsule)
            .fixedSize(horizontal: false, vertical: true)
    }

    private func purchaseTitle(_ plan: SubscriptionPlan) -> String {
        if app.subscription.pendingPurchase { return "Waiting for confirmation" }
        return plan.hasFreeWeek ? "Start my free week" : "Start \(plan.title.lowercased()) plan"
    }

    private func renewalTerms(_ plan: SubscriptionPlan) -> String {
        if plan.hasFreeWeek {
            return "1 week free, then \(plan.price) per month. Renews automatically. Cancel at least 24 hours before the trial ends to avoid the first charge. Apple confirms eligibility. Manage or cancel in Apple Account settings."
        }
        if plan.billingPeriod == "month" {
            return "\(plan.price) per month. Apple confirms any eligible offer before purchase. Renews automatically. Cancel at least 24 hours before renewal in Apple Account settings."
        }
        return "\(plan.price) charged now, then every \(plan.billingPeriod). Renews automatically. Cancel at least 24 hours before renewal in Apple Account settings."
    }
}
