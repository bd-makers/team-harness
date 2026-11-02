# env-state-q5 — Plan

## 목표
D12 정정 Q5의 한 축 — lockfile이 선언한 의존성 설치의 흔적이 디스크에 있는가 — 를 `harness-team stack`이 관측해 보고한다.
흔적이 없으면 warning과 bootstrap 명령을 넘긴다. 언어 지식은 프리셋 `env.installTrace`에만(D11). 런타임 버전은 다음 task(spec D-1).

## 단계
- [x] D-1(런타임 버전 범위)–D-6을 실측·정본으로 결정해 spec에 반영하고 Ambiguity 게이트를 닫는다
- [x] `installTrace` 평가기·프리셋 규칙·`stack` 출력 테스트를 먼저 쓰고 red를 확인한다
- [x] 프리셋 `env.installTrace`(node·python)와 `presets.mjs` 평가기를 구현한다
- [x] `stack` envelope `installTrace`·요약 축·warning·bootstrap `next_actions`를 구현한다 (5줄 예산 유지)
- [x] `npm test` 전체 fail 0과 `docs:check`를 확인한다
- [x] scratchpad e2e — lockfile만 있는 미설치·설치된 프로젝트에서 `stack --target`을 확인한다
- [x] codex 리뷰를 실행하고 판별·조치를 artifact `## Reviews`에 기록한다
- [x] CHANGELOG `## [Unreleased]`와 `skills/harness-team/SKILL.md`의 `stack` 줄에 소비자 영향을 적는다

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-03: 설치 흔적(install trace)·installTrace 규칙 신설 — "준비됨"이 아니라 관측 이름.

## 참고
- spec: `env-state-q5-spec.md` · 결정: `docs/decisions.md` D11·D12(정정 절) · 직전 task: `docs/hslee/env-describe/`
