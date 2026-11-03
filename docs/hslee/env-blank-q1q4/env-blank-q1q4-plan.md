# env-blank-q1q4 — Plan

## 목표
D12 정정 역할 ① 빈칸 보고 — `stack`·doctor가 Q1(런타임 버전)·Q2(lockfile)·Q4(bootstrap)의 빈칸을 알리고, 답한 선언과 Q3(서비스·환경 변수
계약 파일)는 경로만 가리킨다. 의존성 0개 저장소에는 Q2·Q4를 묻지 않는다. 언어 지식은 프리셋 `env.declare`에만(D11).

## 단계
- [x] D-1–D-9를 정본·실측으로 결정해 spec에 반영하고, 영향 파일 5개·새 조건 종류에 대해 메인테이너 escalation 답을 받는다
- [x] `nonEmptyKey`·`detectDeclarations`·`.env` 가드·`stack` 출력·doctor 검사 테스트를 먼저 쓰고 red를 확인한다
- [x] 프리셋 `env.declare`(node·python)와 `presets.mjs` 평가기(`nonEmptyKey`·`condFile` 일반화)를 구현한다
- [x] `stack` envelope `declarations`·요약 축을 구현한다 (status·next_actions 불변, 5줄 예산 유지)
- [x] doctor `env declarations` 검사를 구현하고 init-smoke e2e 단언을 새 계약에 맞춘다
- [x] `npm test` 전체 fail 0과 `docs:check`를 확인한다
- [x] scratchpad e2e — 선언 있는/없는 프로젝트를 `stack --target`·`doctor`로 확인한다
- [x] codex 리뷰를 실행하고 판별·조치를 artifact `## Reviews`에 기록한다
- [x] CHANGELOG `## [Unreleased]`와 `skills/harness-team/SKILL.md`의 `stack` 줄에 소비자 영향을 적는다

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-03: 선언·빈칸·해당 없음·hasDependencies 신설 — Q1은 런타임 버전 절반만, Q3는 경로만.

## 참고
- spec: `env-blank-q1q4-spec.md` · 결정: `docs/decisions.md` D11·D12(정정 절) · 직전 task: `docs/hslee/env-state-q5/`(PR #165, 이 브랜치의 base)
