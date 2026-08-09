# Stick RTS Retention & Cleanup Manifest

**Status:** review-only. This file authorizes no deletion by itself.

**Created from:** current worktree audit after `git fetch --all --prune`.

## Policy

A tracked file is not removable merely because the runtime does not import it. Preserve sources, editable art, reproducible checks, evidence required by an active effort, and branch-specific planning records. Any deletion must first be added to the **approved deletion set** below, then removed in a separate commit with its replacement/archive path recorded.

## Classes

| Class | Meaning | Action |
|---|---|---|
| `keep-source` | Runtime source, editable art, provenance, or required configuration | Never delete without a replacement/migration |
| `keep-evidence` | Active test, review, or training evidence | Retain while its effort is active |
| `archive-review` | Historical/reproducible material likely not needed in the active checkout | Owner review before archival or deletion |
| `exclude-local` | Machine-local state/cache | Ignore; do not commit |
| `delete-approved` | Explicitly approved for removal | Delete only in a dedicated cleanup commit |

## Current conclusions

### Keep: runtime and reproducibility

```text
src/
tools/
tasks/
docs/
assets/art/editable/
assets/art/source/
assets/art/manifest/
training/ (on agent/watch-speed-control)
```

Evidence: `src/` is the game execution graph; `tools/` are standalone check/evidence scripts rather than runtime imports; editable Aseprite sources and source masters are the art authority; training assets support the active Watch/AI/RL effort.

### Keep: active review evidence

```text
artifacts/warrior-pair-proof/
artifacts/faction-source-review/
artifacts/*-intake-*/
training/artifacts/scripted-hard-demonstrations-v001.jsonl
training/artifacts/hard-rl-v1-seed-26002-trace.json
```

Reason: these record visual provenance, approved walk construction, and the current scripted-Hard/RL teacher evidence.

### Archive review candidates — no deletion approved

| Worktree/branch | Paths or class | Reason for review |
|---|---|---|
| `main` | `artifacts/screenshots/s11-zoom-{min,default,max}.png` | Historical UI screenshots; retain if used as release visual evidence, otherwise archive externally. |
| `main` | `artifacts/browser-check-results.json`, `artifacts/overnight-report.md` | Generated run/report outputs; potential archival material once their associated gates are superseded. |
| `agent/visual-proof` | `artifacts/api-pricing-research/openai-image-generation.html` | Captured external research page; not a game/runtime dependency. Archive only if provenance is no longer needed. |
| `agent/visual-proof` | `assets/art/sources/kenney-*` plus extracted packs | Third-party intake/source branch. Keep until licensing/style-fit decision is formally closed; then archive as a source bundle rather than delete piecemeal. |
| `agent/visual-proof` | superseded art experiment exports outside current V08/V15/V16 lineage | Require a named lineage review; some are useful rejected-reference evidence. |
| `agent/watch-speed-control` | older `training/artifacts/curriculum-candidate-v003.json`, `v004.json`, and interim curriculum artifacts | Candidates only after current RL evaluation determines which checkpoint/curriculum evidence is retained. |
| all | old `.hermes/plans/` | Historical decision record. Consolidate after active milestones are resolved; do not delete while the work remains recoverable through those plans. |

### Exclude local state

```text
.local/
__pycache__/
node_modules/
.release-gate-chrome/
```

`.local/` and `__pycache__/` are explicitly ignored on `agent/watch-speed-control`. They should remain untracked.

## Approved deletion set

**Empty.** No tracked files have been approved for deletion.

## Required evidence before approving a deletion

For each proposed path, record:

```text
- exact path and byte size
- branch/worktree
- last commit touching it
- import/script/document reference search result
- source/replacement/archive location, if any
- owner approval
```

## Recommended first cleanup batch

Do not delete. First choose whether the three `main/artifacts/screenshots/s11-zoom-*.png` files and the generated `browser-check-results.json` / `overnight-report.md` remain release evidence or move to an external archive. That is a small, reversible policy decision with no impact on source, art, or AI/RL reproducibility.
