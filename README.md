# token-radar-01-entry

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Angklers/token-radar-01-entry/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Angklers/token-radar-01-entry/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it fits an implied-value line on the traded tokens in a frozen DefiLlama snapshot (log market cap on log TVL, one protocol per ticker, validated blind in five folds, shuffled folds and leave-one-out), ranks 198 pre-token protocols by that value with an 80% range, and gives each one a farm verdict with the expected net value and a seven-step farm plan, in a static dashboard that runs with no network. Launch odds come from the peers' record — the share of same-category, same-age-band protocols in the snapshot that record a token — never from an assumed band. The board accounts for all 758 protocols in the snapshot: 198 ranked, 128 live-token with market values, 288 token-listed but unpriced, and 144 set aside as wrapped, staked or bridged products of a token that trades.

## Run it

```sh
node main.ts --input <snapshot> 
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=0vfa70x7&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
