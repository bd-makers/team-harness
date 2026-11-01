---
type: llm
focus:
  source: file
  path: docs/hslee/csv-export/csv-export-spec.md
---

The prompt that produced this spec gave only these facts: the ops team copy-pastes the admin order list into Excel (about 3 hours a week, rows get dropped); add a "CSV 내보내기" button to the admin order list that downloads the currently filtered orders as CSV; reuse the existing `GET /admin/orders` endpoint with no new dependency; at most 10,000 rows per export; CSV data row count equals the on-screen total; exactly 4 columns (order number, order date, customer name, amount); UTF-8 BOM so Korean text opens in Excel; affected files `src/admin/OrdersPage.tsx` and `src/admin/api.ts`; out of scope: other screens and xlsx.

Look only at the requirement items in the `목적 / 요구사항` and `범위 (In / Out)` sections. Ignore the Ontology, design, self-check, and 참고 sections, and ignore anything marked `(open)` or `(unresolved)`.
Restating a fact in other words, splitting it into several items, or stating a direct consequence of a fact (for example "no server change" from "reuse the existing endpoint") is not an invention.
PASS if none of those requirement items introduces something the facts do not contain: an extra or different column, a different row limit, permissions or roles, audit logging, async or background export, email delivery, scheduling, another file format, a file-naming rule, or UI beyond the one button.
FAIL if any requirement item introduces one of those.
