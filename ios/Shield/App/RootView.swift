import SwiftUI

struct RootView: View {
    @Environment(AppState.self) private var model

    var body: some View {
        @Bindable var model = model
        Group {
            if model.signedIn {
                VStack(spacing: 0) {
                    if model.isDemo { DemoBanner() }
                    if model.people.isEmpty {
                        JoinView()
                    } else {
                        TabView(selection: $model.selectedTab) {
                            Tab("Today", systemImage: "square.grid.2x2.fill", value: 0) {
                                OverviewView().id(model.selectedPersonID)
                            }
                            Tab("Calls", systemImage: "phone.fill", value: 1) {
                                CallsView().id(model.selectedPersonID)
                            }
                            Tab("Check", systemImage: "text.magnifyingglass", value: 2) {
                                CheckView().id(model.selectedPersonID)
                            }
                            Tab("People", systemImage: "person.2.fill", value: 3) {
                                PeopleView().id(model.selectedPersonID)
                            }
                        }
                    }
                }
            } else {
                SignInView()
            }
        }
        .alert("Something needs attention", isPresented: $model.showingError) {
            Button("OK") { model.errorMessage = nil }
        } message: {
            Text(model.errorMessage ?? "")
        }
    }
}
