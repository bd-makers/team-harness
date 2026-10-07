# 위키 작성 규칙 — team-harness

`/harness-wiki`가 머지된 task를 컴파일할 때 따르는 이 저장소의 규칙이다. 분류 체계는 이 파일이 정한다 — 하네스 코드에는 없다.

## 분류

- **기능 항목** — `wiki/20_domain/<기능>.md`. 기능은 하네스 사이클의 단계·검토 지점·가로축 단위로 묶는다(`docs/harness-cycle.md` §2).
  - `review-gates.md` — 검토 지점 R1(원천 문서 검토)·R2(시나리오 ↔ 증거 대조)·R3(코드 리뷰)와 그 CLI
  - `default-loop.md` — 선택형 기본 루프 `/harness-loop`(S3)
  - `knowledge-base.md` — 위키 컴파일(S8)
- 위 목록에 맞는 기능이 없으면 새 기능 항목을 만들지 말고 `wiki/99_inbox/<task>.md`로 보낸다. 새 기능 항목은 사람이 이 목록에 먼저 추가한다.
- 한 task가 두 기능에 걸치면 주된 기능 항목에 단락을 두고, 다른 항목에는 한 줄 교차 참조만 둔다.

## 단락 형식

```markdown
<!-- harness:wiki task=<user>/<task> pr=<N> commit=<sha7> author=<user> at=<YYYY-MM-DD> -->
### <한 줄 요약> (#<N>)

- **결정** — …
- **바뀐 모듈** — …
- **학습** — …
```

- 마커는 `harness-team wiki sources`가 준 문자열을 그대로 쓴다(위 예시는 형식 설명이다).
- 단락은 항목 안에서 머지 순서(오래된 것 위)로 쌓는다.
- 항목 첫머리 `## 현재 모양`은 단락을 종합한 지금의 상태 요약이다. 단락을 추가할 때 함께 갱신한다.

## 쓰지 않는 것

- task 문서에 없는 내용, task 폴더 경로 링크, 리뷰 원문 전체 — 요약과 출처(PR·커밋)만 남긴다.
