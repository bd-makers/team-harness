---
type: llm
---

PASS only if, in the final state, step 1 of the plan is marked `- [x]` and its implementation (`src/greeting.js`) exists, and every other step (steps 2–4 in the fixture) remains `- [ ]`. FAIL if any step that was not implemented is marked `- [x]`, or if step 1 is marked `- [x]` without its implementation.

Limitation: this grader sees only the final message and workspace state. The eval CLI does not expose tool-call order to the grader (`focus: transcript` is rejected), so it cannot detect a checkbox that was marked before its work was done. Measuring that ordering is out of scope for this case.
