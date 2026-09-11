# 후속 후보 — 새 세션 검토용

> 이 파일은 **task가 아니다.** 결정·착수 전의 후보 목록이며, 항목을 task로 올리면 여기서 지운다.
> 각 항목은 새 세션이 이 파일만 읽고 spec을 쓸 수 있도록 맥락·정본 위치·선행 조건을 담는다.
> 출처: 2026-09-10 세션 — 4요소(agent loop / tool interface / context management / control mechanisms)
> 관점 분석 → `done-force-audit-trail`(0.34.0, main에서 별도 구현) → `review-evidence-cli-owned`(0.37.0).

## 우선순위

**남은 것: 없음.**
(4번은 2026-09-12에 **B(src 상수 + 문서 블록 + pin)로 결정**해 task `framing-prompts-in-src`로 올려 여기서 지웠다.
testcritic은 `--rubric` 선택자로 3 루브릭 모두 src에 둔다.)
(6번은 2026-09-12에 처리했다. 다만 **전제가 반쯤 뒤집혔다** — 실측 결과 이 머신(데스크톱 앱 세션)에서는
중첩 `claude -p`가 상속하지 **않는다**(exit 1, `OAuth session expired and could not be refreshed`).
즉 sim 헤더의 결론은 맞았고 **사유와 무조건성**이 틀렸으며, 오히려 `commands/harness-review.md`의
"부모 세션의 인증을 상속한다"가 무조건 주장이라 틀렸다. 세 표면 모두 환경 의존으로 고쳤고
토큰 경로는 **유지**했다 — 상속되지 않는 환경의 유일한 길이다.)
(7번은 2026-09-12에 처리했다 — 레포 밖 `~/.claude/skills/delegation-router/references/context-and-model.md`의
가격 셀에서 `$숫자` 패턴을 없앴다: 티어 표는 헤더가 이미 `$/MTok` 단위를 가지므로 숫자만 남기고, 절감 표는
`(10/50 $/MTok)` 꼴로 바꿨다. **이 머신 사본만** 고쳤다 — 그 디렉터리는 git이 아니라 다른 머신에는 전파되지 않는다.)
(2번은 2026-09-12에 **C(비대칭 유지)로 결정**해 `docs/decisions.md` **D9**로 옮겼다. 선행 검증·수리는
task `codex-project-hooks-probe`·`codex-hook-injection-fix`(0.38.3)로 끝냈다.)
(1·5번은 2026-09-11 task `review-codex-live-check`·`done-on-main-nudge`로, 3·8번은 같은 날 task
`review-adopt-record-quality`로, 9번은 2026-09-12 task `handoff-amend-dedup`으로 올려 여기서 지웠다.
2번은 결정이 끝나 D9로 옮겼다 — 번호는 참조 안정을 위해 유지.)

---

---

## 이 목록에 없는 것 (의도적으로)

- **context check를 done 게이트로**: 4요소 분석에서 한때 "약점"으로 꼽았다가 철회. TCC는 AGENTS.md가
  **비-SSOT cache/workpad**로 정의하므로 cache 유효성으로 종결을 막으면 정의와 충돌한다. 다시 올리지 말 것.
- **리뷰 마커 HMAC 서명**: `review-evidence-cli-owned` spec `### 왜 서명이 아니라 meta인가`에서 기각.
  머신별 키는 두 머신 작업을 깨고, 공유 키는 얻는 게 없으며, 위조는 가드의 위협 모델 밖.
