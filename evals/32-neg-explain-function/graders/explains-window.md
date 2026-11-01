---
type: llm
---

PASS if the explanation of `isAllowed` states that only failures within the last 15 minutes (the `WINDOW_MS` window) count toward the limit, with older failures dropped or ignored.

FAIL if it does not mention this time window.
