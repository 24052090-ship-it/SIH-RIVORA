import argparse
import json
from pathlib import Path

REQUIRED = [
    "docs/phases/PHASE30.md",
    "docs/ARCHITECTURE.md",
    "docs/phase30/FINAL_RELEASE_CHECKLIST.md",
    "docs/phase30/EVIDENCE_MATRIX.md",
    "docs/phase30/DEMO_SCRIPT.md",
    "docs/phase30/JUDGE_QA.md",
    "docs/phase30/RELEASE_NOTES.md",
    "docs/sih/PROJECT_ONE_LINER.md",
    "demo/demo-scenario.json",
    "scripts/demo-scenario.js",
]

FORBIDDEN_FINAL_CLAIMS = [
    "99% accuracy",
    "100% accuracy",
    "deployed across",
    "zero false",
]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()

    root = Path(args.root)
    missing = [item for item in REQUIRED if not (root / item).exists()]

    claim_violations = []
    for rel in [
        "docs/phase30/FINAL_RELEASE_CHECKLIST.md",
        "docs/phase30/EVIDENCE_MATRIX.md",
        "docs/phase30/DEMO_SCRIPT.md",
        "docs/phase30/JUDGE_QA.md",
        "docs/phase30/RELEASE_NOTES.md",
    ]:
        path = root / rel
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8").lower()
        for claim in FORBIDDEN_FINAL_CLAIMS:
            if claim.lower() in text:
                claim_violations.append({
                    "file": rel,
                    "claim": claim,
                })

    presentation_assets = list(root.glob("**/*.pptx")) + list(root.glob("**/*.ppt"))
    screenshot_assets = []
    for pattern in ("*.png", "*.jpg", "*.jpeg", "*.webp"):
        screenshot_assets.extend((root / "docs").rglob(pattern))
        screenshot_assets.extend((root / "demo").rglob(pattern))

    blockers = missing + [
        f"unsafe claim in {item['file']}: {item['claim']}"
        for item in claim_violations
    ]

    result = {
        "status": "READY_FOR_FINAL_REVIEW" if not blockers else "INCOMPLETE",
        "missing": missing,
        "claimViolations": claim_violations,
        "roadmapPhase": 30,
        "applicationVersion": "31.0.0",
        "presentationAssetsFound": len(presentation_assets),
        "screenshotAssetsFound": len(screenshot_assets),
        "presentationAssetsPending": len(presentation_assets) == 0,
        "screenshotAssetsPending": len(screenshot_assets) == 0,
        "note": (
            "Presentation/screenshots may remain pending for final SIH packaging; "
            "they are reported explicitly and are not silently marked complete."
        ),
    }

    print(json.dumps(result, indent=2))

    if blockers:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
