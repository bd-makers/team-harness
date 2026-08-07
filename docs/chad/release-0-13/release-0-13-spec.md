# release-0-13 — Spec

## 목적 / 요구사항

team-harness(harness-aijient-team-plugin)를 0.12.0 → **0.13.0** (minor)으로 릴리스한다.
직전 병합(PR #16, `6371195`)이 하네스 발동 갭 3건을 main에 넣었으며 이를 배포하는 릴리스다.

1. **설치 안내 결함 수정** (릴리스 내용에 포함): `npm i -g harness-aijient-team`은 npm 공개
   저장소에 존재하지 않아 404 — 안내를 따르면 설치 실패. 선장 결정: 안내를 플러그인 경로
   기준으로 바꾼다(npm 공개 배포는 하지 않는다). 실측 확인된 실제 동작 절차:
   `/plugin marketplace add` → `/plugin install` → 생성된 마켓플레이스 클론 경로로
   `npm i -g ~/.claude/plugins/marketplaces/harness-aijient-team-marketplace`.
   고칠 자리: `README.md`(3채널 설명, 독립 CLI 섹션, clone 팀원 복구 절차),
   `src/commands/doctor.mjs`(경고 detail + JSON nextActions), `tests/doctor.test.mjs`(있다면 대응 기대값).
2. **CHANGELOG.md** `## [Unreleased]` 채우기 (Added/Changed/Fixed, Keep a Changelog 형식):
   - task 생성·재활성화 평문 출력의 다음 단계 안내 (`--json` 스키마 무변경)
   - `doctor`의 훅 CLI 실행 가능성 검사 + 복구 안내 (소스 저장소는 n/a skip)
   - README 온보딩 3채널 문서화, clone 팀원 복구 절차, 에이전트별 강제력 비대칭 표
   - 1단계 설치 안내 교정
3. `docs/what-changes-latest-version.html`을 0.13.0 내용으로 갱신 + 동일 내용을
   `docs/what-changes-0.13.0.html` 스냅샷으로 저장. "왜"는 사람이 직접 서술.
4. 검증: `node --test tests/`, `npm test`, `npm run docs:generate`, `npm run docs:check`,
   `node bin/harness-team.mjs release 0.13.0 --dry-run` 확인 후에만 실제 릴리스 1회 실행.
5. `CHANGELOG.md`의 `## [Unreleased]`를 `## [0.13.0] - <오늘 날짜>`로 이동.

## 설계 / 접근

- 워크트리 내 `node bin/harness-team.mjs`만 사용 (전역 `harness-team` 금지 — 선장 머신 오염 방지).
- `harness-team release`는 `--help`을 지원하지 않고 인자를 실행으로 간주하므로 dry-run 먼저,
  실제 실행은 검증 통과 후 의도적으로 단 1회.
- main에 직접 push·PR 직접 병합 금지. 태그도 만들지 않는다(병합 후 별도 지시 시 3단계에서).
- 리뷰는 no-mistakes 파이프라인 하나가 소유 — 별도 수동 리뷰 라운드 없음.

## Ontology

- **설치 채널 3종**: `apply`(프로젝트 파일 병합) / Claude Code 플러그인 설치(`/harness-*` 커맨드) /
  전역 CLI 설치(터미널·훅이 호출하는 `harness-team` 바이너리) — 서로 독립.
- **정본(SSOT)**: 이 워크트리(`harness-aijient-team-plugin` 레포)가 SSOT. `~/.claude/plugins/`
  아래 캐시·마켓플레이스 사본은 릴리스 도구가 생성하는 배포 결과물.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 0.13.0 minor 릴리스, 설치 안내 수정 포함. 브리프에 버전·범위 명시.
- [x] **Constraint 명확도** (30%) — MAINTAINING.md 릴리스 절차 + 브리프의 추가 안전 규칙(dry-run 우선,
      워크트리 전용 CLI, 태그 보류) 모두 명시적.
- [x] **Success 기준** (30%) — 완료 조건 6항목이 브리프에 명시(설치 안내 일치, 매니페스트 4개 0.13.0,
      CHANGELOG 항목, what-changes 스냅샷 일치, 테스트 통과, 태그 미생성).
- [x] **Context 명확도** — 영향 파일: README.md, src/commands/doctor.mjs, tests/doctor.test.mjs,
      CHANGELOG.md, docs/what-changes-*.html, 4개 매니페스트. 실측으로 확인 완료.
- [x] **Ambiguity ≤ 0.2** — 4/4 체크, 게이트 통과.

## 참고
- 실측: `npm ls -g`에서 `harness-aijient-team@0.12.0 -> ~/.claude/plugins/marketplaces/harness-aijient-team-marketplace` 확인 (2026-08-07).
