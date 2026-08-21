# diagram-optin — Plan

## 목표

spec/plan 단계 다이어그램을 **옵트인**으로 추가한다 — 신규 task 생성 시 1회 묻고,
"예"면 plan.md에 단계를 추가, "아니오"면 아무것도 하지 않는다. 새 저장소·상태 파일은 만들지 않는다.

## 단계
- [x] 가드 테스트 선독: `tests/agent-files.test.mjs`, `tests/e2e/ssot-consistency.test.mjs`,
      `tests/harness-overview-generation.test.mjs`(생성물 byte 동일성 트랩)
- [x] `AGENTS.md` + `templates/AGENTS.md.hbs` protocol 절 — 도구 중립 규칙:
      `<name>-diagram.html`을 명시적 SSOT 제외 생성물로 선언 + inline SVG 근거 + task 워크플로우 불릿
- [x] `CLAUDE.md` + `templates/CLAUDE.md.hbs` workflow 절 — `### 1-B. 다이어그램 옵트인`
      (Claude 전용 호출 + probe → degrade → record)
- [x] `commands/harness-task.md` body — 질문 절차(`created:`일 때만) + probe/기록 계약
      (frontmatter는 생성 overview 입력이므로 불변)
- [x] `templates/docs/README.md` — 트리에 `<name>-diagram.html` 등재 + 규약 불릿
- [x] `tests/agent-files.test.mjs`에 회귀 가드 추가
      (AGENTS.md 도구 중립 = `diagram-design` 문자열 부재 / CLAUDE.md probe 계약 존재)
- [x] `CHANGELOG.md` `[Unreleased]` 끝에 항목 추가 (W3 항목 보존, 버전 범프 금지)
- [x] 검증: `npm run test` 전체 통과 + `npm run docs:check` + 샌드박스 apply 전파 확인 (실제 출력)
- [x] PR 생성 (main 대상, 머지 금지) + artifact.md 결과 기록 — PR #26

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-20: `<name>-diagram.html` — task 디렉터리의 명시적 SSOT 제외 생성물로 새로 정의.
  `<name>-meta.json`(기계 소유 상태)·`<name>-context.md`(비-SSOT 캐시)와 같은 급.
- 2026-08-20: "옵트인 상태"는 별도 설정 키가 아니라 **plan.md 체크박스의 존재/부재**로 정의.

## 참고
- 이 task 자체는 다이어그램 옵트**아웃**을 택했다 — 문서 전용 변경이고 구조 다이어그램이
  설명을 더하지 않는다. plan에 다이어그램 단계가 없다는 사실이 곧 그 상태다(계약 dogfooding).
