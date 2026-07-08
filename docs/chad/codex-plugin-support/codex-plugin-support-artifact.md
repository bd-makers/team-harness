# codex-plugin-support — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

2026-07-08 Codex plugin support 1차 구현 완료.

### 추가/변경
- `.codex-plugin/plugin.json` 추가
  - name/version은 `package.json` 및 Claude plugin과 동일하게 `harness-aijient-team` / `0.10.0`.
  - `skills: "./skills/"`로 기존 plugin skill 디렉토리를 Codex에 노출.
  - unsupported field(`hooks`)는 넣지 않음.
- `skills/harness-team/` 추가
  - Codex에서 Team Harness를 사용할 때의 얇은 진입 skill.
  - Claude slash command를 복제하지 않고 `harness-team` CLI와 `AGENTS.md`/task docs를 공통 코어로 사용하도록 안내.
- `skills/harness-sim/SKILL.md`
  - Codex 플러그인이 `skills/` 전체를 노출하므로, Codex quick validator가 허용하지 않는 힌트성 frontmatter key를 제거.
- `package.json.files`에 `.codex-plugin` 포함.
- `src/commands/release.mjs`
  - release 버전 불변식을 3개에서 4개 매니페스트로 확장:
    `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`.
  - surgical version bump가 Codex manifest도 함께 갱신.
- 테스트/문서
  - `tests/manifest-sync.test.mjs`에 Codex manifest/version/package files/skill TODO 및 Codex-exposed skill frontmatter 검증 추가.
  - release/observation 테스트 fixture를 4개 매니페스트 기준으로 갱신.
  - README/MAINTAINING/CHANGELOG에 Claude + Codex 병렬 구조 문서화.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-07-08 — 셀프 리뷰
- **정확성**: Codex manifest smoke 검증, manifest-sync, release dry-run, doctor plugin-dev 모드 모두 통과. release가 Codex manifest version까지 포함하도록 테스트로 고정.
- **엣지 케이스**: `.codex-plugin/plugin.json` 누락 시 release가 실패하는 쪽으로 동작한다. 이제 이 레포의 배포 계약은 Claude+Codex 병렬 manifest를 요구한다.
- **회귀**: `npm test` 전체 130개 통과. 기존 Claude commands/marketplace sync 테스트 유지.
- **보안**: 새 manifest/skill은 실행 권한이나 secret을 추가하지 않음. hooks/MCP/apps는 이번 범위에서 제외.
- **단순성**: Codex용 MCP/typed tools나 marketplace 자동 등록은 만들지 않고, 공통 CLI를 호출하는 얇은 skill만 추가.
- **테스트**: `PyYAML`을 임시 경로(`/tmp/harness-validator-pyyaml`)에 설치한 뒤 공식 skill quick validator(`harness-team`, `harness-sim`)와 Codex plugin validator 모두 통과. Node smoke 검증과 전체 테스트도 통과.

## Learnings

- Codex CLI의 `plugin` 하위 명령은 configured marketplace snapshot 기반이다. 이번 변경은 레포에 Codex plugin manifest/skill을 추가하는 1차 지원이며, 개인/팀 marketplace 등록은 배포 정책이 정해진 뒤 별도 작업으로 다룬다.
- Codex plugin validator는 Python `yaml` 모듈에 의존한다. 현재 mise 환경은 Python을 잡지 않고 macOS `/usr/bin/python3`를 사용하며, 기본 프록시 환경변수를 둔 pip 설치는 403으로 실패했다. `HTTP_PROXY`/`HTTPS_PROXY`를 제거한 임시 설치는 성공했다.
- `skill-creator`의 `quick_validate.py`는 frontmatter description의 angle bracket 문자를 거부한다. `docs/<user>/<task>/` 표현은 `docs user task structure`로 풀어 써야 통과한다.
- `.codex-plugin/plugin.json`이 `skills: "./skills/"`를 노출하면 `skills/` 아래 기존 skill도 Codex quick validator 호환 frontmatter를 유지해야 한다. Claude 전용 힌트성 key는 skill 본문이나 command 문서로 옮기는 편이 안전하다.
