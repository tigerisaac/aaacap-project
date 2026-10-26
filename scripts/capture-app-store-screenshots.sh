#!/bin/sh
# Capture App Store screenshots from the Debug build's offline sample screens (never contacts the service).
# Usage: scripts/capture-app-store-screenshots.sh <iPhone simulator UDID> <Debug-iphonesimulator Shield.app> <output dir>
# Use a matching iPhone simulator: medium 1206 × 2622 or large 1320 × 2868. Check every frame before uploading.
set -eu
device=$1 app=$2 out=$3
root=$(cd "$(dirname "$0")/.." && pwd)
xcrun simctl bootstatus "$device" -b >/dev/null
"$root/scripts/mute-simulator.sh" "$device"
xcrun simctl install "$device" "$app"
xcrun simctl ui "$device" appearance light
xcrun simctl status_bar "$device" override --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
mkdir -p "$out"
shot() { # name, launch arguments...
  name=$1; shift
  xcrun simctl terminate "$device" org.isaaczhang.Shield 2>/dev/null || true
  xcrun simctl launch "$device" org.isaaczhang.Shield --uitesting-light --uitesting-app-store-capture --uitesting-single-person "$@" >/dev/null
  sleep 8 # let launch animations and system indicators settle
  xcrun simctl io "$device" screenshot --type=png "$out/$name.png" >/dev/null 2>&1
  echo "$name $(sips -g pixelWidth -g pixelHeight "$out/$name.png" | awk '/pixel/{printf "%s ", $2}')"
}
shot 01-home --uitesting-preview
shot 02-calls --uitesting-screen calls
shot 03-messages --uitesting-screen messages --uitesting-message-filters
shot 04-caretakers --uitesting-screen trusted-contacts
xcrun simctl terminate "$device" org.isaaczhang.Shield 2>/dev/null || true
xcrun simctl status_bar "$device" clear
