# wiki-compile — 질문 1 (다이어그램 옵트인)

task `chad/wiki-compile` 를 origin/main c671343 위에서 생성했다(`created:`). `commands/harness-task.md` 옵트인 절에 따라 한 번만 묻는다.

## Q1. 이 task의 spec/plan 단계에서 다이어그램을 함께 만들까?

- **예** → plan `## 단계`에 `- [ ] spec/plan 다이어그램 작성 → docs/chad/wiki-compile/wiki-compile-diagram.html` 추가, `/harness-diagram`(diagram-design 스킬, 이 머신에 있음)으로 생성.
- **아니오** → plan에 그 단계를 넣지 않는다(옵트아웃 상태).

**권장: 아니오.**
근거: C1의 구조적 내용(머지 → done → summary → compile 흐름, CLI/스킬 경계)은 PR을 올린 뒤 붙이는 PR 리뷰 덱(`/mr-change-diagram`)이 최종 코드 기준으로 그린다. spec 단계에서 같은 흐름을 한 번 더 그리면 인터뷰 결과로 형태가 바뀔 때 두 번 고쳐야 한다.

## 답 형식

`Q1: 예` 또는 `Q1: 아니오` 한 줄이면 된다. 답을 받기 전까지 spec 초안 작성을 멈춘다.
