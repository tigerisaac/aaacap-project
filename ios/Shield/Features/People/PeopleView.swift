import SwiftUI

struct PeopleView: View {
    @Environment(AppState.self) private var model
    @State private var joining = false

    var body: some View {
            List {
                if let error = model.contextError {
                    Section {
                        ShieldNotice(title: "Couldn’t get these calls", detail: error, symbol: "wifi.exclamationmark")
                        Button("Try Again", systemImage: "arrow.clockwise") { Task { await model.refresh() } }.frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    }
                }
                ShieldSection("Whose calls would you like to see?") {
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
                                    Text(person.isOwner ? "Your phone" : person.canListen ? "Calls and voicemail" : "Calls only")
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
                        Label("Shared with you", systemImage: "heart.text.clipboard")
                            .foregroundStyle(ShieldTheme.message)
                        Text("Only they can change their phone settings.").font(.subheadline).foregroundStyle(ShieldTheme.secondaryText)
                    }
                }
                Section {
                    if model.isOwner {
                        NavigationLink(value: AppRoute.sharing) {
                            ActionRow(title: "Invite someone to help", symbol: "person.badge.plus")
                        }
                    }
                    Button { joining = true } label: {
                        ActionRow(title: "Use an invitation", symbol: "envelope.open")
                    }
                    .frame(minHeight: ShieldTheme.Layout.minimumTarget)
                    .disabled(model.isDemo)
                } footer: {
                    if model.isOwner {
                        Text("You choose what they can see.").foregroundStyle(ShieldTheme.secondaryText)
                    }
                }
            }
            .navigationTitle("Family & friends")
            .sheet(isPresented: $joining) { JoinInvitationView() }
            .refreshable { await model.refresh() }
            .shieldListStyle()
    }
}
