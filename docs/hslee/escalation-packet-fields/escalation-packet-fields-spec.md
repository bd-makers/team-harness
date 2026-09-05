# escalation-packet-fields — Spec

## 목적 / 요구사항

2026-09-05 PDF 6층 플레이북 비교 분석의 **권고 ③**을 구현한다: 하네스의 escalation packet에
"시도한 대안"과 "안전 기본값" 2필드를 더한다.

PDF §V.A "Escalation Is Not Failure"가 규정하는 패킷은 5항목이다 — 사람에게 요구하는 결정 ·
권장안 · 이미 시도한 대안 · 기다림의 비용 · 무응답 시 안전 기본값. 현재 하네스는 이 중 3항목만
가진다.

- **기계용(CLI `--json` 엔벨로프)**: `error = { root_cause, safe_retry, stop_condition }`.
  "시도한 대안"과 "무응답 시 남는 상태"가 없다. 소비자(에이전트)는 거부를 받고도 다른 경로가
  있는지, 아무것도 안 하면 무엇이 남는지 알 수 없다.
- **사람용(`CLAUDE.md` §5-A 복잡도 게이트)**: "사용자에게 1줄 권유"만 규정한다. 결정 요청과
  권장안은 있으나 시도한 대안·기다림의 비용·안전 기본값이 없다.

요구사항:

1. 엔벨로프 `error`에 `alternatives`(string[]) · `safe_default`(string)를 **항상 존재하는**
   필드로 더한다. 스키마는 `harness/observation/v1`을 유지한다(additive).
2. 값을 손으로 만드는 생산자 9곳을 공용 헬퍼로 통일해, 새 필드를 빠뜨린 생산자가 생길 수
   없게 한다. text 미러도 같은 헬퍼가 렌더한다.
3. `CLAUDE.md` §5-A의 사람용 escalation을 PDF 5항목 패킷으로 교체한다(템플릿 + 저장소 사본).
4. 기존 소비자(3키를 읽는 테스트·문서)를 깨지 않는다.

**PDF 문구에서 의도적으로 벗어난 지점**: PDF의 항목은 "alternatives already tested"(이미 시도한
대안)다. 기계용 엔벨로프에서는 이 문구를 그대로 쓸 수 없다 — CLI가 거부하는 시점에는 "시도 이력"이
없기 때문이다(검증이 실패했을 뿐 다른 경로를 실행해 본 적이 없다). 소비자에게 실제로 쓸모 있는
것은 "지금 대신 취할 수 있는 행동"이라 `alternatives`를 그 의미로 구현한다. 사람용 §5-A는 세션
안에서 실제로 검토·기각한 경로가 있으므로 PDF 문구 그대로 "시도한 대안"이다. 두 형태가 같은
필드 이름을 쓰되 의미가 다르다는 사실은 아래 Ontology가 명시한다.

범위 밖: PDF 권고 ④(settings ask 계층)·⑦(handoff 타입화), 재시도·토큰·비용 예산,
`harness-team done`의 `--json` 미지원(③ 이전부터 있던 별개 갭), 릴리스.

## 설계 / 접근

### 표면 — `src/observation.mjs`

```js
export function buildErrorPacket({ cause, retry, alternatives = [], safeDefault, stop })
// → { root_cause, safe_retry, alternatives, safe_default, stop_condition }

export function renderErrorPacket(packet) // → string[] (text 미러 줄들)
```

- `buildErrorPacket`이 5키를 **강제**한다: `retry`·`safeDefault`·`stop`이 비어 있지 않은 string,
  `alternatives`가 string 배열이 아니면 throw. `cause`는 비어 있지 않은 string **또는** 비어 있지
  않은 string 배열을 받는다 — 배열은 `runDone` 가드의 issue별 출력을 위한 text 전용이며, JSON을
  내보내는 생산자는 string만 넘긴다(테스트가 `typeof root_cause === 'string'`으로 고정한다).
  잘못된 생산자는 개발 시점에 터진다.
- `buildEnvelope`는 **pass-through를 유지한다** — `error`의 모양을 정규화하지 않는다.
  이 선택이 `tests/observation.test.mjs:22`의 `assert.deepEqual(env.error, {3키})` 계약 테스트를
  그대로 살린다. 강제는 헬퍼가, 통과는 엔벨로프가 담당하는 분업이다.
- `renderErrorPacket`은 기존 text 형식(`cause:`/`retry:`/`stop:`)에 두 줄을 더한다:
  `alternatives:`(항목마다 1줄, 빈 배열이면 줄 자체를 찍지 않는다) · `default:`.
  `cause`가 배열이면 항목마다 `cause:` 줄을 찍는다 — `runDone` 가드의 issue별 N줄 출력을 보존한다.

### 생산자 9곳

| # | 위치 | 형태 | 조치 |
|---|---|---|---|
| 1 | `src/commands/summary.mjs:315` | 지역 `fail()` | 헬퍼 치환 |
| 2 | `src/commands/observe.mjs:228` | 지역 `fail()` (본문 동일) | 헬퍼 치환 |
| 3 | `src/commands/rules.mjs:145` | 지역 `fail()` (본문 동일) | 헬퍼 치환, 호출자에 2필드 추가 |
| 4 | `src/commands/release.mjs:459` + `ERROR_ADVICE` | 표 주도(5종) | 표에 `alternatives`·`safeDefault` 열 추가 |
| 5 | `src/commands/task.mjs:216` | 인라인 (bad-name) | 헬퍼 치환 |
| 6 | `src/commands/task.mjs:667` | 인라인 (retro no-active) | 헬퍼 치환 |
| 7 | `src/commands/doctor.mjs:687` | 삼항 (`checks[]` 요약) | 헬퍼 치환 |
| 8 | `src/commands/rules.mjs:310` | invalid-action, JSON만 3키 | **JSON만** 5키로 |
| 9 | `src/commands/task.mjs:611` | `runDone` 가드, text-only·`cause:` N줄 | 배열 cause로 렌더러 사용 |

두 가지 의도적 비대칭:

- **#8의 text 분기는 바꾸지 않는다.** `tests/rules.test.mjs:308`이 `logs[1]`을
  `usage: harness-team rules promote …`로 고정한다. 사용법 오류는 escalation이 아니라 usage이고,
  여기에 `alternatives:`/`default:`를 붙이면 소음이다. JSON 분기만 5키로 맞춘다.
- **#9에 `--json`을 새로 달지 않는다.** `done`의 JSON 미지원은 ③ 이전부터 있던 갭이라 범위 밖이다.

### 필드 내용 정책

- `alternatives` — 정당한 **다른 행동** + 트레이드오프 한 절.
  예: `"--force로 가드를 무시하고 종결 — 사유를 artifact.md에 남길 것"`. 정말 없으면 `[]`.
- `safe_default` — **아무 응답도 오지 않았을 때 남는 상태**.
  예: `"task는 활성으로 남고 파일은 하나도 바뀌지 않는다"`. 항상 비어 있지 않다.

`safe_retry`가 이미 "권장안"을 담으므로 PDF의 "the recommended option"은 신설하지 않는다.
PDF의 "cost of waiting"은 CLI 거부에서는 언제나 "없음 — 파일 무변경"이라 엔벨로프에서는 YAGNI다
(사람용 §5-A 패킷에는 포함한다 — 거기서는 기다림에 실제 비용이 있다).

### 사람용 §5-A

`templates/CLAUDE.md.hbs`의 §5-A "1줄 권유"를 PDF 5항목 패킷으로 교체한다. 저장소 `CLAUDE.md`의
`harness:section="workflow"` 구획은 템플릿 렌더 결과와 바이트 동일해야 하므로 같이 갱신한다 —
이 불변식은 `tests/agent-files.test.mjs`의 드리프트 테스트가 고정한다(바이트 수는 적지 않는다.
문서에 박은 수치는 다음 변경에서 곧바로 낡는다).

### 문서 표면

- `docs/harness-overview.template.html:379,394` → `npm run docs:generate`.
  생성기는 `docs/harness-overview.html` 하나만 쓴다 — `docs/harness-overview-<version>.html`
  스냅샷은 동결본이라 건드리지 않는다.
- `skills/harness-team/SKILL.md:51` — 3키를 열거하는 유일한 문서 표면.
- `CHANGELOG.md` `[Unreleased]`.
- `README.md:342`·`commands/harness-observe.md:20`은 "envelope"만 부르고 키를 열거하지 않는다 → 무변경.

## Ontology

- **escalation packet**: 자동 실행을 멈추고 사람(또는 상위 에이전트)에게 결정을 넘길 때 함께
  보내는 구조화된 정보 묶음. 하네스에는 두 형태가 있다 — 기계용(엔벨로프 `error` 객체)과
  사람용(`CLAUDE.md` §5-A 복잡도 게이트). 둘 다 PDF의 5항목 **구조**를 따르지만 같은 항목 집합은
  아니다 — 기계용은 PDF의 "cost of waiting" 자리에 `stop_condition`을 두고(CLI 거부에서 기다림의
  비용은 언제나 "없음"이다), 사람용은 기다림의 비용을 담되 stop 항목이 없다. `alternatives`의
  의미도 두 형태가 다르다(바로 아래 항목).
- **`alternatives`**: 실패한 경로 대신 **취할 수 있는 다른 행동**과 그 트레이드오프.
  "무엇을 시도했는가"의 기록이 아니라 "지금 무엇을 대신 할 수 있는가"의 목록이다 —
  기계용에서는 시도 이력이 존재하지 않기 때문이다(위 "PDF 문구에서 벗어난 지점" 참조).
  사람용 §5-A의 같은 이름 항목은 PDF 원문대로 세션 안에서 검토·기각한 경로를 뜻한다.
- **`safe_default`**: 사람이 응답하지 않을 때 **시스템이 남아 있게 되는 상태**.
  자동 실행할 행동이 아니라 무행동의 결과다 — 하네스는 응답 없이 진행하지 않는다.
- **생산자(producer)**: 엔벨로프 `error` 또는 그 text 미러를 만드는 코드 지점. 9곳.
- **pass-through 유지**: `buildEnvelope`가 `error`의 모양을 검사·정규화하지 않는 성질.
  필드 강제는 `buildErrorPacket`이 전담한다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 엔벨로프 `error`에 `alternatives`·`safe_default`를 항상 존재하는
      필드로 더하고, 생산자 9곳을 공용 헬퍼로 통일하며, §5-A를 PDF 5항목 패킷으로 교체한다.
- [x] **Constraint 명확도** (30%) — additive(스키마 v1 유지) · 기존 3키 소비자 무파괴 ·
      `buildEnvelope` pass-through 유지 · D4 단일 스레드 · 이름을 부르는 문서 표면 동시 갱신.
- [x] **Success 기준** (30%) — `npm test` green(기존 580 유지 + 신규) · `npm run docs:check` 최신 ·
      grep pin(`src/commands/*.mjs`에 리터럴 `root_cause:` 없음) · codex 리뷰 + shipcheck 통과.
- [x] **Context 명확도** (brownfield) — 영향 받는 생산자 9곳과 문서 표면을 위 표·문서 표면 절에
      경로·행 번호로 확정했다(기준 커밋 `a0266b2`). 실제로 바뀐 테스트 파일 목록은 트리가 정본이다.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

게이트 통과 근거: 위 Ontology가 `alternatives`(취할 수 있는 다른 행동 ≠ 시도 이력)와
`safe_default`(무행동의 결과 ≠ 자동 실행할 행동)의 의미를 고정했고, `buildEnvelope`
pass-through 유지가 "항상 존재"의 강제 지점을 헬퍼 하나로 확정했다.

## Done evidence

```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고

- 근거: `.claude/handoffs/2026-09-05-1330-harness-pdf-6layer-comparison.evidence.md:44` (#16 escalation packet)
- 원본: `~/Downloads/harness_final.pdf` §V.A "Escalation Is Not Failure" (poppler 없음 → `pypdf`)
- 계약 고정 테스트: `tests/observation.test.mjs:16-22` (deepEqual 3키) ·
  `tests/observation-commands.test.mjs:54,68,99,131` · `tests/rules.test.mjs:288,449,308` ·
  `tests/observe.test.mjs:265`
- 헬퍼 마이그레이션의 본보기: `src/commands/release.mjs:452-496` (`ERROR_ADVICE` 표)
- 같은 경로로 끝낸 직전 task: `docs/hslee/retro-rules-promotion/retro-rules-promotion-{spec,plan,artifact}.md`
