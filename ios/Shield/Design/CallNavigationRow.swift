import SwiftUI

/// The navigation control owns its spoken name, state and action.
struct CallNavigationRow: View {
    let call: CallRecord
    var showsNumber = true
    var showsDay = true

    var body: some View {
        let row = CallRow(call: call, showsNumber: showsNumber, showsDay: showsDay)
        let title = CallPresentation.title(call)
        NavigationLink(value: call) { row }
            .accessibilityLabel(title)
            .accessibilityValue(row.accessibilityDetails)
            .accessibilityInputLabels([title, "Open \(title)"])
            .accessibilityHint("Open call details")
            .accessibilityIdentifier("call-row-\(call.id)")
    }
}
