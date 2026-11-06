# correct-guards — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`/pstack:correct` 전수 조사(커밋 400개, task artifact, `docs/followups.md`)로 13개 실수 클래스를 묶고 두 개를 구조로 막았다.

- 머신 상태 의존 테스트: `npm test` 계열이 `scripts/test-isolated.mjs`만 거친다. CI의 git 설정 단계는 없앴다.
- 플래그 가드 누락: `FLAG_CHOICES`가 플래그 이름에 값 계약을 묶는다. `init`·`stack`·`scope`·`review`의 인라인 가드는 삭제했다.
- 규칙표: `MAINTAINING.md` "반복 실수 규칙표".

### 과거 실수로 증명

```
1eb9aef^ (실제 ~/.claude를 읽던 테스트)
  node --test tests/cli-drift.test.mjs                       → pass 17, fail 0
  node scripts/test-isolated.mjs --test tests/cli-drift…     → pass 16, fail 1  (CI와 같은 실패)
8bcef1b^ (e2e가 실제 설치 기록을 읽음)
  node --test tests/e2e/*.test.mjs                           → fail 3
  node scripts/test-isolated.mjs --test tests/e2e/*…         → pass 10, fail 0
FLAG_CHOICES = {} 변이 (가드 없는 예전 상태)
  stack --stack typo --json, scope --scope typo --json       → 판정을 낸다(사고 재현)
  관련 테스트 4파일                                            → fail 5
```

### 결정 대기: handoff 단독 커밋

규칙(`commands/harness-task.md:145`, 685b744)이 생긴 뒤 병합된 브랜치 70개에 handoff 전용 커밋이 78개 있다. 그중 38개는 브랜치 맨 끝이라 규칙이 허용하고,
40개는 뒤에 작업 커밋이 더 있다. 푸시 사이의 sweep은 허용되므로 40개가 위반의 상한이다. 푸시 시점 기록이 없어 정확한 수는 알 수 없다.
main 직접 커밋은 이 수에 넣지 않았다.

`pr-check`가 커밋된 handoff를 요구하는 것이 sweep을 낳는 힘이다. 이 task에서도 handoff를 담기 전까지 `pr-check`가 실패했다.

린트는 답이 아니다. 이미 푸시한 sweep과 위반을 구분하려면 원격 sha가 필요해 CI의 `--base` 실행과 pre-push가 다른 판정을 낸다.
구조 해법은 post-commit이 추적 파일에 `git log -1`과 `--stat` 사본을 쓰는 일을 멈추는 것이고, 완료 표지와 D11의 handoff 요건을 함께 옮겨야 한다.

### 분류하고 고치지 않은 것

- 게이트가 잡고 머지되지 않아 닫힌 것: overview 인벤토리, stock sha, eager 예산.
- 판단 영역: 부분 전수 검색, 산문 검증, 약한 테스트, 사례만 고침, 미검증 기록. `done`에 필수화하면 D11이 되돌린 방향이다.
- 위치 인자 개수 검증은 사례가 `config` 1건이라 범위에서 뺐다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


### 2026-11-06 — `/code-review` high (로컬, main...HEAD)

발견 10건을 재현으로 판정했다. 외부 엔진 리뷰가 아니므로 `harness:review` 마커는 남기지 않는다.

| 발견 | 판정 | 조치 |
|---|---|---|
| 격리 러너가 `GIT_*`를 지우지 않음 | 진짜 | `GIT_DIR`·`GIT_INDEX_FILE`·`GIT_WORK_TREE` 삭제 |
| CI 가드 정규식이 `- run:` 형식을 놓침 | 진짜 | 앵커 제거 |
| 하드코딩 쌍 목록이 새 커맨드에 실패 | 진짜 | `pairs.length > 0`로 교체 |
| `SCOPES` 단언이 무관한 테스트에 남음 | 진짜 | `tests/cli-args.test.mjs`로 이동 |
| `review --scope` 오류 형태 변경 | 유지 | 다른 파서 오류와 같고 정상 호출은 영향 없음. CHANGELOG에 기록됨 |
| 시그널 시 임시 HOME 누수 | 진짜·미반영 | 남는 것은 임시 폴더 하나이고 실패는 가려지지 않음 |
| `resolveScope` 폴백 | 오탐 | 호출부 3곳이 파서 값 또는 리터럴 |
| `--shape`·`--rubric` 인라인 가드 | 미반영 | 고유 메시지와 조합 검사가 있음. 규칙표 문구만 좁힘 |
| `--stack=` 빈 값 | 오탐 | 빈 값을 넘기는 호출이 없음 |
| §5-A 패킷 누락 | 부분 인정 | `review` 계약 변경을 착수 질문에 적지 않았음. 코드 변경 없음 |

재현(버리는 클론):

```
옛 러너 + GIT_DIR·GIT_INDEX_FILE·GIT_WORK_TREE → pass 1, fail 24, 로컬 user.name = t
새 러너 + 같은 환경                            → pass 25, fail 0, 로컬 user 없음
```

## Learnings

- 게이트가 발동한 것은 재발이 아니다. 머지·배포까지 샌 것만 재발로 센다.
- 이 세션 셸에는 `harness-team`이 PATH에 없어 post-commit 훅이 조용히 건너뛰었다(`2>/dev/null || true`). handoff는 `node bin/harness-team.mjs handoff`로 채웠고, `d3df815`·`19dfae3`의 항목은 없다.
- 리뷰 판정 중 `GIT_DIR`를 실제 저장소로 지정해 테스트를 돌려 index와 로컬 `[user]`를 오염시켰다. 커밋·ref·훅·작업 트리는 무사했고 `git reset -q`와 `git config --local --remove-section user`로 복구했다. 저장소를 건드릴 수 있는 재현은 버리는 클론에서만 한다.
- `review --scope` 오타의 exit 코드·envelope 변경은 ① 표면의 계약 변경이라 다음 릴리스는 minor다. `commands/`·`skills/`·`templates/`·`docs/*.html`에 옛 동작을 적은 곳은 없었다.
