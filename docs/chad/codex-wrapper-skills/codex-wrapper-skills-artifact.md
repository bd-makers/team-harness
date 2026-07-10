# codex-wrapper-skills — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 2026-07-09 Codex command-equivalent skill surface를 추가했다.
- 신규 wrapper skill 15개:
  - `skills/harness-apply`
  - `skills/harness-clone`
  - `skills/harness-contrarian`
  - `skills/harness-delete`
  - `skills/harness-doctor`
  - `skills/harness-init`
  - `skills/harness-interview`
  - `skills/harness-migrate`
  - `skills/harness-release`
  - `skills/harness-retro`
  - `skills/harness-simplifier`
  - `skills/harness-symlink`
  - `skills/harness-sync`
  - `skills/harness-task`
  - `skills/harness-upgrade`
- 기존 `skills/harness-sim`은 중복 생성하지 않고, Codex `$harness-sim` entry가 Claude `/harness-sim`에 대응한다는 섹션과 `agents/openai.yaml`을 추가했다.
- 각 신규 wrapper는 `../../commands/harness-*.md`를 읽어 기존 command contract를 SSOT로 따르도록 구성했다.
- `tests/manifest-sync.test.mjs`에 모든 Claude harness command가 Codex command-equivalent skill을 갖는지 확인하는 테스트를 추가했다.
- README Codex 플러그인 섹션에 `$harness-aijient-team:harness-*` 호출 방식과 wrapper SSOT 관계를 반영했다.
- 검증:
  - `node --test tests/manifest-sync.test.mjs`: pass, 8 tests.
  - `npm test`: pass, 133 tests.
  - command/skill count check: `commands=16`, `skills=18`, `missing=[]`.
  - `quick_validate.py`: 로컬 Python에 `yaml` 모듈이 없어 실행 불가. `manifest-sync`의 frontmatter 가드로 대체 검증했다.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings

- Codex에서 Claude command parity를 만들 때 `.claude-plugin/plugin.json commands[]`를 복제하는 대신 `skills/<command-name>/SKILL.md`를 추가해야 한다.
- 기존 command 문서를 복제하지 않고 wrapper가 command contract를 읽게 하면 Claude/Codex drift를 줄일 수 있다.
