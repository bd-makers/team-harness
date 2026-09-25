# done-ritual-fold — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-25T23:52:32.802Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 3c19ee07c9c550076a688d52e72a88779fabea22 · exit 0 · 1612 B

```text
전하, **P2 수정 필요 사항 3건**입니다. P1은 발견하지 못했습니다.

- **P2 — `src/commands/task.mjs:851–853`**: HEAD와 작업 트리만 비교하므로, 산문 변경을 stage한 뒤 작업 트리를 체크박스 변경만 남도록 되돌리면 staged 작업까지 면제됩니다. staged 삭제 후 체크된 파일을 재생성해도 통과합니다. index 내용과 상태도 검사해야 합니다.
- **P2 — `src/commands/task.mjs:35–36`**: CRLF plan은 `split('\n')` 후 `\r`이 남아 정규식 매칭에 실패하므로, 줄바꿈을 유지하고 체크박스만 켜도 면제되지 않습니다.
- **P2 — `src/commands/task.mjs:848–849`**: porcelain 경로는 저장소 루트 기준인데 `planRel`은 `targetDir` 기준입니다. `targetDir=repo/packages/app`이면 정상적인 체크박스 변경도 경로가 일치하지 않아 차단됩니다.

`commands/harness-task.md:178–179`의 “산문 수정은 막는다”는 설명은 staged 변경에 대해 성립하지 않으며, CRLF·하위 디렉터리에서도 명시된 면제가 작동하지 않습니다. 들여쓴 체크박스, 일반 삭제·rename, NUL 구분 경로 처리에서는 추가 결함을 발견하지 못했습니다.

기존 순수 테스트 3개는 통과했고, 위 사례는 실제 함수와 추출한 가드 블록을 메모리에서 검증했습니다. 전체 통합 테스트는 실행하지 않았으며 파일은 수정하지 않았습니다.

**최종 판정: 수정 필요 — 특히 index 검증 누락은 clean-tree 가드 우회이므로 병합 전에 해결해야 합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=3c19ee07c9c550076a688d52e72a88779fabea22 at=2026-09-25T23:52:32.802Z -->

판별(작성 세션, 2026-09-26) — codex가 이번엔 인증 통과(전날 401 이후 첫 성공):
- P2 index 우회 — **진짜 결함.** HEAD↔작업 트리만 비교해 산문을 stage 후 작업 트리를 되돌리면 통과했다. index(`git show :./<plan>`)도
  같은 조건으로 검사하도록 수정, 회귀 테스트 추가(stage한 산문 → 차단).
- P2 CRLF — **진짜 결함(fail-closed).** `.`이 `\r`에 매칭되지 않아 면제가 안 됐다. `[^\n]*`로 수정, 헬퍼 테스트에 CRLF 케이스.
- P2 하위 디렉터리 targetDir — **기존 한계, 이 변경의 회귀 아님.** porcelain 경로(루트 기준)와 taskFileRel(targetDir 기준) 불일치는
  handoff 제외에도 있다. 면제가 안 될 뿐 막는 쪽(fail-closed)이다. 문서에 한계로 명시, 수정은 후속.

### 2026-09-25T23:56:36.461Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 3c19ee07c9c550076a688d52e72a88779fabea22 · exit 0 · 1205 B

```text
전하, **P2 1건이 남았습니다. P1은 발견하지 못했습니다.**

- **P2 — `src/commands/task.mjs:852–857`**: 내용만 비교하므로 plan의 실행 권한 변경이나 일반 파일→symlink 교체도 dirty 목록에서 제외됩니다. 체크박스를 전혀 바꾸지 않아도 `c === committed`로 통과하며, `readFile`은 symlink 대상 내용을 읽습니다. HEAD·index·작업 트리의 파일 유형과 mode도 확인해야 “체크박스만 변경” 조건이 성립합니다.

`commands/harness-task.md:178–180`의 index·작업 트리 검사 설명과 저장소 루트 제약은 코드와 일치합니다. 다만 **“체크박스를 켠 것뿐이면”**이라는 조건은 위 사례에서 지켜지지 않습니다.

기존 순수 테스트 3개는 통과했습니다. 실제 가드 블록을 추출한 메모리 검증에서 staged 산문·삭제 차단과 CRLF 보존 변경 허용을 확인했고, 위 우회도 확인했습니다. 파일은 수정하지 않았으며, 파일 생성이 필요한 통합 테스트는 실행하지 않았습니다.

**최종 판정: 수정 필요 — 파일 유형·mode 변경이 면제되지 않도록 보완해야 합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=3c19ee07c9c550076a688d52e72a88779fabea22 at=2026-09-25T23:56:36.461Z -->

판별(작성 세션, 2026-09-26):
- 1차 P2 두 건(index 우회·CRLF) 해소 확인됨.
- P2 mode·파일 유형 — **진짜 결함.** 내용 비교만으로는 chmod·symlink 교체가 "변경 없음"으로 면제됐다. `git diff [--cached] --raw`의
  양쪽 mode가 `100644`로 같을 때만 면제하도록 보완, 회귀 테스트(chmod 755 + 체크 → 차단) 추가. 재리뷰는 하지 않았다.

## Learnings
