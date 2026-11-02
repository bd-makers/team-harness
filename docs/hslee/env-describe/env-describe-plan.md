# env-describe — Plan

## 목표
lockfile에서 감지한 재현 install(bootstrap) 명령과 올바른 Python pm을 AGENTS.md `stack` 관리 절 `## 명령`에 적는다 — 언어 지식은 프리셋 데이터로만(D11).
지시 하위 시스템 개선이며 환경 하위 시스템은 다루지 않는다(2026-11-03 재분류, spec 참조).

## 단계
- [x] D-A(범위)·D-B(install 처리) 결정을 spec에 반영하고 Ambiguity 게이트를 닫는다
- [x] 재현 install 플래그 표를 공식 문서로 대조해 spec 설계 표를 확정한다
- [x] 프리셋 `env` 규칙 평가 함수와 `node.json`·`python.json` 데이터를 추가한다 (테스트 먼저)
- [x] `detectStack` profile에 `cmdBootstrap`을 더하고 Python pm을 프리셋 규칙으로 감지한다 (테스트 먼저)
- [x] `templates/AGENTS.md.hbs` `stack` 절에 `## 환경`을 렌더하고 이 저장소 AGENTS.md를 재렌더한다
- [x] `harness-team stack` 요약에 bootstrap을 표기한다 (5줄 예산 유지)
- [x] `npm test` 전체 통과와 docs:check를 확인한다
- [x] codex 리뷰를 실행하고 결과를 artifact `## Reviews`에 기록한다
- [x] CHANGELOG에 소비자 영향(다음 doctor에서 stack 절 낡음 → init 재실행)을 적는다
- [x] (정정) `## 환경` 소제목을 없애고 bootstrap을 `## 명령` 아래로 옮기며, 문서 표현을 지시 하위 시스템으로 바로잡는다
- [x] 정정 뒤 `npm test` 전체와 docs:check를 다시 확인한다

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-03: bootstrap(재현 install)·env 규칙 신설 — install과 분리된 개념.
- 2026-11-03: bootstrap은 "환경 서술"이 아니라 지시 하위 시스템의 명령으로 재분류 — `## 환경` 소제목 폐기.

## 참고
- spec: `env-describe-spec.md` · 결정: `docs/decisions.md` D11 · 환경 하위 시스템은 D12 정정(별도 브랜치)
