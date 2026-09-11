# codex-project-hooks-probe — Spec

## 목적 / 요구사항

**무엇을 모르는가.** `init`은 소비자 프로젝트에 `.codex/hooks.json`(SessionStart → `harness-team session-context`)을
설치하고 README는 그것을 "Codex 강제력 1종"으로 적는다. 그런데 2026-09-12 정리 중 **발화하지 않는 정황**이 나왔다:
마커 훅이 실행되지 않았고, `~/.codex/config.toml`의 `[hooks.state]`에 project 경로 항목이 하나도 없다.

**이 task의 산출물은 코드가 아니라 답이다.** "project-level `.codex/hooks.json`이 codex 0.153.4에서 실제로
로드·발화하는가, 아니라면 무엇이 조건인가." 그 답에 따라 followups 2번의 선택지(B 확장 / C 비대칭 유지)가 갈린다.

**제약.**
- **사용자 전역 설정(`~/.codex/config.toml`·`~/.codex/hooks.json`)을 수정하지 않는다.** 실험은 임시 저장소에서만.
- 코드·템플릿을 바꾸지 않는다. 결과에 따른 수정은 **별도 task**다(이 task는 판단 재료만 만든다).
- 재현 절차와 원본 출력(요약)을 artifact에 남긴다 — "이번엔 안 되더라"로 끝내지 않는다.

## 설계 / 접근 — 가설과 판별

| # | 가설 | 판별 실험 |
|---|---|---|
| H1 | 훅은 실행되지만 **sandbox(read-only)가 마커 쓰기를 막았다** | `--sandbox workspace-write`로 동일 실험 |
| H2 | `codex exec`에서는 **SessionStart가 발화하지 않는다**(다른 이벤트는 된다) | 한 파일에 SessionStart·UserPromptSubmit·PreToolUse·Stop 마커를 동시에 걸고 어느 것이 찍히는지 본다 |
| H3 | **경로가 다르다** (`.codex/hooks.json`이 아님) | `.codex/hooks/hooks.json` 등 후보 경로 동시 설치 |
| H4 | **project config(`.codex/config.toml`)가 있어야** project hooks를 읽는다 | 그 파일을 둔 변형 |
| H5 | project 훅은 **신뢰 등록이 선행**이고 `--dangerously-bypass-hook-trust`가 그 경로를 덮지 않는다 | 신뢰 등록 여부(`[hooks.state]`)를 실행 전후로 대조 |

정지 조건: H1~H5 중 하나가 **재현 가능하게** 확인되면 거기서 멈춘다. 전부 부정이면 "0.153.4에서 project-level
훅은 지원되지 않는다"를 결론으로 적고, 그 근거(바이너리 문자열 + 실험 로그)를 남긴다.

## Ontology
- **project-level 훅**: 저장소 안(`.codex/…`)에 두는 훅 설정. 전역(`~/.codex/hooks.json`)과 구분된다.
- **발화(fire)**: 훅 커맨드가 실제로 실행돼 관측 가능한 부수효과(마커 파일·주입된 컨텍스트)를 남기는 것.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 답해야 할 질문 한 문장.
- [x] **Constraint 명확도** (30%) — 전역 설정 불변·코드 불변·임시 저장소 한정.
- [x] **Success 기준** (30%) — H1~H5 판별 결과와 재현 절차가 artifact에 남는다.
- [x] **Context 명확도** (brownfield) — `templates/.codex/hooks.json`, `README.md:111`, followups 2번.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## Done evidence
```json
{ "version": 1, "review": "optional", "tests": "skip" }
```

## 참고
- 코드가 바뀌지 않으므로 `tests: skip`. 리뷰는 결론의 근거를 따지는 성격이라 optional로 두고, 결과가
  README 정정으로 이어지면 그 task에서 리뷰한다.
- 배경·선택지: `docs/followups.md` 2번.
