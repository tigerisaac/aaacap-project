import SwiftUI

/// A signed-in number Shield doesn't know yet. With public setup available it starts with the carrier check;
/// otherwise it explains how to arrange assisted setup.
struct JoinView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        NavigationStack {
            if !model.isLoading, model.contextError == nil, model.service?.publicEnrollmentSupported == true {
                PublicEnrollmentView(isFirstScreen: true)
            } else {
                List {
                    if model.isLoading {
                        ShieldGroup { ShieldLoadingView(title: "Getting your calls…") }
                    } else if let error = model.contextError {
                        ShieldGroup {
                            ShieldLoadFailure(title: "Your account couldn’t load", detail: error) { Task { await model.refresh() } }
                        }
                    } else {
                        ShieldPageHeader {
                            VStack(alignment: .leading, spacing: ShieldTheme.Spacing.compact) {
                                Text("Welcome to Shield").shieldPageHeading().accessibilityAddTraits(.isHeader)
                                Text("Your phone isn’t connected yet. Contact Shield to set it up.")
                                    .foregroundStyle(ShieldTheme.secondaryText).fixedSize(horizontal: false, vertical: true)
                            }.padding(.vertical, ShieldTheme.Spacing.compact)
                        }
                        if let email = model.service?.supportEmail, let url = URL(string: "mailto:\(email)") {
                            ShieldGroup {
                                Link(destination: url) { ActionRow(title: "Arrange phone setup", symbol: "phone.badge.plus") }
                            }
                        }
                    }
                    AccountActionsGroup()
                }
                .navigationTitle(model.isLoading || model.contextError != nil ? "Your account" : "Get started")
                .navigationBarTitleDisplayMode(.inline)
                .shieldListStyle()
                .contentMargins(.top, 0, for: .scrollContent)
                .refreshable { await model.refresh() }
            }
        }
        .safeAreaInset(edge: .bottom) {
            if !model.isLoading {
                DemoEntryButton().padding(ShieldTheme.Spacing.content).background(ShieldTheme.surface)
            }
        }
    }
}
