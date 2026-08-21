# instruction-structure — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

2026-08-21 — 지시 구조 슬림화 완료 (commit 0c500c1, 테스트 302/302 green).

- **eager 로드량**: AGENTS.md 12,215→10,481 B, CLAUDE.md 6,891→4,684 B (합계 21% 감소).
  plan의 "절반 이하" 목표에는 미달 — Codex·Cursor·OpenCode가 plugin commands/를 못 읽어
  도구 중립 요약(다이어그램·리뷰 기준·JIT)은 코어에 남겨야 했다. 단 Claude 세션 기준으로는
  같은 규칙의 3중 로드(AGENTS+CLAUDE 중복)가 사라져 실효 감소폭이 더 크다.
- **표면 수**: 다이어그램 옵트인 4→2 (정본 `commands/harness-task.md` + AGENTS 도구 중립 요약),
  D-log 1곳(`docs/decisions.md` 신설, 템플릿 스캐폴드 포함), Ambiguity 게이트는 spec 템플릿이 운반.
- **lazy 판별 기준 확립**: "트리거를 컨텍스트 없이 인지할 수 있는가" — 트리거는 eager 1줄,
  절차는 lazy 정본. 결정론 가드(done 가드·context check)가 있는 규칙은 지시 대신 가드 메시지에 위임.
- **전역 ~/.claude/CLAUDE.md**: 구식 명령(`/harness-task new feature`) 정정 + "하네스 프로젝트에서는
  프로젝트 파일 우선" 명시. 이 머신(chadonpro)만 반영 — hsonpro 머신은 수동 반영 필요.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-21 — Codex read-only 리뷰 (origin/main 대비, commit 0c500c1)

- 실행: `codex exec --sandbox read-only` (gpt-5.6-sol, ultra). **Gemini 리뷰 미실행 — gemini CLI 미설치.**
- verdict: Changes requested (P1 없음, P2 3건 / P3 3건). 마커 드리프트·decisions.md 동일성은 Codex도 확인.
- 발견·판별 (Claude 재검증 후):
  - **P2-1** decisions.md가 skipExisting 복사라 기존 파일이 있으면 D-log 이관이 막히고 상류 갱신도 전파 안 됨
    → **부분 유효(트레이드오프)**: 신규 이관은 파일 부재라 정상 동작. 사용자 소유 append 로그라
    덮어쓰기가 오히려 위험(docs/README.md 시드와 동일 정책). 완화안: doctor에 D2/D4/D5 존재 체크 추가.
  - **P2-2** §1-A의 "작은 버그 수정에는 생략" 예외가 삭제됐고 `docs/harness-task-guide.html:462`와 모순
    → **유효(확인)**: guide에 예외 문구 잔존 + guide의 "AGENTS.md의 D2·D4가 이 포맷의 실제 예" 문구도
    이제 stale(전문은 decisions.md로 이동). CLAUDE §1 트리거 또는 spec 템플릿에 예외 1구절 복원 + guide 갱신 필요.
  - **P2-3** "check의 failure 메시지가 알려준다"는 과장 — capsule 초과 메시지는 개수만 알려주고 경계 문법은 설명 안 함
    → **유효(확인, 재현)**: `failure-capsules` 메시지는 count/limit만. AGENTS 문구 완화 또는
    failure 메시지에 경계 규칙 힌트 1줄 추가 필요.
  - **P3** 3건(테스트가 apply 전달을 직접 검증 안 함 / command 정본 테스트가 AskUserQuestion·preflight 미고정 /
    드리프트 검사가 단방향) → 유효하나 기존 설계 패턴과 동일 수준. 후속 보강 후보.
- 조치: review-only 계약에 따라 이 리뷰에서 수정하지 않음. P2-2·P2-3 수정안을 사용자에게 보고, 지시 대기.


## Learnings

