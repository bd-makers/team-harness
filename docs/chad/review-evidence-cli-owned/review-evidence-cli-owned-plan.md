# review-evidence-cli-owned — Plan

## 목표

리뷰 엔진의 실행과 증거 기록을 `harness-team review` CLI가 소유하게 하고, `verify: required` 가드가
harness 소유 `meta.reviews[]`를 읽게 한다. 위협 모델·runner 계약·구 task 동작은 그대로 둔다.

## 단계

- [ ] **meta 템플릿 `reviews: []`** — `taskMetaTemplate`(`src/commands/summary.mjs`)에 추가. 주석에 "CLI만 쓴다,
      키 없는 구 meta는 degrade" 명시. `commands/harness-task.md` meta 절 갱신.
- [ ] **`harness-team review` 골격** — `src/commands/review.mjs` 신설, `src/cli-args.mjs` COMMANDS 등록
      (`tests/cli-drift.test.mjs` 통과), `bin/harness-team.mjs` 라우팅. 인자: 엔진·`--framing`·`--prompt-file`·
      `--scope`·`--base`·focus·`--json`. `--framing`은 `VERIFY_KIND_SUFFIXES` 대조(밖이면 error 패킷).
- [ ] **엔진 runner** — 문서 표를 코드로: codex(`stdio ignore`), claude(`-p --permission-mode plan`), custom
      (`.harness/reviewers.json`, `{prompt}` POSIX 단일 인용 치환 → `sh -c`). probe 폴백 체인. scope 결정
      (worktree/diff, `--base` 폴백). 공용 리뷰 프롬프트를 src 상수로.
- [ ] **기록 경로** — 성공(exit 0)만: `meta.reviews[]` append + artifact `## Reviews` 블록(헤딩·fenced 출력·
      상한 초과 표기·종전 형식 마커). 실패: 아무것도 쓰지 않고 error 패킷(stderr tail). `runRetro` append 방식 재사용.
- [ ] **done 가드 분기** — `collectDoneIssues`: meta에 `reviews` 키가 있으면 verify는 `meta.reviews`만,
      review는 meta ∪ artifact 마커. 키 없으면 종전 경로. 판정 창 계산 불변.
- [ ] **문서 계약** — `commands/harness-review.md` 3·5단계를 CLI 호출로 교체, "마커를 손으로 append" 지시 제거.
      프레이밍 커맨드 5종(`harness-adversarial-review`·testcritic 인계·`harness-ship`·contrarian·simplifier
      외부 엔진 모드)이 `--framing --prompt-file`로 호출하도록 갱신. `skills/*/SKILL.md` 미러 동기화
      (`tests/manifest-sync.test.mjs` 확인).
- [ ] **다이어그램** — `review-evidence-cli-owned-diagram.html`, 자립형 inline SVG. 에이전트 → CLI → 엔진 →
      meta/artifact → 가드(신규/레거시 분기) 흐름 1장.
- [ ] **테스트** — `tests/review-command.test.mjs` 신설: custom 엔진을 fake 스크립트로 (a) exit 0 → meta+artifact
      기록, (b) exit 1 → 미기록 + 패킷, (c) `--framing` kind 조립·allowlist 거부, (d) 출력 상한 잘라내기 표기.
      `tests/done-guard.test.mjs`: (e) 새 meta에서 손으로 쓴 verify 마커만 → 차단, (f) meta 항목 → 통과,
      (g) 구 meta 회귀 없음, (h) review는 양쪽 인정. 문서 grep 테스트: "손으로 append" 지시 부재.
- [ ] **검증** — `npm run test` 전체 + `npm run docs:check`. 실제 `harness-team review claude`를 이 저장소에서
      1회 실행해 meta·artifact에 기록되는 것을 확인(E2E).
- [ ] **리뷰 (dogfood)** — `harness-team review claude --framing adversarial --prompt-file <adversarial 프롬프트>`.
      codex 가용하면 codex 우선. 4단계 판별은 세션이, 산문은 블록 아래에.
- [ ] **retro** — `/harness-retro` 후 `harness-team done`.

## Ontology 변경 로그

- **리뷰 증거의 정본 이동** (신규) — artifact 마커(에이전트 작성) → `meta.reviews[]`(CLI 작성). 마커는
  사람용·하위 호환으로 남는다. spec Ontology "리뷰 증거"·"CLI 소유" 참조.
- **실행 증거 / 품질 증거 분리** (신규) — 이 task는 전자만 기계화한다. `verify-evidence-gate`가 수용한
  "마커 신뢰 기반 부분 검증"의 한계는 후자에 대해 그대로 남는다.

## 참고

- 다이어그램 옵트인: 2026-09-10 물었고 **넣기로 결정** — 단계로 등록했다.
- 선행 결정: `verify-evidence-gate`(마커 신뢰 수용), `done-guard-window`(meta 손대기 = 고의).
- 기각한 대안: HMAC 서명 마커 — spec `### 왜 서명이 아니라 meta인가`.
