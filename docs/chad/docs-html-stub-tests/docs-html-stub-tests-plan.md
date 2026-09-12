# docs-html-stub-tests — Plan

## 목표

`/tmp`에만 있던 DOM 스텁 3종을 `tests/*.test.mjs`로 승격한다. 검증 대상 JS는 벤더링하지 않고
`docs/*.html`에서 실행 시점에 추출한다. 산출물 HTML·`package.json`은 건드리지 않는다.

## 단계

- [x] 작업 브랜치 생성 (`claude/docs-html-stub-tests`) — main 직접 작업 금지 (D5)
- [x] 원본 3종 무결성 확인 — `raw-stubs/`의 sha256이 아래 `## 참고` 표와 일치하는지 대조
- [x] `tests/helpers/html-script.mjs` — HTML에서 인라인 `<script>` 본문을 추출하는 헬퍼.
      블록이 정확히 1개가 아니면 **throw** 한다 (HTML 구조가 바뀌면 조용히 틀리지 않게)
- [x] `tests/docs-kickoff-deck.test.mjs` — `dkstub.mjs` 변환 (22건). 셋 중 DOM 표면이 가장 넓어
      헬퍼 설계를 먼저 검증한다
- [x] `tests/docs-onboarding-checklist.test.mjs` — `obstub.mjs` 변환 (14건, `localStorage` 스텁 포함)
- [x] `tests/docs-playground.test.mjs` — `domstub2.mjs` 변환 (29건)
- [x] 양성 검증 — `npm test` 통과 + 아래 파일별 기준선과 대조.
      **단위는 `node:assert` 호출 수(=원본 `t()` 호출 수)이지 `test()` 개수가 아니다** —
      `node:test`는 `test()` 개수만 출력하므로 총계를 러너 출력에서 그대로 읽을 수 없다.
      변환은 **원본 `t()` 하나당 `test()` 하나**로 한다(섹션 `[n]`은 `describe()`로 묶는다).
      그러면 러너의 pass 수가 아래 "단언" 열과 일치한다.

      | 파일 | 단언 | 원본 섹션 |
      |---|---|---|
      | `tests/docs-playground.test.mjs` | 29 (+1 추가) | 5 |
      | `tests/docs-onboarding-checklist.test.mjs` | 14 | 5 |
      | `tests/docs-kickoff-deck.test.mjs` | 22 | 4 |
      | **합계** | **65 변환 + 1 추가 = 66** | 14 |

      추가 1건은 `PRESETS` 개수 가드 — 원본 루프가 `PRESETS` 비었을 때 조용히 통과하는 구멍을 닫는다.

      파일별로 대조해야 어느 변환에서 빠졌는지 좁혀진다. 총계만 보면 위치를 모른다
- [x] 음성 검증 — 세 HTML을 하나씩 고의로 깨서(예: 덱 슬라이드 1장 제거, 체크리스트 항목 1개 제거,
      playground 프리셋 1개 제거) 해당 테스트가 **실패하는지** 확인한 뒤 되돌린다.
      통과만 보고 끝내면 테스트가 실제로 무엇도 지키지 않을 수 있다
- [x] `docs/chad/docs-html-stub-tests/raw-stubs/` 삭제 — 승격이 끝나면 원본은 중복이다
- [x] `git status`로 `docs/*.html`·`package.json` 무변경 확인
- [x] `git add -A` 후 `npm run docs:check` 재실행 — `docs:generate`는 `git ls-files` 기반이라
      untracked 파일을 못 본다. add 전의 green은 증거가 아니다
- [ ] 커밋
- [ ] `/harness-review codex` — read-only 외부 리뷰, 결과를 artifact `## Reviews`에 기록 (spec의 `review: required`)
- [ ] `/harness-retro` — 학습 기록
- [ ] `/harness-task done`

## Ontology 변경 로그

- 2026-09-13 — **추출(extraction)** vs **벤더링(vendoring)** 대비를 spec.md에 신규 정의.
  `dk.js`가 이미 낡아 있었다는 실측이 근거다. 앞으로 `docs/*.html`의 인라인 스크립트를
  검사할 때는 사본을 저장소에 두지 않는다.
- 2026-09-13 — **승격(promotion)** 을 "파일 이동"이 아니라 "러너·경로·단언 형식의 변환"으로 정의.

## 참고

### 원본 sha256 (2026-09-13 park 시점)

| 파일 | sha256 |
|---|---|
| `raw-stubs/domstub2.mjs` | `6fda9362da5d9c4dc6e422d9b1bb45e733282007657c6ed87fe3ecaafc8733ab` |
| `raw-stubs/obstub.mjs` | `93674f76981b5224d40f24dfdf7583f7ced87519c9426f22310860748e5542a1` |
| `raw-stubs/dkstub.mjs` | `8c85a434b313dbecdc1d774aa1a588033a9d3944c64a348f143e70f25a02b293` |

`/tmp`의 동명 파일이 원본이며 언제든 사라질 수 있다. `raw-stubs/`는 승격 완료 후 삭제했으므로
이제 원본은 커밋 `21085e1`에만 남아 있다 — 필요하면 `git show 21085e1:docs/chad/docs-html-stub-tests/raw-stubs/<파일>`.

### 다이어그램

- 사용자 선택으로 **옵트인하지 않음** (2026-09-13 task 생성 시 1회 질문). 단계를 두지 않는다.

### 주의

- 원본 스텁은 `/tmp/pg.js`·`/tmp/ob.js`·`/tmp/dk.js`를 하드코딩해 읽는다. 변환 시 이 경로가
  남아 있으면 테스트가 저장소 밖을 읽게 된다 — 전부 HTML 추출로 교체돼야 한다.
- `domstub.mjs`(1 KB)와 `/tmp/pg-test.js`는 승격 대상이 아니다. 근거는 spec의 "기각 대상" 표.
