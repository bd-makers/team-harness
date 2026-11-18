# diagram-svg — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 뷰 산출물을 단독 SVG `<name>-diagram-<view>.svg`로 바꿨다(`diagramKind`, 결정 A2-1). 레거시 `<name>-diagram.html`은 그대로다.
- `diagram record --view <v>`(생성 기록)가 SVG 자립성을 검사한다 — `svgSelfContainmentViolations`(`src/commands/diagram.mjs`). 허용 목록 방식:
  `href`·`url()`은 `#id`·`data:`·빈 값만, `<script`·`<foreignObject`(접두사·대소문자)·태그 안 `on…=`·`@import`는 위반, 루트는 prolog 뒤 `<svg`이고
  `xmlns="http://www.w3.org/2000/svg"`. 위반이면 exit 1, error 패킷 `root_cause`에 위반 목록, artifact·plan 쓰지 않음. `--skipped`·레거시는 검사하지 않는다.
- `pr-check`: 레거시 HTML이나 뷰 SVG가 있으면 권장 안내 없음, 있는 뷰 SVG마다 `PR 본문에 링크: <path>.svg` note(막지 않음). 뷰 HTML·모르는 뷰는 세지 않는다.
- `clean` `TASK_FILE` 확장자에 `svg`.
- 문서: harness-task 옵트인 절(정본 — 뷰 경로·단독 SVG·기록 시 검사), harness-diagram 6단계(단독 SVG 제약·system font stack·외부 자산 0·추출 금지)·7단계(검사),
  script 뷰어 예외를 레거시로 한정(A1이 남긴 `record --view … "Confluence … script 실행됨"` 예시 삭제 — 검사와 모순), harness-ship 6단계 "PR 본문에 SVG 링크"
  (PR head의 파일 URL)·8단계, SKILL, templates/docs/README, CLI `diagram` summary. CHANGELOG `[Unreleased]`: A1 항목을 `.svg`로 고쳐 쓰고 A2 항목 추가.
- 렌더 실측: Obsidian·GitLab self-managed 모두 미검증(spec R1·참고). 문서 근거만 — Obsidian 지원 형식 Images에 `.svg`(`gh api`로 `obsidianmd/obsidian-help` 확인).
- 검증(2026-11-18): 아래 명령과 출력.
  - `node scripts/test-isolated.mjs --test tests/diagram-command.test.mjs` → pass 37 fail 0. pr-check 24/0, clean 27/0, agent-files 44/0.
  - 검사 함수 변이 6개(http 허용·레거시도 검사·`@import` 규칙 삭제·xmlns 검사 삭제·주석 prolog 삭제·참조 위반 push 삭제)를 손으로 넣어 돌림 → 각각 fail 3·7·2·2·1·3(모두 잡힘), 소스 복원 `cmp` 확인.
  - `npm test` → exit 0 — 본 스위트 tests 1362 · pass 1361 · fail 0 · skipped 1(`CI에서는 jq-present 매트릭스가 반드시 실행된다` — CI 전용 기존 skip), perf 1/1.
  - `npm run docs:check` → "harness overview 생성 상태가 최신입니다."
  - `node bin/harness-team.mjs doctor` → 1 warning(`.codex/hooks.json` 신뢰 없음 — 이 머신의 Codex 훅 승인 상태, 이 변경과 무관).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

- 2026-11-18 자체 점검(AGENTS.md 코드 리뷰 기준 6항목, 작성 세션 — 독립 리뷰 아님):
  - 정확성: spec 설계 절과 일치 — 검사는 `outcome === 'produced' && view`에서만, 존재 검사 뒤·쓰기 전. 링크 note는 뷰 SVG만.
  - 엣지 케이스: BOM·XML 선언·주석·DOCTYPE(외부 DTD URI) prolog, 대소문자·접두사·따옴표 없음·`=` 주변 공백, 빈 파일, HTML 루트, 자식에만 xmlns, 이미 닫힌 단계의 갱신 — 테스트 표본.
  - 회귀: 레거시 HTML(스크립트 포함)·`--skipped`는 검사하지 않음을 테스트로 고정. 뷰 HTML은 미릴리스 형식이라 교체(spec R1).
  - 보안: 파일 읽기만 추가, 경로는 기존 `DIAGRAM_VIEWS` 검사 뒤 조립. 정규식은 역추적 폭발 구조가 없다고 본다(추론 — 큰 입력으로 재지 않음: prolog `*`는 실패 경로가 없고 나머지는 태그 단위 스캔).
  - 단순성: 파서·의존성 없이 문자열 규칙 표 두 개. 알려진 한계: 주석 안도 검사(보수적 오탐), 속성 값 안의 `>`는 태그 경계로 본다.
  - 테스트: 규칙마다 위반 표본이 그 규칙 **하나만** 걸리는지 + 비슷한 허용 표본 통과 — 규칙을 지우거나 넓히면 깨진다(위 변이 결과).

## Learnings

- 설계가 열거한 거부 목록(http/https/`//`)을 그대로 옮기면 같은 문법의 형제(상대 경로·`javascript:`·`url(//…)`)가 샌다 — 자립성처럼 "밖으로 나가지 않는다"는 성질은 허용 목록으로 검사한다.
- 형식을 바꾸면 그 형식에 붙어 있던 예외 문장(A1의 script 뷰어 예시)이 새 검사와 모순될 수 있다 — 같은 사실의 다른 자리를 전수 검색할 때 예시·예외도 본다.
