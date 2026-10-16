"""Sign the native-authored, four-action setup trial. Never installs or runs it.

The source was exported from Apple's editor and inspected on the pilot iPhone.
The signing mode validates a copy through Apple; it does not publish an iCloud link.
"""
from pathlib import Path
import plistlib
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
source = root / "docs/shortcuts/Shield Easy Setup.wflow"
workflow = plistlib.loads(source.read_bytes())
actions = workflow["WFWorkflowActions"]
assert [a["WFWorkflowActionIdentifier"] for a in actions] == [
    "is.workflow.actions.silenceunknowncallers.set",
    "is.workflow.actions.url",
    "is.workflow.actions.openurl",
    "is.workflow.actions.nothing",
]
assert actions[0]["WFWorkflowActionParameters"] == {}
url = actions[1]["WFWorkflowActionParameters"]
assert url["WFURLActionURL"] == "settings-navigation://com.apple.Settings.Apps/com.apple.mobilephone#CALL_SCREENING_ROW"
assert actions[2]["WFWorkflowActionParameters"]["WFInput"]["Value"]["OutputUUID"] == url["UUID"]
destination = root / "ios/Shield/Resources/Shield Easy Setup.shortcut"
with tempfile.TemporaryDirectory(prefix="shield-native-shortcut-") as directory:
    unsigned = Path(directory) / "Shield Easy Setup.shortcut"
    signed = Path(directory) / "signed.shortcut"
    # Preserve Apple's authored action structures rather than guessing an App Intent entity.
    unsigned.write_bytes(plistlib.dumps(workflow, fmt=plistlib.FMT_BINARY, sort_keys=False))
    subprocess.run(["shortcuts", "sign", "--mode", "anyone", "--input", str(unsigned),
                    "--output", str(signed)], check=True)
    # Copy bytes into the repository, without temporary-export file attributes.
    destination.write_bytes(signed.read_bytes())
print("Signed the native four-action trial. No shortcut installed or setting changed.")
