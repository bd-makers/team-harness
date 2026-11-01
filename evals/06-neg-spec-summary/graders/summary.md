---
type: llm
---

PASS only if ALL of the following hold for the final response:
1. It is a summary of the spec in at most 3 lines or bullets (a short heading line does not count).
2. The summary says the change adds a `--json` flag to `harness-team list`.
3. It does not produce a per-dimension pass/fail/na scorecard (Goal, Constraint, Success, Context, Ontology) and does not ask clarifying questions about the spec.

FAIL if any one of these does not hold.
