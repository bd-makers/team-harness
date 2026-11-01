---
type: regex
target:
  source: file
  path: test/pricing.test.js
flags: i
weight: 0.5
---
^(?=[\s\S]*//\s*(?:given|arrange))(?=[\s\S]*//\s*(?:when|act)\b)(?=[\s\S]*//\s*(?:then|assert)\b)
