# th-capsule-grammar — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- capsule 종결자를 `#`/`##` ATX 절 제목으로 한정하고, `####` 이하 제목은 capsule 범위에 유지했다.
- ATX 제목과 fenced code 구분자는 실질 본문에서 제외했다. fenced code 내부의 비공백 코드는 내용으로 세므로 첫 줄의 `# ...` 셸 주석이 capsule을 닫지 않는다.
- 루트 `AGENTS.md`와 배포 템플릿에 문법과 이유를 함께 기록했다.

### Red / green 증거

- 수정 전 `node --test tests/context.test.mjs`: 13개 중 2개 실패.
  - 하위 제목 뒤 본문: 기대 `1`, 실제 `0` — capsule 범위 누수 재현.
  - `capsuleLineHasContent('#### Signal')`: 기대 `false`, 실제 `true` — 단순 정규식 축소 시 과다 계수 위험 재현.
- 수정 후 `node --test tests/context.test.mjs`: 15/15 통과. 하위 제목+본문, 하위 제목-only, fenced code의 셸 주석, `##` 종결자를 모두 고정했다.
- 후속 R1/R2 수정 전 `validateContextCard` 재현: fenced code 내부 capsule 제목은 기대 `1`, 실제 `2`; 네 칸 들여쓴 fence 유사 줄 뒤의 `##`은 기대 `1`, 실제 `0`이었다.
- 후속 수정 후 `node --test tests/context.test.mjs`: 17/17 통과. `a literal capsule heading in fenced code remains content`와 `an indented fence-like line does not close fenced code` 회귀를 추가했다.

### 기존 카드 전수 비교

변경 전 알고리즘과 변경 후 `validateContextCard`를 저장소의 `*-context.md` 전체에 적용했다. 판정 변화는 없었다.

- `docs/chad/skilltest-skipstring/skilltest-skipstring-context.md`: `0 → 0`
- `docs/chad/th-overview-mermaid/th-overview-mermaid-context.md`: `0 → 0`
- `docs/chad/th-resident-verify/th-resident-verify-context.md`: `0 → 0`
- 이번 작업 중 생성한 `docs/chad/th-capsule-grammar/th-capsule-grammar-context.md`: `0 → 0`

### 검증

- `boundary check`: `not-configured`
- `context check`: valid, 1441/6144 bytes, 19/100 nonblank lines, 0/3 capsules
- `npm test`: unit/e2e 191/191 + performance 1/1 통과
- `templates/.claude/hooks/pre-commit-check.sh`: npm 감지 후 전체 테스트 및 hook 통과

## Reviews

*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)는 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-03 — Codex self-review

- 정확성: 두 판정을 함께 변경했고 네 필수 사례가 독립 테스트로 고정됐다.
- 엣지 케이스: 빈 capsule/stub, fenced code delimiter, backtick fence 내부 셸 주석, 다음 capsule 및 `##` 종결 흐름을 확인했다.
- 회귀: 기존 카드 전수의 예산 판정이 유지되고 전체 suite와 템플릿 드리프트 테스트가 통과했다.
- 보안: 파일 문자열의 결정론적 로컬 판정만 변경했으며 외부 입력 실행·의존성·민감 데이터 변경이 없다.
- 단순성: 기존 줄 단위 스캔을 유지하고 종결자/내용 정규식과 최소 fence 상태만 추가했다.
- 테스트: 핵심 성공·실패 방향과 요구된 네 사례를 커버했다.
- 발견/조치: R1은 fenced code 내부의 `### F-*`가 capsule로 다시 열리던 결함이었고, fence 상태를 capsule/절 제목보다 먼저 처리해 해결했다. R2는 네 칸 들여쓴 닫힘 유사 줄을 허용하던 결함이었고, CommonMark 범위의 들여쓰기와 marker 문자·길이를 함께 확인해 해결했다.

## Learnings

- 이번 문제는 같은 ATX 줄을 종결자와 실질 내용으로 서로 다르게 해석한 두 판정의 정합성 결함이다. 셸 주석은 그 종결자 결함의 fenced-code 변형이며 세 번째 독립 카운터 결함으로 판단하지 않았다. 따라서 스캔 구조 교체 없이 같은 루프에 최소 fence 상태만 추가했다.
