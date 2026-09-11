# review-adopt-record-quality — Spec

> 출처: `docs/followups.md` 3번(구 task → CLI 소유 마이그레이션)·8번(review 기록 품질 3건).
> 두 항목 모두 0.37.0 `review-evidence-cli-owned`의 후속이고 같은 minor에 묶는다 — 하나의 task, 두 단계.

## 목적 / 요구사항

### A. 구 task → CLI 소유 마이그레이션 (followup 3)

**오늘 무엇이 안 되는가.** 0.37.0은 `meta.reviews` 키가 있는 task만 CLI 소유로 보고, 키가 없는 구 task는
종전대로 artifact 마커로 판정한다. `harness-team review`는 구 task에 키를 **만들지 않는다** — 키 생성을
부수효과로 두면 첫 `review` 호출 순간 기존 손 마커가 verify 증거에서 조용히 빠지기 때문이다
(2026-09-10 adversarial 리뷰 P1). 그 결과 구 task를 CLI 소유로 옮기는 **명시적 경로가 없다**.
손으로 `"reviews": []`를 넣는 것은 현재 문서 계약이 금지한다(`what-changes-0.37.0.html` 소비자 절,
`commands/harness-task.md`의 "손으로 고치지 않는다").

**기대 결과.** `harness-team migrate --adopt-reviews`가 옵트인 단계로 열린 구 task의 meta에 `reviews: []`를
넣는다. 넣기 전에 **가드와 같은 계산으로** "이 task가 잃는 verify 증거 N개"와 그 실질 비용(재실행 필요)을
보여주고 확인받는다.

**제약.**
- 소급 자동화 금지 — 플래그 없이는 advisory 한 줄만 출력하고 아무것도 바꾸지 않는다.
- `--yes` 단독으로 채택하지 않는다. `--adopt-reviews`가 옵트인이고, `--yes`는 그 안의 confirm만 만족시킨다.
- N 계산은 `collectDoneIssues`가 쓰는 것과 **같은 파서·같은 판정 창**이어야 한다. 창 계산을 복제하면 다음
  규칙 변경에서 갈라진다(이미 두 번 바뀐 자리다 — `reopenedAt` 도입, fail-open 수정).

### B. `harness-team review` 기록 품질 3건 (followup 8, P3)

2026-09-11 `review-codex-live-check`의 codex 실측 리뷰 발견. `done` 가드 판정에는 영향이 없어 patch 사유는 아니다.

1. **블록 위치** — `appendFile`이 EOF에 붙여 기본 템플릿에서 `## Reviews`가 아니라 `## Learnings` 아래에 남는다.
   → fence 밖 첫 line-leading `## Learnings` 헤딩 **앞**에 삽입, 없으면 append.
2. **빈 출력 기록** — exit 0이면 stdout 0 B여도 기록된다. 아무것도 출력하지 않는 잘못 설정된 custom reviewer가
   `verify: required`를 통과시킬 수 있다. → 공백뿐인 stdout은 error 패킷으로 거부하고 **어떤 파일도 만들지 않는다**.
3. **custom 상대경로 preflight** — `which()`가 `./tool`을 process cwd 기준으로 `access`하지만 실행은 `targetDir`에서
   한다. `--target` + 상대경로 조합에서 실행 가능한 reviewer가 오거부된다. → `targetDir` 기준 resolve.

## 설계 / 접근

### A. `migrate --adopt-reviews`

- **자리**: `src/commands/migrate.mjs`에 `adoptTaskReviews(ctx)` 단계를 추가하고 `runMigrate`의 체인에 넣는다.
  `backfillTaskMeta`가 바로 옆에 있는 선례다(구 task의 meta를 소급 생성). `review --adopt`로 두지 않는다 —
  실패한 리뷰 실행이 상태 전이만 남길 수 있다.
- **후보**: `collectTasks`로 훑어 `status !== 'done'` && `!Array.isArray(meta.reviews)` 인 task.
  (`backfillTaskMeta`가 쓴 meta에도 `reviews` 키가 없으므로 pre-0.16 task도 후보에 들어온다.)
- **비용 계산**: task.mjs에서 판정 창 계산을 `evidenceWindowStart(meta)`로 **추출**해 `collectDoneIssues`와
  채택 단계가 같은 함수를 쓴다. N = `parseReviewMarkers(artifact)` 중 창 안 + `VERIFY_KIND_SUFFIXES` 접미사 일치 개수.
  각 task의 spec을 `parseDoneEvidenceDeclaration`으로 읽어 `verify !== 'required'`면 채택 비용이 0임을 그대로 말한다.
- **출력**: 플래그 없음 → `  review adoption: N legacy task(s) — rerun with --adopt-reviews to adopt` 한 줄,
  `false` 반환(아무것도 바꾸지 않았으므로 "Migration complete"를 혼자 띄우지 않는다).
  플래그 있음 → 후보·비용 표 출력 후 `confirm(..., { defaultYes: false })`.

### B. review.mjs 3건

1. `insertReviewBlock(artifact, block)` 순수 함수 — fence 상태를 줄 단위로 추적해 fence **밖** 첫 `^## Learnings`
   앞에 삽입. 없으면 EOF append. `appendFile` → read + `writeText`.
   *왜 fence 인식이 필요한가*: 이 저장소를 리뷰하면 엔진 출력에 `## Learnings` 문자열이 들어온다(템플릿·가드 코드에
   있는 문자열이다). 순진한 `/^## Learnings/m`은 **두 번째** 리뷰부터 이전 리뷰의 fence 안쪽을 찍어 파일을 깨뜨린다.
2. 빈 출력 거부는 exit-code 분기 **직후**에 둔다 — artifact 템플릿 생성(현 `review.mjs:363`)보다 앞이어야
   "어느 파일도 바뀌지 않았다"는 safeDefault가 참이 된다. 패킷에 `stderrTail`을 담는다(stderr로 쏟고 exit 0 한 경우가 실제 원인).
3. `which(name, env, cwd)` — 세 번째 인자만 추가해 기존 세 테스트의 호출 형태를 유지한다.
   `resolveEngine`은 `probe(head, process.env, targetDir)`로 넘긴다(주입된 double은 여분 인자를 무시).

## Ontology

- **CLI 소유(cli-owned) task**: meta에 `reviews` 배열 키가 있는 task. `verify: required`를 `meta.reviews`만으로 판정한다.
- **구 task(legacy)**: meta에 `reviews` 키가 없는 task. verify를 artifact 마커로 판정한다.
- **채택(adopt)**: 구 task의 meta에 빈 `reviews: []`를 넣어 CLI 소유로 넘기는 **명시적 1회 조작**. 이 순간부터
  기존 손 마커는 verify 증거가 아니다 — 그래서 사용자 확인 없이는 하지 않는다.
- **판정 창(evidence window)**: `reopenedAt || firstActivatedAt` 중 처음 유효한 ISO 값. 둘 다 깨졌으면 시각 비교 포기.
- **잃는 증거 N**: 판정 창 안이면서 kind가 verify 접미사로 끝나는 artifact 마커 수 — 가드가 세는 것과 같은 수.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 두 단계 각각의 산출물이 명령·함수 단위로 특정됨.
- [x] **Constraint 명확도** (30%) — 옵트인 플래그, `--yes` 비적용, 파서·창 공유, 기존 테스트 시그니처 유지.
- [x] **Success 기준** (30%) — 아래 테스트 목록 + 자기 리뷰가 B-1을 실측(블록이 `## Reviews` 아래 남는다).
- [x] **Context 명확도** (brownfield) — `src/commands/{migrate,review,task,summary}.mjs`, `src/cli-args.mjs`,
      `tests/{review-command,migrate,done-guard,cli-drift}.test.mjs`, 문서 3곳.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고

- 정본: `src/commands/review.mjs`(`which`·`runReview` 기록부), `src/commands/task.mjs`(`collectDoneIssues` cliOwned 분기),
  `commands/harness-review.md` 5단계 "구 task 호환", `commands/harness-task.md` "`<name>-meta.json`과 판정 창".
- 문서 정합: 위 두 문서와 `what-changes-0.37.0.html` 소비자 절이 "소급하지 않는다 / 손으로 고치지 않는다"를 말한다.
  채택 경로는 그 금지의 **사용자 확인을 거친 유일한 예외**로 기술한다 — `review`의 부수효과 금지는 그대로다.
- iCloud 주의: `git ls-files` 기반 생성 문서(overview 인벤토리)를 돌리기 전 `git status --porcelain`과 대조
  (index 롤백 이력).
