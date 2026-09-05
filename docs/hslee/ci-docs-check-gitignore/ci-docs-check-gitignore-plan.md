# ci-docs-check-gitignore — Plan

## 목표
CI가 생성 문서 드리프트를 잡게 하고(`docs:check` 스텝), 세션 인계 파일을 git 추적에서 제외한다.

## 단계
- [x] task 생성 · spec Ambiguity 게이트 통과 · 다이어그램 옵트인 질문(아니오)
- [x] `.github/workflows/test.yml` — `Run tests` 뒤에 `Check generated docs` 스텝(`npm run docs:check`) 추가
- [x] `.gitignore` — `.claude/handoffs/` 추가, `git check-ignore`로 확인
- [x] 로컬 검증 — YAML 파싱(ruby/pyyaml, 5스텝), `git check-ignore` 매치, `npm run docs:check` 최신, `npm test` 통과
- [x] 커밋(14979c6 ci · 2b83a7c task docs) → push → PR #72 → CI run 33949366273 `Check generated docs` ✓ (job test (24) success, runtime v24.20.0)
- [ ] artifact 기록 → 머지 후 `harness-team done` → 원장 `summary --write`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- spec 참고 절
