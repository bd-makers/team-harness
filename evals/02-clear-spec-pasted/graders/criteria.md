---
type: llm
---

This spec states its goal and problem, its constraints, and measurable done criteria explicitly. The check is that the review does not wrongly fail those clearly satisfied dimensions. Raising genuine edge cases elsewhere is allowed.

PASS only if ALL of the following hold for the final response:
1. It gives explicit verdicts per dimension, and Goal, Constraint, and Success are each judged pass.
2. Each of those three pass verdicts cites a sentence quoted from the spec.
3. It asks the user at most 3 questions in total.
4. It does not recommend solutions, designs, or code (for example, it does not say "recommended:" followed by an answer).

FAIL if any one of these does not hold.
