# Local history and recordings

The iPhone app previously kept most call history only in memory. Reopening it required `/api/people`, public configuration, setup/contact checks and history requests before its normal screens had data. A temporary connection failure could therefore look like an unusable app, even though cloud call screening continued independently.

The October 16 update loads the signed-in owner's protected local history before refreshing the service. It retains up to 500 previously loaded calls per owner, removes history older than 30 days, and supports Home, call filters and call details without a successful request. Message summaries in this history are available before the recording arrives. Saved audio has its separate durable library and plays locally. Newly loaded calls appear before optional setup/contact/notification checks finish; overlapping full refreshes are coalesced.

The history is account-scoped, atomically written, protected with iOS Data Protection, and excluded from backups. Helpers' shared history is not persisted: fresh access is required because sharing can be revoked. Sign-out hides local data, account deletion removes it, and confirmed message deletion removes the corresponding history copy. Transient token-refresh failures retain the session; explicit authentication failures still require sign-in.

Saved screens show when their copy was updated. They never use a cached protection status as proof that screening is currently on. Initial sign-in, new calls/messages, shared access, account/settings changes and server-side message deletion require a connection. Live screening needs the cloud services and carrier connection, but the iPhone app does not need to remain open or maintain a continuous server connection.

## Evidence

- Swift storage tests cover restart, account isolation, backup exclusion, 30-day expiry, stale-account writes, deletion and corrupt files, alongside durable audio delivery/failure tests.
- The real AppState/Calls/detail views passed a simulator cold-launch/relaunch/filter/detail test with an in-memory synthetic identity and an unavailable API. No real credentials or network service were used. The first attempt targeted a Home button below the lazy list's visible area; the corrected test uses the visible Calls tab and passed.
- The separate audio simulator test passed playback before and after app restart, with backup exclusion checked.
- A signed build was installed and launched on the owner's paired iPhone 12 Pro Max on October 16. No carrier settings were changed and no phone call was placed. Physical-device airplane-mode, background delivery timing and hardware encryption were not directly tested.
