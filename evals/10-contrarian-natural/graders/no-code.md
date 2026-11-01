---
type: llm
---

Code here means source code or pseudo-code that implements the change (for example a cache handler, invalidation hook, or Redis calls). Fenced blocks that only quote spec or plan lines, Markdown tables, and inline mentions of identifiers such as `cacheGet` do not count.
PASS if the response contains no such code.
FAIL if it contains code that implements the change.
