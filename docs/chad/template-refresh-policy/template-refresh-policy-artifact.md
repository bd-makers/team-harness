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

## Reviews

### 2026-09-08 KST (2026-09-07T15:12:05Z) — Codex review (`8dd52c3`, read-only)

`codex exec --sandbox read-only -m gpt-5.6-sol`. 결과: **승인 불가 — BLOCKER 0 · MAJOR 3 · MINOR 3.**
D6에 따라 각 발견을 **재현·판별한 뒤** 반영했다(검증자는 반박만, 수정은 작성 세션이 단일 스레드로).

| # | 심각도 | 발견 | 판별 | 조치 |
|---|---|---|---|---|
| 1 | MAJOR | 규칙 refresh가 `.cursor/rules/*.mdc` 미러를 갱신하지 않음 | **재현됨** — migrate 후 `.claude`는 최신, `.cursor`는 옛 내용. doctor는 `.claude`만 보므로 정상으로 돌아와 드리프트가 숨는다 | **수정** — `mirrorCursorRules()` 호출(`rules promote`와 같은 규약) + 회귀 테스트 |
| 2 | MAJOR | `legacyStock`(pnpm 휴리스틱)이 사용자 커스텀 훅을 stock으로 오분류 | **타당하나 이 변경의 산물이 아님** — 부모 커밋의 휴리스틱을 그대로 보존한 것이고(리뷰어도 인정), 훅 표면의 기존 계약이다 | **미수정, 사용자 판단으로 이관**(아래) |
| 3 | MAJOR | 판정↔쓰기 사이 TOCTOU + leaf symlink 타깃 덮어쓰기 | **재현됨** — leaf symlink에 쓰면 링크 바깥 파일이 덮인다 | **수정** — `writeRefreshed` 가드: 쓰기 직전 내용 재검증 + leaf symlink 거부. **디렉터리 symlink(공식 구조)는 통과** — 양쪽 다 테스트로 고정 |
| 4 | MINOR | unreadable 파일을 "미설치"로 오인(`readTextSafe` → null) | 타당. 기존 `refreshClaudeHooks`도 동일하고, `checkRuleProvenance`는 이미 구분한다 | 미수정 — 표면 일관성 문제로 별건 |
| 5 | MINOR | `isKnownStock`은 provenance가 아니라 내용 동일성 | 타당하나 범위가 좁다 — 테이블 키가 경로라 사용자 규칙이 `testing.md` 등 **정확히 같은 이름**이고 바이트까지 같아야 발생 | 미수정 — 한계로 문서화. 억제 경계는 테스트로 고정돼 있다 |
| 6 | MINOR | sha 테이블 테스트가 fixture→table 단방향 | **타당** — 근거 없는 sha를 테이블에 넣어도 통과했다 | **수정** — 역방향(table→fixture) + **git 이력 완전성** 테스트 추가 |

**리뷰어가 정상 확인한 것**: 미설치 파일을 새로 만들지 않음 · 일반 파일 권한 보존과 훅 `0755` ·
`refreshClaudeHooks`의 순서·판정·출력·`legacyStock`이 부모와 동일 · **sha 테이블 20개는 git 이력
전수 대조 결과 누락·초과·오류 없음**(내 `origin/main` 재확인과 독립적으로 일치).

**리뷰어가 못 한 것**: read-only 샌드박스라 테스트 미실행. 2차 Codex 리뷰어는 소켓 권한 오류로 미기동.

검증: `npm test` **655개 중 654 pass · fail 0 · skip 1** · `docs:check` PASS · `doctor` PASS.

`writeRefreshed`의 두 가드 중 **leaf symlink 거부는 테스트로 고정**했고, **내용 재검증(TOCTOU)
분기는 테스트가 없다** — 판정과 쓰기 사이에 끼어드는 경합은 공개 API 밖이라 코드를 테스트용으로
비틀지 않고 남겨 뒀다. 방어 심층화이지 단독 계약이 아니다.

#2를 남긴 이유: 훅 refresh의 기존 안전 계약을 바꾸는 일이라 이 task(스킬·규칙 확장)의 범위 밖이고,
휴리스틱이 "아주 오래된 바이트 드리프트본을 잡는 net"으로 **의도적으로** 들어가 있다. 좁히면 그
net이 사라진다 — 트레이드오프라 사용자 결정 사항으로 넘긴다.

<!-- harness:review kind=codex scope=diff tip=8dd52c3a5d751ff50f6de42b1596cfffb9b0138d at=2026-09-07T15:12:05Z -->

## 후속 (2026-09-08) — D8 소비자 경고의 마이그레이션 안내

`DECISION_HEADINGS`에 D8을 추가하면서, D8 이전에 스캐폴드된 소비자는 전부
`decision log` 경고를 새로 받게 됐다. 기존 문구는 **무엇이 없는지만** 말하고
**왜 명령으로 안 고쳐지는지**를 말하지 않았다 — 방금 stale 템플릿 때문에 `migrate`를 돌린
사용자는 이것도 처리됐으리라 기대하는데, `docs/` seed는 D8에서 refresh 비목표로 뺀 표면이다.

- 문구에 **init·migrate 어느 쪽도 덮어쓰지 않는다는 사실과 그 이유(D8)** 를 명시했다.
- `checkDecisionLog(targetDir, root)` — root를 주면 복사해 올 원본의 **절대 경로**를 안내한다.
  `next_actions`는 비워 둔다(실행 가능한 명령이 아니라 수동 병합이므로 — 기존 계약 유지).
- 경로를 **백틱으로 구분**했다. 플러그인이 iCloud 경로(`Mobile Documents`)에 설치되면 공백이
  들어가 구분자 없이는 경로 끝을 알 수 없다 — 실제로 이 머신이 그 경우다.

### 테스트 변경 하나는 단언을 고쳤다

`assert.doesNotMatch(w, /init/)`가 새 문구를 막았다. 의도는 "init로 **유도**하지 말 것"인데
부분일치라 "init·migrate 어느 쪽도 덮어쓰지 않는다"는 **설명**까지 걸렸다.
실행 명령형(`harness-team init`)으로 좁히고, 설명이 있는지를 양성 단언으로 추가했다.
부재 분기가 이미 `/harness-team init/`으로 유도를 판정하고 있어 형태도 일치한다.

새 가드 2종: 안내가 가리키는 원본이 **실제로 존재하고 누락 절을 담는지**(경로가 옮겨져도
산문이라 아무 테스트도 안 깨지던 자리), root 없이 부른 하위호환 경로.

검증: `npm test` **657개 중 656 pass · fail 0 · skip 1** · `docs:check` PASS · `doctor` PASS.
소비자 샌드박스에서 D8 절을 지우고 실측 — 경로가 공백 포함으로도 정확히 추출되고 실재한다.
