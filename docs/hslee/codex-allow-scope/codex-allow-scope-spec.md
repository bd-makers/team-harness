# codex-allow-scope — Spec

## 목적 / 요구사항
- **문제**: 템플릿 `.claude/settings.json:10`의 `Bash(codex:*)`가 codex 명령 **전체**를 승인 없이 허용한다 — `--sandbox danger-full-access`,
  `--dangerously-bypass-approvals-and-sandbox`, `--dangerously-bypass-hook-trust`(codex-cli `exec --help` 실측) 포함. D2의 "리뷰어 read-only"와
  강의 02 도구 하위 시스템의 최소 권한에 어긋난다(task `subsystem-audit` 후보 B, 도구 T2).
- **영향**: init·migrate로 settings를 받은 모든 소비자. 하네스 자체 리뷰 경로 `harness-team review codex`는 node가 codex를 직접 spawn하므로
  (`src/commands/review.mjs:386`) 이 allow에 기대지 않는다.
- **기대 결과**: 템플릿에서 항목을 빼고, 이미 설치된 소비자도 정리할 경로를 둔다. 에이전트가 codex를 직접 부르면 승인을 묻는다.
- **제약**: D8 — 사용자 커스터마이즈는 덮지 않는다(정확히 그 문자열만 대상). 새 명령 없음. eager 증가 없음.

## 범위 (In / Out)
- **In**: `templates/.claude/settings.json`, `src/commands/migrate.mjs`(`migrateCodexAllow`), `tests/settings-permissions.test.mjs`·`tests/migrate-session-hook.test.mjs`, `CHANGELOG.md` `[Unreleased]`, `templates/AGENTS.md.hbs`·`AGENTS.md` 역할 표 — 7개(메인테이너 승인 범위).
- **Out**: `harness-team` 자체 allow 추가(감사 T1 미확인), doctor `codex exec --dangerously-bypass-hook-trust` 안내(사람이 치는 명령, `doctor.mjs:511`).

## 원천 검토 (R1)
### 원천
- task `subsystem-audit` 후보 B, `docs/decisions.md` D2·D8·D11(2차 장치 규칙).
- Claude Code 공식 문서 Configure permissions(https://code.claude.com/docs/en/permissions, 2026-11-04 확인).

### 발견 (실측 3건)
- **M-1 접두 규칙이 뒤에 붙는 위험 플래그를 막는가 → 막지 못한다.** 공식 문서: "Bash rules match the whole command text, with `*` standing in for any text",
  `:*`는 끝의 `*`와 같다. 따라서 `Bash(codex exec --sandbox read-only *)`도 `codex exec --sandbox read-only --dangerously-bypass-approvals-and-sandbox …`를
  허용한다. 문서도 인수를 제약하는 Bash 규칙은 "fragile"하다고 경고한다. → **좁히기는 효과가 없고 제거만 의미가 있다.** (라이브 실측 아님, 1차 문서 근거)
- **M-2 합집합 병합** — `deepMergeJson`은 배열을 합집합으로 합친다(`src/merge.mjs:13`). 템플릿에서 빼도 기존 설치에서는 지워지지 않는다.
  선례: `migrateSessionStartHook`(`src/commands/migrate.mjs:714`)이 상태 기준으로 settings.json을 읽고 확인 뒤 고친다.
  - 안 ① **migrate 일회성 단계**: `permissions.allow`에 정확히 `"Bash(codex:*)"`가 있으면 확인 후 그 원소만 제거. 갱신 경로(§4-5 일회성 변환)와 같은 자리이고 새 장치가 아니다.
  - 안 ② **doctor 안내**: 새 검사 하나 + 사람이 수동 삭제. 2차 장치 규칙상 "보여 주기 위한 새 장치"다.
  - (open) 어느 쪽인지 — 권장 ①.
  → 결정(2026-11-04, 메인테이너 "권장안대로"): ① migrate 일회성 단계 `migrateCodexAllow`.
- **M-3 직접 호출 안내** — 세 곳이다.
  - `commands/harness-review.md:169` runner 표: `review.mjs`가 구현하는 정본 명세라 그대로 둔다(에이전트는 3단계에서 `harness-team review`를 실행한다 — `:73`).
  - `templates/AGENTS.md.hbs:46`·루트 `AGENTS.md:46` 역할 표 "호출 방식: Bash: `codex exec --sandbox read-only`": allow를 빼면 이 안내대로 부를 때마다 승인을 묻는다.
    `harness-team review codex`로 바꾸면 짧아진다(eager 감소). 관리 절 `roles`라 소비자는 init 재렌더로만 받는다.
  - (open) 역할 표를 이번에 바꿀지.
  → 결정(2026-11-04, 메인테이너): 바꾼다 — 템플릿·루트 둘 다 `harness-team review codex`(eager 17,267 → 17,256 B).
- (open) "codex read-only가 Claude의 `Read(./.env)` deny 밖에서 파일을 읽는다" — **미확인**으로 둔다. 판정을 바꾸지 않는다(M-1만으로 제거 근거가 충분).

## 설계 / 접근
템플릿에서 `Bash(codex:*)`를 뺀다. migrate는 `permissions.allow`에 정확히 그 문자열이 있으면 확인(`--yes`면 생략) 뒤 그 원소만 지운다 — `migrateSessionStartHook`과 같은 상태 기준·확인·쓰기 형태. 다른 codex 규칙은 사용자 것이라 남긴다(D8). 역할 표 호출 방식은 `harness-team review codex`.
2차 장치 규칙: 원래 장치(allow)를 **줄이는** 변경이고, 소비자 정리는 기존 갱신 경로(migrate)에 일회성 단계로 둔다 — doctor 새 검사는 두지 않는다.

## Ontology
- **리뷰어 allow**: settings `permissions.allow`의 `Bash(codex:*)` 한 원소. 제거 대상은 이 정확한 문자열뿐이다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%)
- [x] **Constraint 명확도** (30%)
- [x] **Success 기준** (30%) — 템플릿에 항목 없음·migrate가 정확히 그 원소만 제거(테스트), `npm test` fail 0, eager 감소
- [x] **Context 명확도** (brownfield 한정)
- [x] **Ambiguity ≤ 0.2** — 1.0

## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "required" }
```
-->

## 참고
- 테스트: `tests/migrate-session-hook.test.mjs` "migrateCodexAllow: …" 2개, `tests/settings-permissions.test.mjs` 템플릿 검사.
- 영향 파일(안 ① + 역할 표 포함): `templates/.claude/settings.json`, `src/commands/migrate.mjs`, `tests/settings-permissions.test.mjs`(`:111`·`:145`가 `Bash(codex:*)`를 기대),
  migrate 테스트, `CHANGELOG.md`, `templates/AGENTS.md.hbs`, `AGENTS.md` — 7개 + task 문서. CLAUDE.md §5-A(5개 이상)로 착수 전 멈췄고, 2026-11-04 메인테이너가 이 7개 범위를 승인했다.
