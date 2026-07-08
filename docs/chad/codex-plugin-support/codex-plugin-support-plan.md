# codex-plugin-support — Plan

## 목표

Claude Code 플러그인 기능을 유지하면서 같은 레포를 Codex 플러그인으로도 사용할 수 있게 한다.

## 단계
- [x] `.codex-plugin/plugin.json` 추가 및 공식 Codex plugin validator 통과
- [x] Codex용 `skills/harness-team/SKILL.md` 추가
- [x] `package.json.files`에 `.codex-plugin` 포함
- [x] manifest sync 테스트에 Codex manifest/version 검증 추가
- [x] `harness-team release`가 Codex manifest version도 함께 bump하도록 확장
- [x] README/MAINTAINING에 multi-host 플러그인 구조 문서화
- [x] Codex에 노출되는 `skills/` 전체가 quick_validate 호환 frontmatter를 쓰도록 정리
- [x] 검증: skill quick_validate, Codex plugin validate, Codex manifest smoke, `npm test`, `doctor --json`, `release --dry-run --json`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-07-08: 공통 코어 / 플랫폼 어댑터 / Codex plugin support 정의 추가.

## 참고
- `docs/chad/codex-plugin-support/codex-plugin-support-spec.md`
