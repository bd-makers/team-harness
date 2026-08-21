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
- 조치: review-only 계약에 따라 리뷰 시점에는 수정하지 않고 보고. 사용자 지시(2026-08-21,
  "서브에이전트로 구현 + 메인 리뷰")로 아래와 같이 조치 완료:
  - **P2-2 수정**: CLAUDE.md(템플릿+루트) §1에 "작은 버그·문서 수정에는 생략해도 된다" 복원,
    harness-task-guide.html의 D-포맷 예시 출처를 `docs/decisions.md`로 정정.
  - **P2-3 수정**: `context.mjs` failure-capsules 메시지에 capsule 경계 규칙·해소 방법 힌트 추가 + 테스트 고정.
  - **P3-2 수정**: command 정본 테스트에 AskUserQuestion·preflight·inline SVG·artifact 기록 핀 4개 추가.
  - **P2-1**: doctor 체크 후속 task로 분리 (spawn_task chip 발행).
  - 구현: general-purpose 서브에이전트(Sonnet, 같은 워크트리 순차 쓰기 — D4 준수), 메인 세션이 diff 리뷰.
  - 부수 발견: `harness-overview-generation` 테스트 실패는 서브에이전트 주장(기존 문제)과 달리
    커밋 0c500c1이 `templates/docs/decisions.md`를 추적시켜 오버뷰의 `git ls-files` 파일 트리가
    자란 것이 원인 — `npm run docs:generate` 재생성으로 해소. 최종 302/302 green.


## Learnings

