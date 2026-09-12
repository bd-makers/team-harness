# docs-html-stub-tests — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-12T19:45:49.240Z — codex (harness-team review)

- engine: codex · scope: diff · tip: 2549349397fec9140d699bf995ef493d104e388e · exit 0 · 1046 B

```text
전하, `origin/main` 대비 diff를 직접 검토했습니다. P1은 없습니다.

- **P2 — 테스트 간 상태 의존성:** `tests/docs-kickoff-deck.test.mjs:140`, `tests/docs-onboarding-checklist.test.mjs:91` — 선행 테스트가 실행돼야 통과하며, `--test-name-pattern='해시 갱신|localStorage 저장됨'`으로 선택 실행하면 정상 HTML에서도 두 건 모두 실패합니다. 각 테스트에서 필요한 상태를 준비해야 합니다.
- **P3 — 원본 단언보다 검사 범위 축소:** `tests/docs-kickoff-deck.test.mjs:106`, `tests/docs-onboarding-checklist.test.mjs:110` — 정규식이 닫는 구분자까지 요구하도록 바뀌어 원본이 잡던 `${unfinished`, `<broken`을 놓칩니다. 원본 검사식을 유지하는 편이 맞습니다.

검증: 신규 66건, 문서 인벤토리 검사, `docs:check` 통과. 전체 `npm test`는 파일 생성 때문에 실행하지 않았으며, 파일 변경은 없습니다.

**최종 판정: 수정 권장 — P2 해소 후 승인 가능합니다.**
```

<!-- harness:review kind=codex scope=diff tip=2549349397fec9140d699bf995ef493d104e388e at=2026-09-12T19:45:49.240Z -->

**판별 — 2건 모두 진짜 결함. 오탐 없음.**

**P2 (테스트 간 상태 의존) — 진짜 결함.** 재현: `node --test --test-name-pattern='^해시 갱신$'`이
정상 HTML에서 `fail 1`. 체크리스트의 `localStorage 저장됨`도 동일.
codex가 지목한 2건을 고치면서 같은 결함군 전체를 훑었더니 **13건이 더** 있었다
(playground 5 · deck 8). 조치: 각 테스트가 자기 선행 상태를 직접 만들도록 고쳤다 —
`setAmbiguity` · `ensureFlagged` · `ensureOn` · 프리셋 테스트의 `apply()`.
검증: 세 파일의 leaf 테스트 **전부를 하나씩 단독 실행**해 실패 0 확인.

  이 과정에서 별도 함정 하나를 찾았다 — 덱 스크립트는 `const ov=document.getElementById('overview')`를
  **keydown 핸들러 안에서** 실행하므로, 키 입력 전에는 스텁의 `store.overview`가 없다.
  `store[id]` 직접 접근 대신 지연 생성하는 `document.getElementById(id)`를 쓰도록 고쳤다.

**P3 (검사 범위 축소) — 진짜 결함, 작성자(이 세션) 실수.** 실패 메시지에 매치 문자열을 담으려고
정규식에 닫는 구분자를 넣은 것이 원인이다. 재현: `"x ${unfinished y"` → 원본 `/\$\{/` 탐지 true,
변환본 `/\$\{[^}]*\}/` 탐지 false. 체크리스트도 `"보고서 <broken 줄"`에서 동일.
spec의 "단언 내용은 바꾸지 않는다" 제약을 스스로 어긴 것이다.
조치: 원본 검사식으로 되돌리고, 메시지는 `match.index` 기준 슬라이스로 문맥을 보여준다.
검증: 렌더 결과에 `${unclosed`·`${closed}`를 각각 주입해 **둘 다 탐지** 확인(수정 전이라면 앞엣것을 놓친다).

**최종 상태** — `npm test` 885 pass / 0 fail. 대상 HTML 3종·`package.json` 무변경.
codex의 "P2 해소 후 승인 가능" 조건을 충족했다고 판단한다.

## Learnings

