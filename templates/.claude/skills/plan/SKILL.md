---
name: plan
description: 활성 task의 plan.md를 갱신합니다
disable-model-invocation: true
argument-hint: [작업 설명]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /plan — 활성 task 계획 갱신

## 전제
이 하네스는 task 단위로 작업을 관리합니다:
- 활성 task 포인터: `.harness/active.json`
- 작업 문서: `docs/<member>/<feature|fix>/<name>/{spec,plan,handoff,artifact}.md`

활성 task가 없으면 먼저 `/new-feature` 또는 `/fix-bug`를 실행하세요.

## 절차
1. `.harness/active.json`을 읽어 현재 활성 task 경로 확인
2. 활성 task의 `spec.md`를 읽어 요구사항 이해
3. 활성 task의 `plan.md`를 읽고 진행 중인 작업 확인
4. `$ARGUMENTS`를 기반으로 계획 수립:
   - 목표 정의
   - 영향 범위 파악 (코드베이스 탐색)
   - 완료 기준 설정
   - 단계별 체크리스트
5. 활성 task의 `plan.md` 갱신

## plan.md 형식
```markdown
# Plan

## 목표
- (핵심 목표)

## 영향 범위
- (파일/모듈/화면)

## 완료 기준
- [ ] typecheck
- [ ] lint
- [ ] test
- (기능 검증 기준)

## 단계
- [ ] (구체적 단계)

## 참고
- (링크, 결정사항)
```

## 주의사항
- 코드베이스를 먼저 탐색해서 영향 범위를 정확히 파악할 것
- 단계는 구체적이고 검증 가능하게
- 한 task에 하나의 plan.md
