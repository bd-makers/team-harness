# th-release-0-12 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `v0.11.0..main`의 실제 16커밋을 검토했다. 공개 명령·매니페스트 항목 제거는 없고 참조되지 않던 리포트 템플릿만 삭제되어 0.12.0 minor 판단을 유지했다.
- 네 매니페스트를 0.12.0으로 동기화하고 `CHANGELOG.md`에 2026-08-03 릴리스 항목을 사용자 체감 언어로 정리했다.
- 생성된 개요와 현재 workflow 문서에서 0.12.0 스냅샷을 만들고, 변경·이유·효과를 설명하는 `docs/what-changes-latest-version.html`을 추가했다.
- 실제 release 명령이 plugin cache와 marketplace를 동기화했으며, 실행 결과상 `installed_plugins.json` 레코드도 0.12.0으로 갱신됐다.

## 검증

- `PATH="$HOME/.local/share/mise/installs/node/20.19.5/bin:$PATH" node --test tests/` — 196 pass.
- `npm test` — unit/e2e 195 pass, performance 1 pass.
- `npm run docs:check` — 생성 상태 최신.
- `node bin/harness-team.mjs release minor --dry-run` — 0.11.0 → 0.12.0 계획 통과.
- manifest/overview 관련 targeted tests — 11 pass.
- `git diff --check` — 통과.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

- **2026-08-03 자체 리뷰:** 정확성·호환성·회귀·보안·단순성·테스트 순서로 확인했다. 릴리스 범위의 파괴적 변경은 없었고, 설명 HTML의 모든 변경 카드가 `변경 / 왜 / 그래서`를 포함한다. 동적 명령·파일 목록은 복제하지 않고 정본 포인터를 사용했다. 새 의존성·비밀값·런타임 코드 변경 없음.
- **시각 검증:** 기존 문서의 `--bg: #0f1117` 디자인 토큰을 재사용했고, Lavish/Chrome 접근성 트리에서 제목·내비게이션·모든 카드 내용이 렌더링되는 것을 확인했다.

## Learnings

- 브리프의 “12개 커밋”과 달리 태그 범위는 PR 병합 커밋 외 직접 커밋을 포함해 16개였다. 릴리스 노트는 PR 수가 아니라 실제 태그 범위를 기준으로 해야 한다.
- Node 24는 `node --test tests/`의 디렉터리 탐색을 지원하지 않아 저장소에 설치된 Node 20으로 필수 명령을 검증했다. Node 20 첫 실행의 성능 테스트는 동시 부하로 한 차례 흔들렸지만 재실행과 정식 `npm test`에서는 통과했다.
