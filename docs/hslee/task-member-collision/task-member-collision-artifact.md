# task-member-collision — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-25T09:43:25.577Z — codex (harness-team review)

- engine: codex · scope: diff · tip: 040d13445153481291b0ee3d16f77a926cdb4eec · exit 0 · 1413 B

```text
전하, P1은 없습니다.

- P2 — `src/commands/task.mjs:323`: 충돌 오류의 재시도 명령은 raw member 이름을 그대로 `--member`에 넣지만, config `user`는 공백을 포함해 저장될 수 있고 `--member "Chad Lee"`는 `Chad-Lee`로 sanitize되어 기존 `docs/Chad Lee/<task>`를 활성화하지 못합니다.

- P2 — `README.md:512`: “공백은 `-`로 변환” 규칙이 config `user`에도 적용되는 것처럼 서술되지만 실제 config 경로는 raw 값을 사용하므로, 새 식별 우선순위 문서가 실제 디렉터리 식별자와 어긋납니다.

- P3 — `tests/task-member-collision.test.mjs:38`: 신규 가드의 `docs/` 부재 + 추론 member 경로를 검증하지 않아, `exists(docsPath)` 보호가 사라져 `listTaskRefs()`가 첫 task 생성에서 실패하는 회귀를 잡지 못합니다.

최종 판정: **수정 요청**입니다. member 식별자를 config 저장·명시 플래그·기존 경로에서 하나의 canonical form으로 맞춘 뒤, 공백 이름과 `docs/` 없는 최초 생성 케이스를 회귀 테스트에 추가하는 것이 필요합니다. 그 외에는 `resolveUser` 호출부가 단일이고 CLI가 항상 `flags` 객체를 전달하며, `isTask`/`explicit`/구조화 에러 패킷의 기본 흐름은 의도와 맞았습니다. 수정은 하지 않았으며 `node --check`와 `git diff --check`는 통과했습니다.
```

<!-- harness:review kind=codex scope=diff tip=040d13445153481291b0ee3d16f77a926cdb4eec at=2026-09-25T09:43:25.577Z -->

**판별·조치**:
- P2 retry 안내 — 진짜. `init` 은 config user 를 raw 로 저장하고 `--member` 는 sanitize 된다. 가드 자체는 안전(무쓰기)하고
  틀리는 것은 안내뿐이라, sanitize-stable 한 owner 가 있으면 `--member`, 없으면 config user 로 안내하도록 분기했다.
  config user 를 sanitize 하는 근본 통일은 기존 `docs/<공백 이름>/` 을 끊으므로 하지 않는다(범위 밖, 기존 동작).
- P2 README — 진짜(이번 편집이 만든 오독). sanitize 가 1·3·4번에만 적용되고 config user 는 그대로라고 고쳤다.
- P3 docs/ 부재 — 진짜. 첫 생성 테스트와 공백 member 안내 테스트를 추가(6건 green).

## Learnings
