import SwiftUI

struct PeopleView: View {
    @Environment(AppState.self) private var model
    @State private var joining = false

    var body: some View {
        NavigationShell {
            List {
                Section("Your circle") {
                    ForEach(model.people) { person in
                        Button {
                            Task { await model.select(person) }
                        } label: {
                            HStack(spacing: 14) {
                                Image(systemName: person.isOwner ? "person.crop.circle.fill" : "person.2.circle.fill")
                                    .font(.largeTitle)
                                    .foregroundStyle(person.isOwner ? ShieldTheme.action : ShieldTheme.message)
                                    .accessibilityHidden(true)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(person.name).font(.headline).foregroundStyle(.primary)
                                    Text(person.isOwner ? "Your phone" : person.canListen ? "History & voicemail shared" : "Call history shared")
                                        .font(.subheadline).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if person.id == model.selectedPersonID {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(ShieldTheme.action)
                                        .accessibilityLabel("Selected")
                                }
                            }
                            .padding(.vertical, 8)
                        }
                        .accessibilityIdentifier("person-\(person.name)")
                    }
                }
                if model.isOwner {
                    Section {
                        NavigationLink(value: AppRoute.sharing) {
                            Label("Share with someone", systemImage: "person.badge.plus")
                                .foregroundStyle(ShieldTheme.message)
                                .padding(.vertical, 6)
                        }
                    } footer: {
                        Text("You choose what to share. You can stop sharing anytime.")
                    }
                } else {
                    Section {
                        Label("Shared access", systemImage: "heart.text.clipboard")
                            .foregroundStyle(ShieldTheme.message)
                        Text("Phone settings stay with the participant.").font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                Section {
                    Button("Join with an invitation", systemImage: "envelope.open") { joining = true }
                        .frame(minHeight: 44)
                        .disabled(model.isDemo)
                }
                Section {
                    NavigationLink(value: AppRoute.settings) { Label("Settings", systemImage: "gearshape") }
                }
            }
            .navigationTitle("People")
            .sheet(isPresented: $joining) { JoinInvitationView() }
            .refreshable { await model.refresh() }
            .scrollContentBackground(.hidden)
            .background(ShieldTheme.surface)
        }
    }
}
