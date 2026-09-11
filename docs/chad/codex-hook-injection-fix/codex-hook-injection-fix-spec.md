# codex-hook-injection-fix — Spec

## 목적 / 요구사항

`codex-project-hooks-probe`가 실측으로 밝힌 두 결함을 고친다(followups 2번의 **A'**).

1. **주입 형식이 틀렸다** — Codex는 훅의 평문 stdout을 주입하지 않는다. 우리 훅은 `session-context`의
   평문 출력을 그대로 흘려서, 훅이 돌아도 모델에 **아무것도 닿지 않는다.**
2. **설치가 동작으로 보고됐다** — Codex는 프로젝트 신뢰 AND 훅 소스 신뢰가 모두 있어야 훅을 돌린다.
   둘 중 하나라도 없으면 조용히 안 돈다. 하네스는 파일 존재만 검사하고 README는 "주입합니다"라고 적었다.

**기대 결과.** (a) `--codex-hook`으로 `hookSpecificOutput.additionalContext` 봉투를 씌운다.
(b) `doctor`가 신뢰 부재를 경고로 표면화한다. (c) README를 사실대로 고친다.

**제약.**
- **Claude 경로는 바꾸지 않는다** — Claude는 평문 stdout을 읽는다. 봉투는 `--codex-hook`일 때만.
- 사용자의 `~/.codex/config.toml`을 **읽기만** 한다. 훅 승인은 사용자 몫이라 하네스가 대신 하지 않는다.
- codex를 안 쓰는 프로젝트(설정 파일 없음)에서는 **침묵**한다.
- 빈 컨텍스트에 봉투만 씌우지 않는다.

## 설계 / 접근

- `session-context --codex-hook`: 같은 텍스트를 한 줄 JSON 봉투로. 봉투는 한 덩어리라 버퍼링이 필요한데,
  평문 경로의 "gate를 먼저 흘려 타임아웃에서 지킨다"는 보호가 codex 경로엔 없다 — 대신 observe가 **던지면**
  gate만이라도 내보낸다. 이 트레이드오프를 코드 주석에 남긴다.
- `doctor.checkCodexHookTrust`: `.codex/hooks.json`에 SessionStart 훅이 있을 때만, `CODEX_HOME ?? ~/.codex`의
  `config.toml`을 줄 단위로 읽어 두 신뢰를 본다. codex가 realpath로 적으므로 원본·realpath 둘 다 대조한다.
  TOML 파서를 들이지 않는 이유: 두 키가 모두 **섹션 헤더**이고 파일은 codex가 기계로 쓴다.
- e2e 샌드박스에 `CODEX_HOME` 격리 추가 — 없으면 테스트가 개발 머신의 실제 `~/.codex`를 읽어
  샌드박스마다 경고가 뜬다(`CLAUDE_CONFIG_DIR`와 같은 이유).

## Ontology
- **봉투(envelope)**: `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"…"}}`.
  Codex가 주입하는 유일한 형태.
- **신뢰 2겹**: 프로젝트 신뢰(`[projects]`) + 훅 소스 신뢰(`[hooks.state]`). AND 조건.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 세 산출물(봉투·doctor 경고·README)이 특정됨.
- [x] **Constraint 명확도** (30%) — Claude 경로 불변·사용자 설정 읽기 전용·codex 미사용 시 침묵.
- [x] **Success 기준** (30%) — 테스트 9건 + **실제 codex 세션이 `[harness]` 줄을 인용**.
- [x] **Context 명확도** (brownfield) — `session-context.mjs`·`doctor.mjs`·`cli-args.mjs`·템플릿·`sandbox.mjs`·README.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
- 실측 근거: `docs/chad/codex-project-hooks-probe/codex-project-hooks-probe-artifact.md`의 실험 표.
- 크기: ① 표면의 수정 → **patch(0.38.3)**.
