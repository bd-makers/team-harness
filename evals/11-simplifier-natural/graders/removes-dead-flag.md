---
type: llm
---

The plan adds a config flag `export.streaming.enabled` whose default is true and which the plan itself says is never turned off.
PASS if the response proposes removing this flag.
FAIL if it keeps the flag or does not mention it.
