---
description: PR/MR 직전 spec·plan·artifact를 최종 갱신하고 다이어그램(옵트인)까지 정리한 뒤 준비 완료 상태를 보고
phase: Workflow
argument-hint: '[--base <ref>] [--no-diagram]'
---

이 명령은 PR/MR을 **열기 직전**에 실행한다. 리뷰어가 문서를 실제로 읽는 시점은 PR인데,
그때까지 spec·plan·artifact가 코드 현실과 맞는다는 보장이 없다. ship은 그 간격을 닫고
**"PR/MR 준비 완료" 상태를 보고**하는 단계다.

핵심 제약:

- **PR/MR을 만들지 않는다.** 이 명령은 준비 완료 보고에서 멈춘다. 실제 브랜치 푸시와
  PR/MR 생성은 사용자 지시로 별도 진행한다.
- **`harness-team done`을 대체하지 않는다.** done은 task 완료 처리이고 ship은 PR 직전 문서
  정합 단계다. 이 명령 안에서 done을 실행하지 않는다.
- **문서만 고친다.** ship 중에 발견한 코드 결함은 보고만 하고, 수정은 사용자 지시로 별도 진행한다.
- **다이어그램은 옵트인이고 하드 의존이 아니다.** 도구가 없으면 실패시키지 말고 건너뛴 뒤
  artifact에 '미실행'을 기록한다(아래 6번).

Raw slash-command 인수:
`$ARGUMENTS`

인수 해석: `--base <ref>`는 브랜치 diff의 기준 ref, `--no-diagram`은 6번의 질문 없이
다이어그램 단계를 건너뛴다. 나머지 토큰은 이번 ship에서 특히 확인할 focus 문구로 취급한다.

## 실행 절차

1. **활성 task 확인** — `.harness/active.json`의 활성 task와 그 디렉터리
   `docs/<user>/<name>/`를 확인한다. 활성 task가 없으면 갱신할 문서가 없다는 사실을
   사용자에게 보고하고 종료한다(임의로 task를 만들지 않는다).

2. **Scope 파악** — 이번 PR/MR에 실릴 변경을 먼저 읽는다. base는 `--base <ref>` 인수가 있으면
   그 값, 없으면 `origin/main`, 그것도 없으면(`git rev-parse --verify origin/main` 실패) `main`.
   working tree가 dirty면 uncommitted 변경도 scope에 포함한다. 변경이 비어 있으면 ship할 것이
   없다고 보고하고 종료한다.

3. **spec 최종 갱신** — 구현하면서 바뀐 요구사항·설계 결정을 `<name>-spec.md`에 반영한다.
   Ontology와 Ambiguity 자가진단은 spec에 직접 두고, 외부 문서를 가리키는 포인터 껍데기로
   만들지 않는다(AGENTS.md 작업 프로토콜).

4. **plan 체크박스 정리** — 완료한 단계를 `- [x]`로 갱신한다. 끝내지 못했거나 범위에서 뺀 항목은
   지우지 말고 이유를 한 줄 남긴다 — 리뷰어가 PR에서 보는 것은 "무엇을 안 했는가"다.

5. **artifact 갱신** — `<name>-artifact.md`에 결과·검증 증거(실제 테스트 출력)·남은 리스크·
   후속 작업을 기록한다. 리뷰를 돌렸다면 `## Reviews`에 날짜와 함께 남긴다 — 기록 없는 리뷰는
   안 한 것이다.

6. **다이어그램 (옵트인)** — `--no-diagram`이 없으면 `AskUserQuestion`으로 **한 번만** 묻는다:
   "다이어그램을 갱신/생성할까요, 건너뛸까요?" 사용자가 직접 친 명령 안에서 한 번 묻는 것이므로
   응답을 어디에도 저장하지 않는다(설정 스키마도, 전용 doctor 체크도 만들지 않는다).
   갱신·생성을 선택하면 **probe → degrade → record** 순서로 처리한다.

   - **Probe** — 다이어그램 스킬(`/diagram-design:diagram-design` 등)이 이 세션에 노출되는지
     확인한다. 이 스킬은 이 플러그인 소유가 아니라 **별도로 설치되는 외부 플러그인이며 머신마다
     있을 수도 없을 수도 있다.** 없으면 설치 명령을 단정해 안내하지 말고(존재하지 않는 설치 경로를
     안내하는 결함 방지) 해당 플러그인이 이 머신에 설치·활성화되어 있는지 확인하도록 안내한다.
   - **Degrade** — 스킬이 없거나 호출이 실패하면 **ship을 실패로 만들지 않는다.** 다이어그램
     단계만 건너뛰고 나머지 절차를 계속한다. 인라인 SVG를 손으로 대신 그려 채우지 않는다 —
     그러면 옵트인의 의미가 사라진다.
   - **Record** — 실행했든 건너뛰었든 결과를 artifact에 한 줄 남긴다. 예:
     `- 다이어그램: 미실행 (diagram-design 스킬이 이 머신에 없음 — 2026-08-20)`.

   산출물은 `docs/<user>/<name>/<name>-diagram.html` 하나이며, 기본값은 **자립형 inline SVG
   HTML**이다 — task 문서는 Obsidian처럼 **script를 제거하는 뷰어**에서 열리는 경우가 많고, 그런
   뷰어에서는 mermaid JS 런타임이 렌더되지 않는다(이 저장소의 `docs/`가 그런 환경이다). 뷰어가
   script를 실행하는 것이 확실한 프로젝트라면 다른 형식을 써도 되지만, 판단 근거를 artifact에
   남긴다. 이 파일은 **SSOT 4파일(spec·plan·handoff·artifact)이 아닌 생성물**이며, 없어도 task는
   유효하다.

7. **준비 완료 보고** — 사용자에게 아래를 한 화면으로 보고하고 멈춘다: 브랜치와 base, 변경 파일
   요약, 검증 결과(실제 명령과 출력), 갱신한 문서 항목, 다이어그램 상태(갱신/생성/건너뜀/미실행),
   남은 리스크·후속 작업. 마지막 줄에 **PR/MR 생성은 사용자 지시 후에 진행한다**는 사실을 명시한다.

## 예시

```bash
# 2번 Scope 파악
git status --short
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
```

준비 완료 보고 형식:

```
ship: chad/ship-command (base: origin/main)
- 변경: 8 files (+312 / -4)
- 검증: npm run test → 통과 (출력 첨부)
- 문서: spec 갱신 / plan 12항목 체크 / artifact 결과·리스크 기록
- 다이어그램: 건너뜀 (사용자 선택)
- 남은 리스크: 없음
→ PR/MR 준비 완료. 생성은 지시 주시면 진행합니다.
```

task 자체를 끝낼 때는 `harness-team done`을, 학습만 남길 때는 `harness-team retro`를 쓴다 —
ship은 둘 중 어느 것도 실행하지 않는다.
