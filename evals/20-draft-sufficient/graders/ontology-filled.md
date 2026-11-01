---
type: regex
target:
  source: file
  path: docs/hslee/csv-export/csv-export-spec.md
flags: m
match: not_contains
---
^- \*\*개념 [AB]\*\*:\s*$
