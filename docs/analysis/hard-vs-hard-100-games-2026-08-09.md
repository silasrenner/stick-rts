# Hard vs. Hard scripted AI — 100 headless games

**Run date:** 2026-08-09  
**Build under test:** local branch `agent/local-ux-review`, commit `4060cc9` at analysis time  
**Matchup:** Hard scripted AI (player/left) vs. Hard scripted AI (AI/right)  
**Seeds:** deterministic seeds 1–100  
**Simulation:** direct `runTick` headless execution at the configured tick rate; each game was allowed up to 3,000 simulated seconds.

This is a balance/instrumentation observation, not a gameplay change or release claim.

## Method

For each game, the harness recorded:

- winner and elapsed simulated time;
- final unspent gold, cumulative spent gold, and inferred mined gold (`final gold + spent - starting gold`);
- mined and spent gold per minute;
- gold-lead changes (a switch from one non-tied side holding more gold to the other);
- time each side led in gold, and tied time;
- peak living, trained, and final living miners, warriors, and archers;
- losses and hero deaths.

The follow-up long-game pass also sampled per tick:

- production-queue occupancy;
- effective cap occupancy (`living units + queued units >= cap`);
- high-bank states (at least 1,000 gold);
- high-bank states with an empty queue or cap reached;
- live-cap utilization, command time, and command switches.

## Whole-sample results

### Outcomes and duration

| Measure | Result |
|---|---:|
| Player/left wins | 59 |
| AI/right wins | 41 |
| Unresolved games | 0 |
| Mean duration | 11.46 min |
| Median duration | 8.80 min |
| 10th–90th percentile | 6.01–21.01 min |
| Shortest | 5.39 min (seed 40, AI win) |
| Longest | 32.98 min (seed 80, player win) |

The observed 59% player-side win rate has a Wilson 95% interval of 49.2%–68.1%; this sample is a signal worth monitoring, not proof of a side advantage.

### Economy

| Metric | Player/left | AI/right |
|---|---:|---:|
| Final unspent gold — mean | 3,501 | 2,048 |
| Final unspent gold — median | 703 | 87 |
| Final unspent gold — 90th percentile | 12,360 | 6,146 |
| Mined gold/min — mean | 1,536 | 1,477 |
| Spent gold/min — mean | 1,344 | 1,363 |
| Mined gold/min — median | 1,585 | 1,482 |
| Spent gold/min — median | 1,324 | 1,384 |

Gold-lead changes: mean 120.16, median 96, range 50–300. Mean time in a gold lead: player 46%, AI 39%, tied 15%.

### Army and attrition

| Side / unit | Peak living — median | Trained — median | Final living — median |
|---|---:|---:|---:|
| Player warriors | 15 | 25 | 8 |
| Player archers | 7 | 8 | 0 |
| Player miners | 11 | 11 | 10 |
| AI warriors | 13.5 | 21 | 0 |
| AI archers | 8.5 | 14 | 0 |
| AI miners | 11 | 11 | 0 |

Mean unit losses: player 44.77, AI 48.38. Hero deaths were uncommon (player 0.16, AI 0.12 per game).

## Long-game cohort: longest 10 games

The longest 10 games lasted 21.31–32.98 minutes (6 player wins, 4 AI wins).

| Metric | Player/left | AI/right |
|---|---:|---:|
| Final unspent gold | 14,525 | 7,199 |
| Mined gold/min | 1,718 | 1,522 |
| Spent gold/min | 1,189 | 1,236 |
| Queue non-empty | 97.1% of match time | 93.2% |
| At effective cap | 56.5% | 32.4% |
| At least 1,000 gold | 46.8% | 26.5% |
| At least 1,000 gold while at cap | 44.8% | 25.4% |
| At least 1,000 gold with empty queue | 0% | 0% |
| Mean live-cap utilization | 36.4% | 36.3% |
| Attack-command time | 40.0% | 16.5% |
| Defend-command time | 60.0% | 83.5% |
| Mean command changes | 46.4 | 15.8 |

### Finding: stockpiling is queue/cap reservation pressure, not idle AI

The critical observation is that high-bank time with an empty queue was **0%** for both sides in the long cohort. The AIs are not simply forgetting to purchase.

Hard AI makes a decision roughly every second, while each team has one sequential FIFO production queue. Purchases deduct gold when enqueued, and queued units reserve population cap. In long games, the AI can fill its future cap with already-paid units much faster than the FIFO can materialize them. Once living plus queued units reaches cap, incoming gold cannot be committed to more units until capacity becomes available; structures can expand cap only up to the configured maximum.

This produces a visible mismatch:

- effective cap can be full for a large share of the game;
- the production queue can remain continuously non-empty;
- living forces can still use only about 36% of cap on average;
- large gold banks keep growing because the next capacity is already reserved in backlog.

The resulting long-game symptom is delayed conversion of economic advantage into battlefield force, rather than an inactive economy.

## Seed 80 case study

Seed 80 was the longest game: player win at 32.98 minutes.

| Measure | Player | AI |
|---|---:|---:|
| Mined | 63,879 | 41,834 |
| Spent | 31,490 | 42,080 |
| Final unspent | 32,689 | 54 |
| Queue non-empty | 98.7% | 92.5% |
| At effective cap | 84.2% | 1.7% |
| At least 1,000 gold | 77.8% | 0% |
| At least 1,000 gold while at cap | 75.7% | 0% |

By minute 14, the player had 5 structures and 80 cap, but only 15 living units and 65 queued units. Between minutes 20–29, it commonly had roughly 19–20 living units and 61 queued units, with all cap reserved, while gold increased from 13,650 to 26,258.

The tactical pattern also prolonged the game: the player attacked often, while the AI defended for essentially the entire match. Repeated attacks caused losses, but the long pre-paid FIFO backlog delayed the arrival of the force needed to convert the player’s economic advantage into a core kill.

## Interpretation and next evidence gate

No balance change follows from this note. Before changing Hard AI or economy rules, test the same fixed seeds with targeted watched-browser diagnostics for:

1. live units, queued units, cap, queue head, and remaining build time;
2. unspent gold and rejected-purchase reason;
3. command state and time since last core damage.

Then compare the current behavior against one controlled mechanics-only variant, such as bounded queue depth or queue-aware purchasing. Re-run the same 100 seeds and compare duration, resolution rate, win split, stockpiling, queue pressure, and live-force availability. Do not blend this with strategy-policy changes until the production/cap contribution is isolated.
