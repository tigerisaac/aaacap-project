#if DEBUG && targetEnvironment(simulator)
import SwiftUI

struct BlockedPaginationCheckView: View {
    @State private var model: AppState?
    @State private var failure: String?

    var body: some View {
        Group {
            if let model {
                NavigationStack { BlockedNumbersView() }.environment(model)
            } else if let failure { Text(failure) }
            else { ProgressView() }
        }
        .task {
            do {
                let root = URL.applicationSupportDirectory.appending(path: "SyntheticBlockedPagination")
                try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
                let directory = CallDirectoryCoordinator(fileURL: root.appending(path: CallDirectoryList.fileName)) { true }
                await directory.activate(nil)
                let value = AppState(configuration: BackendConfiguration(baseURL: nil), callDirectory: directory)
                value.signedIn = true
                value.isPreview = false
                let owner = Person(id: UUID(), name: "Synthetic owner", isOwner: true, canListen: true)
                value.people = [owner]
                value.selectedPersonID = owner.id
                await value.activateCallDirectory(generation: value.sessionGeneration)
                model = value
            } catch { failure = "Blocked pagination fixture failed" }
        }
    }
}
#endif
