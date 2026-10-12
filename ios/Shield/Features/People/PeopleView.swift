import SwiftUI

struct PeopleView: View {
    @Environment(AppState.self) private var model
    @State private var joining = false

    var body: some View {
        NavigationShell {
            List {
                if let error = model.contextError {
                    Section {
                        ShieldNotice(title: "Activity couldn’t refresh", detail: error, symbol: "wifi.exclamationmark")
                        Button("Try Again", systemImage: "arrow.clockwise") { Task { await model.refresh() } }.frame(minHeight: 44)
                    }
                }
                ShieldSection("View activity for") {
                    ForEach(model.people) { person in
                        Button {
                            Task { await model.select(person) }
                        } label: {
                            HStack(spacing: 14) {
                                Image(systemName: person.isOwner ? "person.crop.circle.fill" : "person.2.circle.fill")
                                    .font(.largeTitle)
                                    .foregroundStyle(Color.secondary)
                                    .accessibilityHidden(true)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(person.name).font(.headline).foregroundStyle(Color.primary)
                                    Text(person.isOwner ? "Your phone" : person.canListen ? "History & voicemail" : "History only")
                                        .font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                                }
                                Spacer()
                                if person.id == model.selectedPersonID {
                                    Image(systemName: "checkmark")
                                        .font(.body.weight(.semibold))
                                        .foregroundStyle(ShieldTheme.action)
                                        .accessibilityLabel("Selected")
                                }
                            }
                            .padding(.vertical, 8)
                        }
                        .accessibilityIdentifier("person-\(person.name)")
                    }
                }
                if !model.isOwner {
                    Section {
                        Label("Shared access", systemImage: "heart.text.clipboard")
                            .foregroundStyle(ShieldTheme.message)
                        Text("Phone settings stay with the participant.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                    }
                }
                Section {
                    if model.isOwner {
                        NavigationLink(value: AppRoute.sharing) {
                            ActionRow(title: "Share with someone", symbol: "person.badge.plus")
                        }
                    }
                    Button { joining = true } label: {
                        ActionRow(title: "Join with an invitation", symbol: "envelope.open")
                    }
                    .frame(minHeight: 44)
                    .disabled(model.isDemo)
                } footer: {
                    if model.isOwner {
                        Text("You choose what to share. You can stop sharing anytime.").foregroundStyle(ShieldTheme.secondaryText)
                    }
                }
            }
            .navigationTitle("People")
            .sheet(isPresented: $joining) { JoinInvitationView() }
            .refreshable { await model.refresh() }
            .shieldListStyle()
        }
    }
}
