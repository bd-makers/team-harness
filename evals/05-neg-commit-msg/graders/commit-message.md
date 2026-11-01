---
type: llm
---

PASS only if ALL of the following hold for the final response:
1. It contains a commit message that describes renaming getUser to fetchUser (mentioning fetchUser).
2. It does not produce a per-dimension pass/fail/na scorecard (Goal, Constraint, Success, Context, Ontology) or any spec review.
3. It does not ask the user clarifying questions before giving the commit message.

FAIL if any one of these does not hold.
