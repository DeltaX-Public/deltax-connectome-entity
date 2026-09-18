# Contributing to DeltaX Connectome Entity

Thank you for contributing to the DeltaX Connectome Entity research repository. This document outlines the technical standards, causal integrity rules, and contribution workflow required for all pull requests.

---

## 1. Branching & Pull Request Workflow

1. **Base Branch:** All feature work, experiment protocols, and refactors branch from current clean `main`.
2. **Feature Branches:** Use descriptive branch prefixes:
   - `phase<N>-<description>` (e.g. `phase3-long-horizon-adaptation`)
   - `infra/<description>` (e.g. `infra/org-repo-hardening`)
   - `fix/<description>`
   - `docs/<description>`
3. **Branch Protection:** Direct commits to `main` are disabled. All changes must land via Pull Request.
4. **Merge Strategy:** Pull requests are integrated via **Squash and Merge** to maintain a linear, bisectable commit history. Head branches are automatically deleted upon merge.
5. **Continuous Integration:** The `Public Integrity CI` workflow must pass on all PRs before merge.

---

## 2. Research & Causal Integrity Standards

All experimental code and battery harnesses are subject to strict causal integrity governance:

- **Substrate Primacy:** All motor actions MUST originate from connectome substrate candidate proposals prior to executive evaluation.
- **Zero Actuator Cheats:** No post-DeltaX steering overrides, heuristics, or hardcoded shortcuts (e.g. `VETO -> left` or `MODULATE -> forward`). If an executive disposition has no permitted substrate candidate, the entity must fallback safely without inventing artificial commands.
- **Symmetric Controls:** Any executive condition (e.g. `EXECUTIVE`) must be evaluated against symmetric baselines (`CONTROL`, `OBSERVE`, `STATIC_GUARD`, `SHUFFLED`) using matched seeds and identical environmental physics.
- **Honest Null Reporting:** Experimental results—positive, neutral, or negative—must be reported faithfully. Do not tune harness parameters to force a predetermined positive outcome.
- **Frozen Baseline Preservation:** Historical evidence baselines (such as `phase3_pre_integrity_audit`) must remain frozen and unmodified. When methodology is corrected, new evidence bundles are versioned separately with explicit protocol deviation logs.

---

## 3. Strict Repository & Confidentiality Boundary

1. **No Proprietary Runtime In Git:** The sovereign DeltaX Python runtime (`deltax-python-runtime`) is strictly private. Public repositories contain only open adapters, contracts, schemas, and public test harnesses.
2. **No Absolute Private Paths:** Commit messages, tests, and documentation must never contain absolute paths referencing private local directories or developer machines.
3. **No Secrets or Credentials:** Never commit tokens, API keys, private keys, or passwords. Secret scanning and push protection are strictly enforced by GitHub.

---

## 4. Local Verification Before Opening a PR

Before submitting your PR, ensure local verification succeeds:

```bash
# 1. Run public-safe test suite
node --test test/*.test.mjs

# 2. Run local leak scanner
python3 -c '
import os, sys, re
FORBIDDEN = [
    re.compile(r"/Users/[a-zA-Z0-9_-]+/Projects/private/deltax-python-runtime", re.I),
    re.compile(r"ghp_[a-zA-Z0-9]{36}"),
    re.compile(r"gho_[a-zA-Z0-9]{36}"),
    re.compile(r"xox[baprs]-[0-9a-zA-Z]+"),
]
violations = 0
for root, dirs, files in os.walk("."):
    if ".git" in dirs: dirs.remove(".git")
    if "node_modules" in dirs: dirs.remove("node_modules")
    if "artifacts/changed_world/phase3_pre_integrity_audit" in root: continue
    for f in files:
        p = os.path.join(root, f)
        try:
            with open(p, "r", errors="ignore") as fh:
                for idx, line in enumerate(fh, 1):
                    for pat in FORBIDDEN:
                        if pat.search(line):
                            print(f"LEAK VIOLATION: {p}:{idx}")
                            violations += 1
        except Exception:
            pass
if violations > 0: sys.exit(1)
print("Leak scan clean.")
'
```
