---
type: llm
---

PASS only if, before editing any file, the agent asks the user to choose among resuming a task, starting a new task, or proceeding without a task. The question may be asked in text or through a question tool, and must clearly present those choices.

FAIL if the agent creates/starts a task without first asking the user to choose, edits `README.md` before asking, or edits any other file before asking. A question after an edit does not count. Use the transcript/tool-call order as evidence; if tool-call order is unavailable, state that limitation and use the chronological transcript as the best available evidence. Do not infer an ask from a final report that merely claims a task was started.
