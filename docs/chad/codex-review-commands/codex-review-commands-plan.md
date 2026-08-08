# codex-review-commands — Plan

## 목표

Codex read-only 리뷰 2종(`harness-codex-review`·`harness-codex-adversarial-review`)을
command+skill로 추가하고 manifest·README 계약을 통과시킨다.

## 단계

### §1 커맨드 (절차 SSOT)
- [x] `commands/harness-codex-review.md` — preflight(codex PATH)·scope 결정·codex exec
      실행·발견 검증·artifact 기록 절차 — 검증: bin 라우터 참조 테스트에 걸리지 않고,
      설치 명령을 단정하는 문구가 없는가
- [x] `commands/harness-codex-adversarial-review.md` — base 커맨드 참조 + 적대적
      프롬프트 프레이밍 교체 — 검증: base와 절차 중복이 없는가

### §2 스킬 (Codex 래퍼)
- [x] `skills/harness-codex-review/SKILL.md` — 검증: frontmatter name 일치 +
      `commands/harness-codex-review.md` 참조 (manifest-sync 계약)
- [x] `skills/harness-codex-adversarial-review/SKILL.md` — 동일 계약

### §3 매니페스트·문서 정합
- [x] `.claude-plugin/plugin.json` commands[]에 2개 등록 — 검증: 한쪽만 추가하면
      manifest-sync `commands/*.md ⟺ plugin.json` 테스트가 fail 하는가
- [x] README 커맨드 카운트 19 → 21 (79·82·101행) — 검증: grep으로 19개 잔존 0건

### §4 종결
- [x] `npm run test` 전체 통과
- [x] Codex 리뷰 실행(신규 커맨드 절차 자체 사용) + artifact `## Reviews` 기록
- [x] artifact `## 결과` 작성 → 커밋 → done

## Ontology 변경 로그

- (none)

## 참고

- tests/manifest-sync.test.mjs가 §1~§3의 계약 정본
