# stock-templates fixtures

과거에 배포된 `templates/.claude/skills/**` · `templates/.claude/rules/*.md`의 **바이트 정확 사본**.
`src/commands/migrate.mjs`의 `KNOWN_STOCK_TEMPLATE_SHA256` 테이블(설치본 refresh 판별)과
`tests/migrate-templates.test.mjs`가 대조한다 — 수정하지 말 것.

디렉터리 이름은 `<도입일>-<도입 커밋 8자리>`이고, 그 아래는 `templates/` 기준 상대경로를 그대로 미러한다.
훅 픽스처(`../stock-hooks`)와 달리 경로로 키를 잡는다 — 스킬 3종이 모두 basename `SKILL.md`라
파일명으로는 구분되지 않기 때문이다.

| era | 담긴 파일 | 의미 |
|---|---|---|
| `2026-04-16-6948aa73` | skills 3종 + rules 4종 | initial commit — 규칙에 `harness:rule` 유래 마커가 없던 판 |
| `2026-04-28-15a492fd` | fix-bug · new-feature | review 스킬 제거판 |
| `2026-04-28-bd4ec0e8` | fix-bug · new-feature | 코드 리뷰 기준 내장판 |
| `2026-05-15-75bd1b61` | fix-bug · new-feature | 새 task 인터페이스 반영판 |
| `2026-07-02-c12adc5a` | fix-bug | Pocock git-guardrails·diagnosing-bugs 흡수판 |
| `2026-07-30-2bf26aa1` | fix-bug · new-feature | Task Context Card 도입판 |
| `2026-09-03-58b22848` | new-feature · rules 2종 | D7(OpenCode/Gemini 제외)·감사 수정판 |
| `2026-09-07-286ef8e9` | new-feature | **Pocock Phase 3 수직 슬라이스 규율 직전판** |

마지막 era가 이 refresh 경로를 만든 이유다 — `186e436`이 Phase 3를 템플릿에 넣었지만
`copyStaticAssets`의 `skipExisting` 때문에 기존 설치에는 영영 도달하지 않았다.

새 era를 추가하려면 픽스처 파일과 `KNOWN_STOCK_TEMPLATE_SHA256` 항목을 **같이** 넣어야 한다 —
테이블 드리프트 가드 테스트가 개수(현재 20)와 sha 일치를 둘 다 검사한다.
