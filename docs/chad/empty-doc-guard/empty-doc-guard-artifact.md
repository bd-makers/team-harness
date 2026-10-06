# empty-doc-guard — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- pr-check `taskFindings`: 없음 → **비어 있음(`!trim()`)** → 템플릿 그대로 순서로 판정한다. 4문서 모두에 적용된다.
- `done` `collectDoneIssues`: 빈 plan(`plan.md가 비어 있음 (단계 없음)`)과 빈 artifact(`artifact.md가 비어 있음 (결과/학습 미기록)`)를 차단 사유로 낸다. plan 부재 시의 동작은 그대로다.
- 회귀 테스트 2건(pr-check 4문서×2형태, done 3형태)을 추가했다. `npm run test` 1168 pass / 0 fail / 1 skip(기존), `docs:check` 최신.
- `dangerous-git-end-boundary` plan을 `a4e45a3` 판으로 복원했다. 미완 3단계는 artifact·meta 증거로 체크했고, 복원 사실은 그 plan의 `## 참고`에 남겼다.
- 판정 서술 3곳(README·cycle §4-6·harness-ship)에 "비었거나"를 더했다. CHANGELOG `### Fixed`에도 항목을 넣었다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-06T03:14:03.777Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 6ea11750ba2e03a8b945db8f2c3881a5f8ee987c · exit 0 · 851 B

```text
P1/P2에 해당하는 유의미한 결함은 발견하지 못했습니다.

- **P3 nit — CHANGELOG.md:73, docs/chad/empty-doc-guard/empty-doc-guard-spec.md:6**: “두 가드가 템플릿만 비교”했다는 설명은 부정확합니다. `done`의 plan 검사는 미완 체크박스 검사였으므로 원인을 구분해 서술하십시오.

빈 문서 판정과 기존 없음·템플릿 메시지 순서는 적절합니다. 복원된 plan의 완료 표시도 과거 git 기록, artifact, 리뷰·종결 기록으로 뒷받침됩니다.

검증: 구문 검사, `docs:check`, `git diff --check`, 파일·git 입력을 모킹한 메모리 내 35건 통과. 파일 생성이 필요한 기존 테스트는 읽기 전용 제약으로 실행하지 않았습니다. 파일 변경은 없습니다.

**최종 판정: Approve — 문구 수정 권장.**
```

<!-- harness:review kind=codex scope=worktree tip=6ea11750ba2e03a8b945db8f2c3881a5f8ee987c at=2026-10-06T03:14:03.777Z -->

판별: P3 1건은 **진짜**(문구). `done`의 plan 검사는 템플릿 비교가 아니라 미완 체크박스 검사다.
CHANGELOG와 spec 문제 절의 원인 서술을 가드별로 나눠 고쳤다. 코드 변경은 없다. 리뷰어는 읽기 전용이라 파일 기반 테스트를 돌리지 않았다. 작성 세션의 `npm run test` green이 그 공백을 메운다.

## Learnings

- 템플릿 비교 가드는 "템플릿보다 더 빈 것"을 놓친다. 비교로 판정하는 가드에는 공집합(0바이트·공백뿐) 경우를 같이 테스트한다.
- 실례의 원인 서술은 meta를 대조한 뒤 쓴다. `done`이 `--force`였어도 forcedIssues를 보면 plan 가드가 발동하지 않았다는 사실이 분리된다.
