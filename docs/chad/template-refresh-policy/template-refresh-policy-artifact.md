# template-refresh-policy — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings


## 실행 결과 (2026-09-07)

### 무엇을 했나

`refreshClaudeHooks`의 provenance-refresh 정책을 스킬 3 + 규칙 4로 확장하고, `doctor`에 stale 경고를
붙여 그 경로를 발견 가능하게 했다. 정적 템플릿 16개 중 refresh 적용 범위가 **6 → 13**이 됐다
(`docs/` seed 3개는 의도적 비목표).

| 파일 | 변경 |
|---|---|
| `src/commands/migrate.mjs` | `collectStale` 추출(표면 무관) · `REFRESHABLE_TEMPLATE_FILES` · `KNOWN_STOCK_TEMPLATE_SHA256`(20종) · `refreshClaudeTemplates` · `findStaleTemplates`/`isKnownStockTemplate`(doctor용 read-only) |
| `src/commands/doctor.mjs` | `stale skill/rule templates` 경고 + `next_actions`에 migrate 라우팅 · `DECISION_HEADINGS`에 D8 |
| `src/commands/rules.mjs` | `checkRuleProvenance(targetDir, { isKnownStock })` — stock 규칙은 유래 검사에서 제외 |
| `tests/migrate-templates.test.mjs` | 신규 9종 |
| `tests/fixtures/stock-templates/` | 8 era · 20 파일 (+ README) |
| `commands/harness-init.md` | 재실행 계약에 비대칭·migrate 경로 명시 |
| `docs/decisions.md` · `templates/docs/decisions.md` | D8 |

### 핵심 발견 — 정책은 이미 존재했다

인계 문서는 정책 후보 (a) 명시적 refresh 명령 / (b) 마커 병합 / (c) 버전 스탬프+drift 보고 중
고르라고 했으나, **셋 다 필요 없었다**. `migrate.mjs:335`의 `refreshClaudeHooks`가 이미 (a)+(c)의
결합을 구현하고 있었고 주석이 스스로를 "the explicit opt-in delivery path"라고 부른다.
문제는 정책 부재가 아니라 **적용 범위**(16개 중 6개)와 **발견성**(아무도 migrate를 부르지 않음)이었다.

교훈: 인계의 옵션 목록은 그 세션이 아는 것까지만 반영한다. 옵션을 고르기 전에 **레포가 이미 같은
문제를 푼 적 있는지** 먼저 찾는다.

### 실측 (소스 독해 아님)

샌드박스 소비자 프로젝트(`init` → 템플릿 수정 → `init` 재실행):
- 템플릿 **수정** → 기존 설치 **도달 안 함** (`12 skipped as existing`)
- 템플릿 **신규 파일** → **도달함**
→ `copyTree`의 `skipExisting`이 파일 단위라 생기는 비대칭. `tests/migrate-templates.test.mjs`의
"전제" 테스트가 이 비대칭 자체를 고정한다 — 전제가 바뀌면 테스트가 깨진다.

end-to-end: doctor `warning` + `next_actions: ['harness-team migrate']` → `migrate --yes` →
Phase 3 배달 확인 → doctor `success`.

### 함정 두 개

1. **sha 테이블 값은 내용의 sha256, 주석의 `// 58c4fe2e`는 git blob sha다.** `58c4fe2e`는
   commit이 아니라 blob이라 `git show 58c4fe2e:path`가 빈 출력을 준다(= 빈 문자열의 sha256
   `e3b0c442…`). 이걸 혼동하면 모든 파일이 "customized"로 읽혀 refresh가 조용히 아무것도 안 한다.
   `git cat-file blob <blob> | shasum -a 256`으로 2개 항목 교차 검증 후 진행했다.
2. **규칙 유래 경고와의 이중 보고.** 마커 도입 이전 stock 규칙은 `checkRuleProvenance`가
   "유래 없음 — 스탬프를 찍어라"로, 새 검사가 "낡음 — migrate"로 **동시에** 보고했다. 같은 파일에
   상충하는 처방 두 개다. stock 판정 파일을 유래 검사에서 제외해 해소(경고 1개로 확인).

### 부수 발견

`docs/decisions.md`는 `templates/docs/decisions.md`와 **바이트 동일**해야 한다
(`tests/agent-files.test.mjs`). D-절을 추가하면 `DECISION_HEADINGS`(doctor)도 함께 갱신해야 하고,
누락 목록을 하드코딩한 테스트 2개가 같이 움직인다. 드리프트 가드가 셋 다 잡아냈다 — 설계대로다.

### 검증

- `npm test` → **645개 중 644 pass · fail 0 · skip 1**(기존). 기존 훅 refresh 테스트 8개 전부 통과
  = 리팩터가 동작 보존.
- `npm run docs:check` → PASS · `node bin/harness-team.mjs doctor` → PASS(plugin-dev)
- 샌드박스 end-to-end 2회(위)

### 남은 것 / 열린 질문

- **sha 테이블은 손으로 유지한다.** 표면 13개라 감당 가능하지만 크게 늘면 재검토(D8에 명시).
  픽스처 개수 대조(현재 20) 드리프트 가드가 안전망.
- **이미 벌어진 드리프트의 규모는 미측정.** 이 레포는 plugin-dev라 대상이 아니고, 실제 소비자
  프로젝트에서 `doctor`를 돌려 봐야 안다. 이제 경고가 있으니 다음 소비자 세션이 자연히 알게 된다.
- Pocock 백로그 #3(CONTEXT.md glossary + `docs/adr/`)은 *새* 파일 배포라 이 문제에 덜 걸린다.
