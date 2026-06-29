# harness-sim 리포트 — {{TS}}

| 항목 | 값 |
|---|---|
| 실행일시 | {{TS}} |
| harness-team 버전 | {{VERSION}} |
| plugin git SHA | {{SHA}} |
| 대상 프로젝트 | {{PROJECTS}} |

## 결과 매트릭스

| 프로젝트 | S1 코어&스킬 | S2 새 피처 | S3 기존 수정 |
|---|---|---|---|
| bare-node | {{}} | {{}} | {{}} |
| next-app | {{}} | {{}} | {{}} |
| rn-app | {{}} | {{}} | {{}} |

> 범례: `PASS` 증거 기반 통과 · `FAIL` 실패(원인 아래) · `⚠️수동확인` 자동검증 불가 · `SKIP` 프리플라이트 제외

## 항목별 관찰

### {{project}}
- **S1**: doctor=… / SSOT=… / session-context nudge(대리)=… / command·skill 인벤토리(수동)=…
- **S2**: task 4종 SSOT=… / spec 게이트=… / 커밋 훅 handoff=… / done-guard 차단=… / done append=…
- **S3**: task=… / 더미 수정 커밋 훅=… / done=…
- 실패 원인:

## 정리 검증 (무오염)

| 프로젝트 | git status clean | doctor green | 브랜치 삭제 | active 복원 |
|---|---|---|---|---|
| bare-node | {{}} | {{}} | {{}} | {{}} |
| next-app | {{}} | {{}} | {{}} | {{}} |
| rn-app | {{}} | {{}} | {{}} | {{}} |

## 수동확인 잔여 (자동검증 불가)
- [ ] `/harness-task`·`/harness-doctor` 등 slash command 실세션 해석
- [ ] new-feature / fix-bug / verify 스킬 실트리거
- [ ] SessionStart task-gate nudge 실주입(세션 시작 시점)
- [ ] Codex/Gemini 리뷰어 호출, Cursor `.mdc`·OpenCode 설정 동일 코어 참조

## 요약
- 총평:
- 후속 액션:
