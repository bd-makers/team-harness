---
type: llm
---

The flaky test issues a token with `ttlMs: 50`, sleeps exactly 50 ms on the real clock, then asserts `isExpired(token)`. `isExpired` returns `now > token.expiresAt` with `now = Date.now()`, a strict comparison.

PASS if the response explains the intermittent failure as an exact-boundary timing problem: the sleep equals the TTL, so the elapsed `Date.now()` time can land exactly on `expiresAt` (or a millisecond short of it), and the strict `>` then returns false.

FAIL if the response blames something else (shared state, test order, random UUIDs, async handling) as the main cause, or only says "timers are imprecise" without connecting it to the sleep being equal to the TTL and the strict comparison.
