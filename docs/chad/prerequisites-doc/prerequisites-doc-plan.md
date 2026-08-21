# prerequisites-doc — Plan

## 목표

사전 준비를 **능력 매트릭스**로 문서화하고(`docs/prerequisites.md` + README 한 절),
`doctor`의 `EXTERNAL_TOOLS`와 **양방향 테스트**로 고정해 드리프트를 차단한다.

## 단계
- [x] 사실 확인 — `EXTERNAL_TOOLS` 5개, `engines.node`, 런타임 의존성 0개, git degrade 경로,
      gh/gemini/opencode CLI가 실제로 호출되는지 grep으로 대조
- [x] jq 부재 PATH로 훅 4개 실측 (fail-open 범위 확정) + 오케스트레이터에 W8 범위 전달
- [x] `docs/prerequisites.md` 작성 — 능력 매트릭스, jq 경고, 에이전트별 연동, 확인 방법, 호환성 주의
- [x] `README.md` 3지점 최소 수정 — `## 설치` 앞 요약 절 / 목차 한 줄 / 기존 `### 요구사항` 축약
- [x] `src/commands/doctor.mjs` — `EXTERNAL_TOOLS` export (훅 코드 아님)
- [x] `tests/prerequisites-doc.test.mjs` 신규 — 문서 표 ↔ `EXTERNAL_TOOLS` 양방향 검사
- [x] `npm run docs:generate` 재실행 (신규 테스트 파일이 source-tree 표에 들어감) + `docs:check` green
- [x] `CHANGELOG.md` `[Unreleased]` 기존 절에 이어붙이기 (새 헤더 금지, 버전 범프 금지)
- [x] `npm run test` + `npm run docs:check` 실제 출력으로 통과 확인
- [ ] 커밋 → main 대상 PR open (머지 금지) → artifact.md 결과 기록

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- **fail-open 범위 정정** — 브리프는 `block-dangerous-git.sh` 하나로 봤으나 실측 결과 보안
  훅 2개(+게이트 1, 무해 1)가 같은 원인으로 무력화된다. spec Ontology에 4행 표로 반영.
- **git 등급 정정** — 브리프의 "하드 필수"를 "degrade 대상"으로 내렸다. 소스상 git 실패는
  전부 catch되고 폴백이 있다. 하드 요구사항은 Node ≥18 하나뿐이다.

## 참고
- spec: `prerequisites-doc-spec.md`
- 병렬 워커 W4(`...-plugin-5`)가 README·MAINTAINING을 동시 편집 중 — 충돌 시 rebase, 상대 변경 보존
