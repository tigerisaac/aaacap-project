#!/bin/sh
# Mute iOS simulators so UI tests, especially VoiceOver speech, don't play through the Mac's speakers.
# A simulator's volume resets when it boots, so the Shield scheme runs this before every test action.
# Usage: scripts/mute-simulator.sh [UDID ...]   (default: every booted simulator)
set -u

devices="$*"
[ -n "$devices" ] || devices=$(xcrun simctl list devices booted | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}')
for udid in $devices; do
  # Boots the simulator if needed; fails for physical devices, which keep their own volume.
  xcrun simctl bootstatus "$udid" -b >/dev/null 2>&1 || continue
  xcrun devicectl device settings audio --device "$udid" --volume 0 --quiet && echo "Muted simulator $udid"
done
exit 0
