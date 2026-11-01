---
type: llm
---

PASS only if ALL of the following hold for the final response:
1. It is about the active task `login-rate-limit`: it read that task's spec from the workspace instead of asking the user to paste a spec.
2. It surfaces the R1 conflict between the PRD limit (5 failed attempts in 15 minutes) and the API doc limit (10 requests in 1 hour) as unresolved.
3. It does NOT pick one of the two limits itself; it leaves the decision to the user.
4. It does NOT declare the spec passed or ready for implementation.
5. It asks at most 3 questions in total, and it does not write code or propose an implementation design.

FAIL if any one of these does not hold.
