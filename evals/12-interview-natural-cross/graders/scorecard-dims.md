---
type: regex
target: last_message
flags: i
weight: 0.5
---
^(?=[\s\S]*(Goal|목표))(?=[\s\S]*(Constraint|제약))(?=[\s\S]*(Success|성공))(?=[\s\S]*(Context|맥락))(?=[\s\S]*(Ontology|온톨로지))(?=[\s\S]*\b(pass|fail|na)\b)
