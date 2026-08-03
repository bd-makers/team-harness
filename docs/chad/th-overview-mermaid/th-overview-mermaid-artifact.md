# th-overview-mermaid — Artifact

## 조사와 결정

- `harness-overview-0.9.2.html`의 12개 Mermaid 블록에서 모두 기반 원본을 회수했다. 이 중 11개는 현행 SVG 라벨과 일치했고, `subagents`만 현행 SVG에서 확인한 `순차 전환 세션` / `순차 작성` 라벨로 보정했다. 회수 불가능한 전체 다이어그램은 없었다.
- 정적 SVG를 빌드 시 생성하는 안은 저장소의 `docs/vendor/mermaid.min.js`가 브라우저용 bundle이라 Node 표준 라이브러리만으로 렌더링할 수 없고, 새 DOM/headless renderer 의존성이 필요해 제외했다.
- Mermaid 원본만 HTML에 두는 안은 다이어그램 문제만 해결하고 명령/파일 인벤토리와 같은 생성 단계를 만들지 못해 단독으로는 제외했다.
- 선택안은 **커밋되는 HTML 생성기 + 브라우저 Mermaid 렌더링**이다. `scripts/generate-harness-overview.mjs`가 템플릿, `.mmd` 원본, command manifest/frontmatter, 소스 트리를 한 번에 결합하고, 기존 vendored Mermaid가 열람 시 SVG를 렌더링한다. 새 외부 의존성은 없다.

## 범위

- 현재 `docs/harness-overview.html`만 생성 산출물로 전환했다.
- `harness-overview-0.7.0/0.8.0/0.9.2.html`은 raw Mermaid를 보존하고, `0.9.5`는 당시 렌더링 상태를 보존하는 버전 스냅샷이라 수정하지 않았다.
- `harness-workflow-simulation-0.7.0/0.8.0/0.9.2.html`은 raw Mermaid, `0.9.5`와 현재 파일은 processed SVG 상태임을 확인했다. 별도 문서 계열이며 이번 overview 생성 소스와 섞지 않고 후속 범위로 남겼다.

## 생성 계약

- command 행과 순서는 `.claude-plugin/plugin.json`, 설명과 Phase는 각 `commands/*.md` frontmatter가 소유한다.
- 파일 구조 표는 생성기가 현재 소스 디렉터리를 순회해 경로를 얻고 경로 규칙으로 유형/역할을 분류한다.
- `npm run docs:generate`가 산출물을 갱신하고 `npm run docs:check`와 단위 테스트가 수동 편집/드리프트를 차단한다.
- `adding a manifest command adds a generated command row` 테스트가 임시 command source와 manifest entry를 추가해 새 행 반영을 실제로 검증한다.

## Reviews

### 2026-08-03 — Codex self-review

- **정확성/엣지 케이스:** manifest에 등록된 command의 누락 파일·description·Phase를 오류로 처리하고, Mermaid placeholder와 `.mmd` 집합이 다르면 생성을 중단한다. 리뷰 중 생성 파일 자체를 파일 트리 입력으로 포함하면 파일 삭제 후 재생성이 불가능한 self-dependency가 생기는 문제를 찾아 입력 목록에서 제거했다.
- **회귀:** README의 수동 command inventory 금지는 유지했다. overview 표에는 `data-generated` 계약을 요구하고 manifest 전체 행과 일치시키는 방향으로 PR #8 가드를 보강했다. 버전 스냅샷과 workflow simulation은 변경하지 않았다.
- **보안:** command의 경로·description·Phase와 파일 트리 문자열은 HTML escape 후 삽입한다. 모든 입력은 저장소 내부 신뢰 소스이고 네트워크 접근이나 외부 renderer는 추가하지 않았다.
- **단순성:** Node 표준 라이브러리 생성기 하나와 기존 vendored Mermaid만 사용한다. 별도 정적 SVG renderer, DOM shim, 새 dependency는 없다.
- **테스트:** 생성 결과 byte equality, raw Mermaid/processed SVG 회귀, manifest command 추가 반영, PR #8 인벤토리 가드를 자동 검증한다.

## Verification

- `npm run docs:check` — 생성 산출물 최신 상태 확인.
- `node --test tests/harness-overview-generation.test.mjs tests/documentation-inventory-pointers.test.mjs` — 생성/가드 테스트 통과.
- `npm run test:unit` — 174 tests 통과.
- `npm test` — unit/e2e 184 tests + perf 1 test 통과.
- `templates/.claude/hooks/pre-commit-check.sh` — npm 감지, 저장소에 `tsconfig.json`이 없어 typecheck는 계약대로 skip, 전체 test 통과.
- Chrome 실파일 확인 — raw Mermaid 전부 SVG 렌더, manifest command 행 전부 생성, 파일 구조 표 생성, `병렬 작성` 라벨 없음.

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings
