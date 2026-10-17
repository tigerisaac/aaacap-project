import SwiftUI

extension View {
    /// Attach to the stable screen, not an empty List section that may never mount.
    /// Fast reads never insert a loading card; slow first loads still show progress.
    func deferredLoading(_ loading: Bool, visible: Binding<Bool>) -> some View {
        task(id: loading) {
            visible.wrappedValue = false
            guard loading else { return }
            do {
                try await Task.sleep(for: .milliseconds(250))
                try Task.checkCancellation()
                visible.wrappedValue = true
            } catch { }
        }
    }
}
