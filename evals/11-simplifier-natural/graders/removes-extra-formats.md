---
type: llm
---

The spec puts every non-CSV format out of scope, but the plan adds XLSX, PDF and JSON to an `ExportFormat` enum and stubs their exporters.
PASS if the response proposes removing the XLSX, PDF and JSON formats (the enum values and/or the stub exporters).
FAIL if it keeps them or does not mention them.
