# release-0-13 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

team-harness 0.12.0 → **0.13.0** minor 릴리스 준비 완료 (브랜치 `fm/th-release-0-13`).

### 1단계 — 설치 안내 결함 수정

실측으로 확인한 실제 동작 절차 (2026-08-07, 이 머신):

```
npm ls -g  →  harness-aijient-team@0.12.0 -> ./../../../../../../../.claude/plugins/marketplaces/harness-aijient-team-marketplace
npm root -g의 심볼릭 링크  →  /Users/chadonpro/.claude/plugins/marketplaces/harness-aijient-team-marketplace
which harness-team → readlink →  .../marketplaces/harness-aijient-team-marketplace/bin/harness-team.mjs
package.json (해당 클론) → name: "harness-aijient-team", bin.harness-team: "./bin/harness-team.mjs"
```

즉 실제 동작하는 전역 설치 절차는:
1. `/plugin marketplace add https://github.com/bd-makers/team-harness` — 마켓플레이스를
   `~/.claude/plugins/marketplaces/harness-aijient-team-marketplace`로 클론
2. `/plugin install harness-aijient-team` — 캐시에 설치
3. `npm i -g ~/.claude/plugins/marketplaces/harness-aijient-team-marketplace` — 클론 경로를
   npm 전역 링크로 등록 (`npm link` 동등)

npm 공개 배포는 하지 않는다는 선장 결정에 따라 이 절차로 README·`doctor.mjs`·독립 CLI
섹션을 통일했다. `tests/doctor.test.mjs`에는 해당 문자열을 직접 검증하는 어써션이 없어
(수정 전 검증: `grep -rn "npm i -g harness-aijient-team\|nextActions" tests/`) 별도 변경은
불필요했다 — `checkHookCli`는 boolean 로직만 테스트한다.

수정 위치:
- `README.md` — 3채널 표(`전역 harness-team CLI 링크`), clone 팀원 복구 절차, 독립 CLI(방법 C) 섹션
- `src/commands/doctor.mjs:292` — 경고 detail 문구
- `src/commands/doctor.mjs:318` — JSON `nextActions` 항목

### 2단계 — 릴리스

- `CHANGELOG.md` `## [0.13.0] - 2026-08-07` 채움 (Added 2 / Changed 2 / Fixed 1)
- `docs/what-changes-latest-version.html` 0.13.0 내용으로 갱신, `docs/what-changes-0.13.0.html`로
  동일 스냅샷 저장 (diff 없음 확인)
- 검증 순서와 결과:
  - `node --test tests/*.test.mjs tests/e2e/*.test.mjs` → 209 pass (릴리스 전/후 각 1회)
  - `npm test` → 209 + 1(perf) pass
  - `npm run docs:generate` → `docs/harness-overview.html` 재생성
  - `npm run docs:check` → "harness overview 생성 상태가 최신입니다"
  - `node bin/harness-team.mjs release 0.13.0 --dry-run` → 대상 버전 0.13.0, 매니페스트 4개·
    cache·marketplace 경로 확인 후 실제 실행
  - `node bin/harness-team.mjs release 0.13.0` (실제 실행, 1회) → 매니페스트 4개 모두 0.13.0,
    cache/marketplace/`installed_plugins.json` 동기화됨
- `MAINTAINING.md` 릴리스 절차 경고에 `release`가 `--help`를 실행으로 간주한다는 함정 한 줄 추가
- main에 직접 push·PR 직접 병합·태그 생성 없음 (3단계에서 병합 후 진행 예정)

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

- **2026-08-07** — no-mistakes 파이프라인이 이 릴리스 브랜치(`fm/th-release-0-13`)의 유일한
  독립 리뷰 소유자다. 별도 수동 Codex/Gemini 리뷰 라운드는 의도적으로 생략했다
  (AGENTS.md 리뷰 프로토콜 + firstmate 브리프 지시에 따름). 대상 범위: README.md,
  src/commands/doctor.mjs, CHANGELOG.md, docs/what-changes-{latest-version,0.13.0}.html,
  MAINTAINING.md, 4개 매니페스트.

## Learnings

- `npm i -g <public-package-name>`처럼 그럴듯해 보이는 설치 안내도 실제로 npm 공개 저장소에
  배포되지 않은 패키지라면 실측 없이는 틀렸는지 알 수 없다. `npm ls -g`로 기존 전역 링크의
  실제 대상 경로를 확인하는 것이 가장 빠른 검증 방법이었다.
- 설치 절차 하나를 고칠 때 README·`doctor.mjs` 경고 detail·JSON `nextActions` 세 곳이 함께
  맞아야 사람이 읽는 안내와 에이전트가 소비하는 복구 명령이 어긋나지 않는다.
- `harness-team release`는 `--help`를 지원하지 않고 인자를 실행으로 간주한다 — 이 함정은
  이번 브리프의 핵심 안전 규칙이었고 MAINTAINING.md에 영구 기록해 반복 사고를 막았다.
