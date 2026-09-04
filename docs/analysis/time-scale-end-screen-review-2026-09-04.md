# Time-scale baseline and end-screen chart release — 2026-09-04

## Scope

Player-facing `1×`, `2×`, and `4×` map to actual fixed-timestep rates `5`, `10`, and `20`; the new baseline `1×` therefore preserves the prior released 5× simulation pace. Player-facing HUD/result/chart clocks convert authoritative simulation elapsed time back through the fixed 5× base rate, yielding normal real-time display at 1× and proportional display at 2×/4×. Production, mining-cycle timers, AI schedules, cooldowns, and authoritative gold-history sampling remain simulation-time based. Pause remains an early advancement bypass.

All game-world unit movement and Raven flight/exit movement are reduced by 20%. Miner speed drops from `80` to `64`, while each completed Miner trip uses its assigned deposit distance to scale delivered gold, preserving that normal route’s pre-change steady-state income. Mining time/slots and normal threat disruption are unchanged. The decorative landing Raven is renderer-only and unchanged.

Player victory/defeat displays zero-padded `MM:SS` game time. The authoritative once-per-simulation-second total-resource-delta chart has a vertical `Gold` axis and `+max / 0 / −max` labels. Watch-AI end screen remains unchanged.

## Evidence

- Focused speed mapping, display-clock, movement/income, end-screen, and gold-history checks passed.
- Retained mirrored-mining, Raven lifecycle/determinism, and 5,000-tick headless invariant passed.
- Real Chrome/CDP proof rendered `625s` authoritative time as `02:05` in the live HUD and result overlay; pause and zoom controls passed.
- Changed runtime assets were SHA-256 verified against loopback and LAN serving before release.

## Release

Source commit `1299f60` (`feat: normalize game clock and movement pacing`) was fast-forwarded onto local `main`. The release documentation commit follows separately; generated screenshots remain local-only.