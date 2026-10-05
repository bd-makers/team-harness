# remove-backup-cluster — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 2026-10-05 제거·이동 적용. 명령 25 → 19, 스킬 27 → 20. 29파일 +85/−1004.
- 검증(메인 세션 재실행): `npm run test` 1056 중 pass 1055 · fail 0 · skip 1, `npm run docs:check` 최신. 임시 git 저장소에 `init --yes` →
  백업·gitignore 질문 없음, `backup.json` 없음, doctor 경고 1건은 Codex 훅 신뢰 안내(환경, 무관).
- 소비자 영향: 기존 `../harness-backup/<name>/`과 `.harness/backup.json`은 그대로 남는다(고아, 무해). AI 파일을 gitignore한 프로젝트
  (job-scraper)는 백업 클론이 저장소 밖 유일 사본일 수 있다 — 그 프로젝트에서 원할 때 gitignore를 풀고 커밋하거나 직접 백업한다.
- 남긴 것: `docs/chad/harness-sim-guide.html`의 옛 스킬 경로(다른 멤버 영역), 이 저장소 `.gitignore`의 `.harness-backup/` 항목.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-05T09:18:29.594Z — codex (harness-team review)

- engine: codex · scope: diff · tip: 32ca082e1e68bc33edd3e07baa83ab56139893b1 · exit 0 · 768 B

```text
전하, **P1/P2 결함은 발견하지 못했습니다.**

- **P3** — [commands/harness-migrate.md:15](commands/harness-migrate.md#L15): 제거된 “backup dir 스크립트 → project root” 마이그레이션을 여전히 제공한다고 설명합니다.

관리 절 백업(`.harness/backup/`), 일반 symlink 검사, doctor·init·migrate 흐름과 이동된 메인테이너 명령의 상대 경로에서 유의미한 회귀는 확인되지 않았습니다.

검증: 읽기 전용 테스트 **22개 통과**, `docs:check`·`git diff --check` 통과. 쓰기가 필요한 전체 테스트와 실제 init·migrate 실행은 수행하지 않았습니다. 파일은 변경하지 않았습니다.

**최종 판정: PASS — 문서 잔여 참조 1건 정리 권장.**
```

<!-- harness:review kind=codex scope=diff tip=32ca082e1e68bc33edd3e07baa83ab56139893b1 at=2026-10-05T09:18:29.594Z -->

판별(2026-10-05): P3 1건 — **진짜 결함**. `commands/harness-migrate.md:15`가 제거된 백업 스크립트 변환을 여전히 설명했다 → 문구 삭제.

## Learnings
