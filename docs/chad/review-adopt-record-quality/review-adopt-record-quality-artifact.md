# review-adopt-record-quality — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

followups 3번(구 task → CLI 소유 채택)과 8번(review 기록 품질 3건)을 한 diff로 구현했다.

### A. `harness-team migrate --adopt-reviews` (followup 3)

- `src/commands/migrate.mjs`: `collectReviewAdoptionCandidates` + `adoptTaskReviews` 추가, `runMigrate` 체인에
  `backfillTaskMeta` **뒤**로 편입(방금 만들어진 meta도 같은 실행에서 후보가 되도록).
- 후보 = `status !== 'done'` && meta 파일 존재 && `reviews` 키 없음.
- 잃는 증거 N은 가드와 **같은 파서·같은 창**으로 센다 — 이를 위해 `task.mjs`에서
  `evidenceWindowStart(meta)`와 `isVerifyKind(kind)`를 추출·export하고 가드(`collectDoneIssues`)도 같은 함수를 쓰게 했다.
  (창 계산이나 kind 정규식을 복제했다면 사용자가 보는 수와 가드가 세는 수가 다음 규칙 변경에서 갈라진다.)
- 각 task의 spec을 `parseDoneEvidenceDeclaration`으로 읽어 verify를 요구하지 않으면 "잃는 증거 없음"이라고
  그대로 말한다 — 비용이 0인 task에 겁주는 메시지를 내지 않는다.
- 안전 규칙 두 가지: 플래그 없으면 안내 한 줄만 내고 `false` 반환(아무것도 바꾸지 않음), **`--yes` 단독으로는
  채택하지 않는다**. 다른 migrate 단계는 구조를 옮기지만 이 단계는 증거를 잃기 때문이다.

### B. `harness-team review` 기록 품질 3건 (followup 8, P3)

1. **블록 위치** — `insertReviewBlock(artifact, block)` 순수 함수. fence 상태를 줄 단위로 추적해 fence 밖
   첫 줄머리 Learnings 헤딩 앞에 삽입하고, 없으면 EOF append. `appendFile` → read + `writeText`.
   fence 인식이 핵심이다: 이 저장소를 리뷰하면 엔진 출력에 그 헤딩 문자열이 들어오므로, 순진한 정규식은
   **두 번째** 리뷰부터 이전 블록의 fence 안쪽을 찍어 파일을 깨뜨린다(전용 테스트로 고정).
2. **빈 출력 거부** — 공백뿐인 stdout은 exit 0이어도 error 패킷. 위치는 exit-code 분기 **직후**(artifact 템플릿
   생성보다 앞) — 거부한 실행이 파일을 만들면 패킷의 `safeDefault`가 거짓말이 된다. 패킷에 `stderrTail`을 담는다.
3. **custom 상대경로 preflight** — `which(name, env, cwd)`로 세 번째 인자를 추가하고 `resolveEngine`이 `targetDir`을
   넘긴다. 첫 토큰 경로와 PATH 항목 **양쪽** 모두 실행 기준(`runEngine`의 spawn cwd)으로 푼다.

### 검증

- `npm run test` 전체 통과(783 tests, 1 skip). 신규 테스트 13건:
  `tests/review-command.test.mjs` 7건(위치·fence 오인·헤딩 없음·빈 출력 2건·상대 PATH 항목·상대경로 첫 토큰),
  `tests/review-adoption.test.mjs` 6건(후보 필터·N이 가드와 일치·플래그 없으면 불변·채택 후 판정 전환·비용 0·거부 시 불변).
- N이 가드와 일치한다는 것은 주장이 아니라 테스트다 — 같은 fixture에서 채택 **전** `runDone`이 통과하고
  채택 **후** 검증 증거 부재로 막히는 것을 함께 확인한다.
- 거부 경로는 `confirm`이 stdin을 읽으므로 진짜 바이너리를 `input: 'n\n'`으로 돌려 meta 불변을 확인했다.

### 문서

- `commands/harness-review.md` 5단계 "구 task 호환"에 채택 경로 추가(`review`의 부수효과 금지는 유지).
- `commands/harness-task.md` — 손으로 `"reviews": []`를 넣지 않는다 + 인가 경로 명시.
- `commands/harness-migrate.md` · `README.md` — 옵트인 규칙과 비용을 명시.
- `docs/followups.md` — 3·8번 삭제(번호는 참조 안정을 위해 유지), 우선순위 절 갱신.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-09-11T08:48:55.898Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 97504046f7eeb33fd8b74ab7e8b885a04614f632 · exit 0 · 1340 B

```text
전하, P1은 없습니다.

- **P2** — [src/commands/review.mjs:159](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/review.mjs:159>): `which()`가 상대적인 `PATH` 항목(`.`, `../bin`)을 전달받은 `cwd`가 아닌 `process.cwd()` 기준으로 검사해, target에서 실제 실행 가능한 reviewer를 오거부합니다.
- **P3** — [src/commands/task.mjs:639](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:639>): done-guard가 추출된 `isVerifyKind()` 대신 private regex를 직접 호출해, migrate와의 “동일 판정 함수” 계약이 완전히 중앙화되지 않았습니다.

확인 결과:

- adoption count는 현재 동일 parser, window, regex를 사용하므로 done-guard 규칙과 일치합니다.
- 동적 fence 길이와 fence-aware insertion을 재현했으며, 기존 review output에 nested backticks와 `## Learnings`가 있어도 artifact가 손상되지 않았습니다.
- empty-output 거부는 artifact/meta 쓰기 전에 실행됩니다.
- `git diff --check`는 통과했습니다.

**최종 verdict: CHANGES REQUESTED — 상대 `PATH` 항목의 cwd 처리(P2)를 수정해야 합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=97504046f7eeb33fd8b74ab7e8b885a04614f632 at=2026-09-11T08:48:55.898Z -->

**판별 (2026-09-11, 1차).** 전역 PATH의 `harness-team`은 마켓플레이스 clone(0.37.0)이라 이 실행은 **옛 코드**로 돌았다 —
그래서 이 블록 자체는 EOF에 붙었고, 손으로 이 자리로 옮겼다. 이후 리뷰는 `node bin/harness-team.mjs`로 돌린다.

- **P2 (진짜 결함, 수정함)** — `which()`의 PATH 루프가 `join(dir, name)`이라 PATH 항목 자체가 상대 경로
  (`PATH=bin`)면 여전히 process cwd 기준이었다. 첫 토큰만 고치고 루프를 남기면 같은 버그가 한 자리 옮겨 살아남는다.
  `resolve(cwd, dir, name)`으로 고치고 회귀 테스트를 붙였다.
- **P3 (진짜 결함, 수정함)** — 가드가 추출한 `isVerifyKind()` 대신 private 정규식을 계속 호출해 "migrate와 같은
  판정 함수" 계약이 반쪽이었다. 가드 쪽도 `isVerifyKind()`를 쓰게 했다.

### 2026-09-11T08:55:11.331Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 97504046f7eeb33fd8b74ab7e8b885a04614f632 · exit 0 · 1837 B

```text
전하, P1은 없습니다.

- **P2** — [src/commands/review.mjs:140](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/review.mjs:140>): multiline inline-code 안의 줄머리 `## Learnings`를 실제 헤딩으로 오인해 리뷰 블록을 본문 중간에 삽입합니다. 실제 artifact도 [line 25](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/docs/chad/review-adopt-record-quality/review-adopt-record-quality-artifact.md:25>)에서 문장이 갈라졌고, 블록은 실제 `## Reviews`([line 84](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/docs/chad/review-adopt-record-quality/review-adopt-record-quality-artifact.md:84>))보다 앞에 있습니다.

확인된 수정:

- `which()`의 `resolve(cwd, dir, name)`은 정상입니다. `PATH=bin` 재현에서 대상 디렉터리의 절대 실행 경로를 반환했습니다.
- `collectDoneIssues()`는 [task.mjs:639](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:639>)에서 실제로 `isVerifyKind()`를 호출합니다.
- `git diff --check`와 수정된 소스의 구문 검사는 통과했습니다.
- 전체 테스트는 read-only sandbox가 임시 파일 생성을 차단하므로 재실행하지 못했습니다.

**최종 verdict: CHANGES REQUESTED** — 두 적용 수정은 타당하지만, `insertReviewBlock`은 요청하신 배치 계약을 실제로 위반합니다. 실제 Markdown heading을 확실히 식별하도록 수정하고 multiline inline-code 회귀 테스트를 추가해야 합니다.
```

<!-- harness:review kind=codex scope=worktree tip=97504046f7eeb33fd8b74ab7e8b885a04614f632 at=2026-09-11T08:55:11.331Z -->

**판별 (2026-09-11, 2차).** 수정 두 건은 리뷰어가 재현으로 확인했다(`PATH=bin` 절대 경로 반환, 가드의 `isVerifyKind()` 호출).

- **P2 (오탐 — 단, 원인은 내 실수)** — 문장이 갈라지고 블록이 `## Reviews`보다 앞에 놓인 것은 `insertReviewBlock`이
  아니라 **내가 1차 블록을 손으로 옮길 때 쓴 `str.index('## Learnings')`** 때문이다. 그 naive indexOf가 산문 안의
  인라인 언급을 먼저 찍어 문장을 반으로 잘랐고, 그 결과 줄머리 가짜 헤딩이 생겨 2차 삽입이 거기로 갔다.
  리뷰어는 그 훼손된 상태만 보고 원인을 코드로 귀속했다 — 코드 경로는 fence 인식 + 줄머리 대조이고,
  훼손 이전 원본에는 줄머리 가짜 헤딩이 없었다. artifact를 복구하고 3차 리뷰로 배치를 실측했다.
- **남는 한계(수용)** — 여러 줄에 걸친 인라인 코드 스팬 안의 줄머리 헤딩 문자열은 여전히 구분하지 못한다.
  완전한 판별은 Markdown 파서가 필요하고, artifact는 에이전트가 쓰는 산문이라 그 조합은 드물다.
  대신 산문에서 그 헤딩 문자열을 줄머리에 두지 않는다(이 문서가 그 규칙을 따른다).

### 2026-09-11T09:00:04.343Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 97504046f7eeb33fd8b74ab7e8b885a04614f632 · exit 0 · 1366 B

```text
전하, P1/P2는 없습니다.

- **P3** — [review-adopt-record-quality-artifact.md:35](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/docs/chad/review-adopt-record-quality/review-adopt-record-quality-artifact.md:35>): “신규 테스트 12건”이라고 적었지만 실제 합계는 7+6=13건입니다.

검증 결과:

- 리뷰 블록은 `## Reviews`(49행) 아래, `## Learnings`(115행) 앞에 있습니다. `insertReviewBlock()`의 in-memory 재현도 동일했습니다.
- 상대 `PATH` 항목은 [review.mjs:162](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/review.mjs:162>)에서 `resolve(cwd, dir, name)`로 처리되며 실제 경로 반환을 확인했습니다.
- done guard는 [task.mjs:639](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:639>)에서 `isVerifyKind()`를 사용합니다.
- 전체 working-tree diff와 untracked 파일을 검토했습니다. `git diff --check`와 변경 JS 파일 syntax check도 통과했습니다.

**최종 verdict: APPROVE — P3 문서 숫자 오기만 있으며, 차단하거나 반드시 수정할 P1/P2는 없습니다.**
```

<!-- harness:review kind=codex scope=worktree tip=97504046f7eeb33fd8b74ab7e8b885a04614f632 at=2026-09-11T09:00:04.343Z -->


**판별 (2026-09-11, 3차 — APPROVE).** 배치 계약을 실측으로 확인했다: 블록이 `## Reviews` 아래·`## Learnings` 앞에 들어갔고,
리뷰어가 `insertReviewBlock()`을 따로 재현해 같은 결과를 얻었다. 두 수정(PATH 항목 resolve, 가드의 `isVerifyKind()`)도 코드에서 확인됐다.

- **P3 (진짜 오기, 수정함)** — "신규 테스트 12건"은 틀렸다. 7 + 6 = **13건**이다. 위 검증 절을 고쳤다.

## Learnings

- **전역 `harness-team`은 이 저장소의 코드가 아니다.** PATH의 CLI는 마켓플레이스 clone(릴리스된 버전)을 가리키므로,
  개발 중 자기 변경을 dogfood하려면 `node bin/harness-team.mjs`로 돌려야 한다. 1차 리뷰가 0.37.0 코드로 돌아
  "고친 배치"가 아니라 옛 EOF append를 재현했고, 그 산출물을 보고 잘못된 결론으로 갈 뻔했다.
- **문서 안에서 그 문서의 마커·헤딩을 손으로 옮길 때 naive `indexOf`를 쓰지 말 것.** 산문 안의 인라인 언급을
  먼저 찍어 문장을 반으로 자른다 — 코드에는 fence 인식을 넣어 놓고 같은 실수를 손으로 했다.
  자기 자신을 설명하는 문서에서는 줄머리에 헤딩 문자열을 두지 않는 것도 함께 지킨다.
- **외부 리뷰어의 원인 귀속은 주장이다.** 2차 리뷰의 P2는 증상(문장 갈라짐)은 정확했지만 원인을 코드로 귀속했고,
  실제 원인은 그 직전의 수동 편집이었다. 증상 재현 → 원인 분리 → 판별의 순서를 지키지 않으면 멀쩡한 코드를 고치게 된다.
