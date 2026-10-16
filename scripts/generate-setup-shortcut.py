"""Create an Apple-signed, single-action import for local setup research.

Does not install or run it. Apple's editor authored this action with default
parameters, which displays 'Turn Silence Unknown Callers On' on iOS 27.
"""
import pathlib
import plistlib
import subprocess
import tempfile

root = pathlib.Path(__file__).resolve().parents[1]
workflow = {
    "WFWorkflowName": "Shield Call Silencing",
    "WFWorkflowClientVersion": "5037.109",
    "WFWorkflowMinimumClientVersion": 900,
    "WFWorkflowMinimumClientVersionString": "900",
    "WFWorkflowActions": [{
        "WFWorkflowActionIdentifier": "is.workflow.actions.silenceunknowncallers.set",
        "WFWorkflowActionParameters": {},
    }],
    "WFWorkflowTypes": [],
    "WFWorkflowInputContentItemClasses": [],
    "WFWorkflowImportQuestions": [],
}
destination = root / "ios/Shield/Resources/Shield Call Silencing.shortcut"
with tempfile.TemporaryDirectory(prefix="shield-shortcut-") as temporary:
    source = pathlib.Path(temporary) / "unsigned.shortcut"
    source.write_bytes(plistlib.dumps(workflow, fmt=plistlib.FMT_BINARY))
    subprocess.run(["shortcuts", "sign", "--mode", "anyone", "--input", str(source),
                    "--output", str(destination)], check=True)
print("Created one-action shortcut; no phone setting changed.")
