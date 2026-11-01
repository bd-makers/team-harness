---
type: llm
---

The spec caps the result at 5,000 rows and puts background export out of scope, but the plan adds an export job queue and a progress-polling API.
PASS if the response proposes removing the job queue and progress-polling API.
FAIL if it keeps them or does not mention them.
