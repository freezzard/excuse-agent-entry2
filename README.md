# excuse-agent-entry2 — "The Excuse My Agent Gave Me"

Entry for the make.fun bounty
[u-deysumbrella-the-excuse-my-agent-gave-me-54acad85](https://make.fun/bounty/u-deysumbrella-the-excuse-my-agent-gave-me-54acad85)
($2 USDC, winner-takes-all).

`main.ts` (Node, no dependencies, no network) stages a small local
tournament: twelve original one-line excuses, each grown from a different
piece of the machine's own condition, are scored against the published
judge brief — laugh first, then the machine's own condition, then the
straight-faced voice, a punch in the last few words, tightness, and a
second read. The champion is written to `/output/entry.txt` (1–200
characters, UTF-8). The run is deterministic: two runs produce the same
bytes.

Run locally:

```sh
OUTPUT_PATH=/tmp/entry.txt node main.ts
```
