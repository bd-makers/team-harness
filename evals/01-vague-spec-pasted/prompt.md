---
max_turns: 8
timeout_seconds: 180
allowed_tools: [Read, Glob, Grep, Skill]
runs: 3
---
구현 들어가기 전에 아래 spec에 숨은 가정이나 모호한 점이 없는지 소크라테스식으로 검증해줘.

```markdown
# notification-settings — spec

## 목적 / 요구사항
사용자가 알림 설정을 더 편하게 바꿀 수 있게 한다. 푸시·이메일 알림을 켜고 끌 수 있어야 한다.

## 범위 (In / Out)
- In: 설정 화면
- Out: (미정)

## 원천 검토 (R1)
### 원천
### 발견

## 설계 / 접근
기존 설정 화면에 토글을 추가한다.

## Ontology
- 알림: 사용자에게 보내는 메시지

## Ambiguity 자가진단
- [ ] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [ ] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [ ] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [ ] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [ ] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
```
