# Overnight Strategy League v1 — 2026-07-28

## Goal
Deliver a testable Red-vs-Blue strategy-learning Watch-mode foundation by morning, without changing `main`, committing, pushing, or exposing LM Studio.

## Architecture
- Browser reports completed Watch-match summaries only to the existing PC-hosted same-origin companion service.
- Companion service persists bounded, schema-versioned history and per-team strategy profiles locally.
- OpenAI/Codex workflow reviews compact history and updates the profiles; it is not an in-game service or browser API.
- Local Gemma sees only its own team strategy plus its existing bounded state and emits validated commands/purchase priorities.
- Deterministic simulation remains the authority for all mechanics and legality.

## Required V1
1. Match history schema/storage and a bounded local API.
2. Red/Blue independent strategy profiles and safe strategy loading.
3. Watch completion recording, including winner, duration, team economy/composition, losses, and selected strategy revision.
4. Local commander state includes own strategy profile only.
5. History screen from the main menu: aggregate wins, recent results, current summaries/status.
6. Deterministic tests, server/API tests, and focused browser/release verification.

## Stretch: Game-ready seed set
- Run deterministic representative matches.
- Seed several simple, evidence-based Red/Blue profiles from their history.
- Verify a complete local stack can load the profiles and execute a Watch game.

## Constraints
- Work only in this feature worktree/branch.
- Never commit, push, or edit production `main`.
- No direct browser-to-LM-Studio or browser-to-OpenAI requests.
- Do not fake OpenAI review output or claim a provider call succeeded without real evidence.
- Preserve the model-strategy boundary: no hidden scripted purchase/economy/hero/turret fallbacks for Model Commander teams.
- Write concise verified progress and blockers to `overnight-progress.md` in this worktree.
