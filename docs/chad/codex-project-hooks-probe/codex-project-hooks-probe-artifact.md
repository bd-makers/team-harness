# codex-project-hooks-probe — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**답: project-level `.codex/hooks.json`은 codex 0.153.4에서 동작한다. 단 조건이 둘이고, 우리 훅은 그 둘 중
어느 것도 만족하지 못해 실질적으로 죽어 있다. 게다가 만족시켜도 지금 형식으로는 아무것도 주입되지 않는다.**

### 발화 조건 (실측)

1. **프로젝트가 신뢰됨** — `~/.codex/config.toml`의 `[projects."<path>"] trust_level = "trusted"`.
2. **훅 소스가 신뢰됨** — `[hooks.state]`에 해시가 등록돼 있거나, `--dangerously-bypass-hook-trust`로 우회.

둘 중 **하나라도 없으면 훅은 실행되지 않는다.** 조용히, 오류 없이.

### 주입 형식 (실측)

- **평문 stdout은 주입되지 않는다.** 훅은 실행되고(마커 파일 생성 확인) 출력은 어디에도 닿지 않는다.
- **`{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"…"}}` 는 주입된다.**

### 실험 표

| # | 프로젝트 신뢰 | 훅 신뢰 | sandbox | 마커 | 주입 |
|---|---|---|---|---|---|
| E-A | ✗ | bypass | read-only | 미발화 | — |
| E-B | ✗ + `-c projects."…".trust_level` 오버라이드 | bypass | read-only | 미발화 | — (오버라이드 무효) |
| E-C | ✗ → 이 실행이 신뢰 등록 | bypass | workspace-write | **발화** | — |
| P2 | ✓ | bypass | read-only | **발화**(6개 이벤트 전부) | — |
| V1 | ✓ | 없음 | read-only | 미발화 | 평문 → NO |
| V2 | ✓ | 없음 | read-only | 미발화 | JSON → NO |
| V3 | ✓ | bypass | read-only | **발화** | JSON → **YES** |
| V4 | ✓ | bypass | read-only | **발화** | 평문 → **NO** |
| 이 저장소 | ✓ | 없음 | read-only | — | 모델이 `NONE` 응답 |

부수 관찰: `--sandbox workspace-write`로 실행하면 codex가 그 프로젝트를 **자동으로 신뢰 등록**한다(E-C에서
`[projects."<tmp>"]`가 생겼다). read-only 실행은 등록하지 않는다. 훅은 sandbox **밖**에서 돈다 — read-only
실행에서도 마커 파일이 정상적으로 생겼다(초기 가설 H1은 기각).

### 이 저장소의 실제 상태

`[projects."…/harness-aijient-team-plugin"] trust_level = "trusted"`이지만 `[hooks.state]`에는 이 저장소의
`.codex/hooks.json` 항목이 **없다**(2026-09-03 설치, 그 뒤 codex 수십 회 실행). 그래서 `harness-review`가
돌리는 `codex exec`(bypass 플래그 없음)에서는 훅이 **실행되지 않는다.** 모델에게 직접 물어 확인했다 —
`[harness]` 줄이 컨텍스트에 있느냐는 질문에 `NONE`.

### 그래서 README가 틀렸다

`README.md:111` 표의 *"Codex: SessionStart 1종 (신뢰 승인 필요)"* 과 그 아래 *"둘 다 `harness-team
session-context`를 호출해 활성 task의 Context Card를 주입합니다"* 는 현재 사실이 아니다. 두 군데가 틀렸다:
훅 신뢰가 없으면 **실행 자체가 안 되고**, 실행돼도 **평문 출력은 주입되지 않는다.**

### 조건이 갖춰지면 무엇이 되는가

P2에서 `SessionStart`·`UserPromptSubmit`·`PreToolUse`·`PostToolUse`·`Stop`·`SessionEnd` **6개 이벤트가 전부
발화**했다. 바이너리에는 `Command blocked by PreToolUse hook:`과 `PreToolUseDecisionWire`(approve/block/
allow/deny/ask)가 있다 — 즉 followups 2번의 선택지 B(Codex control 계층 배선)는 **기술적으로 가능**하다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

(이 task는 코드를 바꾸지 않고 사실만 확인한다 — spec의 Done evidence에서 `review: optional`. 결과를
반영하는 수정 task에서 리뷰한다.)

## Learnings

- **"설치됐다"와 "동작한다"는 다른 주장이다.** 하네스는 `.codex/hooks.json`을 설치하고 doctor로 존재를 확인하며
  README에 강제력으로 적었지만, 발화를 한 번도 확인하지 않았다. 파일 존재 검사는 동작 검사가 아니다.
- **조용한 실패가 6개월을 버텼다.** 훅이 안 돌아도 codex는 오류를 내지 않는다. 관측 가능한 부수효과(마커)를
  일부러 만들지 않으면 영원히 모른다.
- **실패를 한 번 보고 원인을 단정하지 말 것.** 첫 실험(read-only + 미신뢰)의 미발화를 "sandbox가 쓰기를 막았다"로
  읽었는데, 실제 원인은 신뢰 두 겹이었다. 변수를 하나씩 분리한 표를 만들고 나서야 답이 나왔다.
