---
type: llm
---

The spec asks for a single CSV download, but the plan designs an `Exporter` interface and an `ExporterRegistry` plugin registry.
PASS if the response proposes removing the `Exporter` interface / `ExporterRegistry` registry (for example because only one format exists).
FAIL if it keeps the registry or does not mention it.
