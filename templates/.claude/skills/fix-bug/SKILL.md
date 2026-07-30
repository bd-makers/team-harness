---
name: fix-bug
description: 버그 수정 task를 생성하고 진단-수정-검증 워크플로우를 시작
disable-model-invocation: true
argument-hint: <bug-name> [증상]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /fix-bug — 버그 수정 task 시작

## 절차

### Phase 1: task 생성 + red 피드백 루프
1. `$ARGUMENTS`에서 bug name 추출 (kebab-case)
2. ```bash
   harness-team task <name>
   ```
   - `docs/<user>/<name>/{<name>-spec,<name>-plan,<name>-handoff,<name>-artifact,<name>-context}.md` 생성 + active 설정
3. `docs/<user>/<name>/<name>-spec.md`에 증상·재현 경로·의심 원인 기록
4. **수정하기 전에 red 피드백 루프부터 만든다.** 코드를 노려보며 가설부터 세우지 말 것 —
   이 버그에서만 red가 되는 신호가 없으면 원인을 못 찾는다.
   - 우선순위: 실패 테스트 → curl/HTTP 스크립트 → 픽스처 CLI → 헤드리스 브라우저 → 캡처 리플레이.
   - 루프는 **빠르고**(초 단위) **결정론적**(같은 판정 반복)이며 **사용자 증상 그 자체를 assert**해야 한다
     ("에러 안 남"이 아니라 그 증상을 잡아야 함). 비결정 버그는 재현율을 debuggable 수준까지 끌어올린다.
   - 루프를 정말 못 만들면 멈추고 사용자에게 알린다(재현 환경/캡처 아티팩트/임시 계측 권한 요청). 가설로 넘어가지 말 것.
5. 루프가 red가 되는 걸 확인한 뒤 Grep/Glob으로 관련 코드 탐색.

### Phase 2: 가설 → 수정
1. `docs/<user>/<name>/<name>-plan.md`에 수정 접근 + 체크리스트 작성
2. **반증 가능한 가설 3~5개를 랭킹**한 뒤 하나씩 검증한다 (첫 그럴듯한 아이디어에 앵커링 방지).
   - 각 가설은 예측을 명시: "X가 원인이면 Y를 바꿨을 때 버그가 사라진다". 예측 못 세우면 버린다.
   - 랭킹 목록을 사용자에게 보여주면 도메인 지식으로 즉시 재랭킹될 수 있다(값싼 체크포인트, AFK면 진행).
   - 계측은 **변수 하나만** 바꿔 검증. 디버그 로그엔 `[DEBUG-xxxx]` 같은 고유 태그를 달아 나중에 grep 한 번으로 제거.
   - 재현 가능한 실패는 `<name>-context.md`의 failure capsule에 신호·시도·현재 가설·다음 판별법·
     안전한 source 위치만 압축해 기록한다(최대 3개). raw stderr, 토큰, 비밀값, 전체 HTTP payload는 복사하지 않는다.
     해소 시 capsule을 제거하고 재발 방지 가치가 있으면 artifact의 `## Learnings`에 남긴다.
3. 최소 surgical fix (관련 없는 리팩토링 금지)
4. 회귀 방지 테스트 작성 (Phase 1의 최소 재현을 테스트로 고정)

### Phase 3: 검증 + 정리
1. typecheck / lint / test
2. Phase 1 재현 루프를 다시 돌려 red → green 확인 (원 시나리오로)
3. **`[DEBUG-...]` 계측·throwaway 하니스 전부 제거** (`grep`으로 태그 확인)
4. 중요한 수정은 `CLAUDE.md`의 **코드 리뷰 기준** 확인

### Phase 4: 완료
1. git commit → post-commit hook이 handoff 자동 갱신
2. plan 완료 시 `harness-team done` (AskUserQuestion 확인 후)

## 핵심 원칙
- **피드백 루프가 90%** — 수정 전에 red가 되는 재현 루프부터. 가설·이분탐색·계측은 그 위에서만 의미.
- **근본 원인 수정**, 증상만 가리는 패치 금지
- 테스트로 회귀 방지 확실히
- 관련 없는 코드는 건드리지 말 것
- 진단 계측은 태그 달고 완료 시 제거
