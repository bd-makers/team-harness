# wiki-fence-nested — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: `harness-team wiki sources`의 이미-컴파일 검색(`wikiMarkersIn`)이 인용문(`>`)·목록 들여쓰기 안의 펜스 블록
  (```` ``` ```` / `~~~`)을 펜스로 인식하지 못한다. 그 안의 **예시** `<!-- harness:wiki … task=… -->` 마커를 실제 마커로 세어
  task를 `compiled`로 보고한다(C1 `wiki-compile` R3 후속 P2-b — `docs/chad/wiki-compile/wiki-compile-artifact.md` `## Reviews`).
- **영향**: `/harness-wiki` 컴파일. 결과는 "이미 컴파일됨"으로 멈추는 fail-closed지만, 작성 규칙 문서(`wiki/90_system/`)가
  예시를 그런 형식으로 쓰면 그 task는 영영 컴파일되지 않는다.
- **기대 결과**: 인용문 접두(`>` 반복·공백)와 목록 항목 안의 펜스 열기/닫기를 인식해 그 안의 마커를 세지 않는다.
  펜스 밖 실제 마커(인용문 안 포함)는 여전히 센다.
- **제약**: `src/commands/wiki.mjs`의 펜스 판정만 고친다. CommonMark 전체 구현은 하지 않는다. 기존 wiki 테스트 전부 통과.

## 원천 검토 (R1)
### 원천
- `docs/chad/wiki-compile/wiki-compile-artifact.md` `## Reviews` R3 판별(후속 P2-b) · 오케스트레이터 브리프
### 발견
- 없음 — 원천이 리뷰 지적 하나라 충돌이 없다.
- 검토 완료: 2026-10-07

## 설계 / 접근
줄 단위 상태 기계를 그대로 두고 컨테이너 접두만 벗긴다.
- 줄마다 인용 접두 `^(?: {0,3}> ?)*`를 벗기고 `>` 개수를 **인용 깊이**로 센다.
- 펜스 밖에서는 목록 표지(`[-*+]` · `\d{1,9}[.)]` + 공백)를 같은 너비의 공백으로 바꾸고, 가장 최근 목록 항목의 **내용 열**을 기억한다.
  여는 펜스는 그 내용 열에서 3칸 이내 들여쓰기만 인정한다(맨 위 4칸 들여쓰기는 들여쓴 코드).
- 닫는 펜스: 같은 문자 · 길이 ≥ 여는 펜스 · 정보 문자열 없음(기존) + 같은 인용 깊이 + 들여쓰기 ≤ 여는 펜스 + 3.
- 인용 깊이가 여는 펜스보다 얕아지면 펜스가 끝난다 — 그 줄은 펜스 밖 줄로 다시 판정한다.
- **오류 방향**: 펜스를 너무 많이 인정하면 닫히지 않은 펜스가 뒤의 실제 마커를 삼켜 같은 task를 **다시 컴파일**(단락 중복)한다.
  지금의 fail-closed보다 나쁘므로 여는 쪽 조건을 보수적으로 둔다.
- 범위 밖(의도적): 목록 항목이 내어쓰기로 끝날 때 닫히지 않은 펜스를 닫는 것, 지연 연속 줄, 탭 열 계산, P3(공백만 있는 줄).

## Ontology
- **예시 마커**: 펜스 코드 블록(어느 컨테이너 안이든) 안에 있는 `harness:wiki` 마커 — 컴파일 흔적이 아니다.
- **컨테이너 접두**: 인용 `>` 표지와 목록 항목 표지. 펜스 판정 전에 벗겨 펜스의 열을 그 컨테이너 기준으로 본다.
- 게이트 근거: 결함·재현·수정 위치·성공 기준이 리뷰 지적과 테스트로 모두 고정됨(작은 버그 — 인터뷰 생략).

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 인용문·목록 안 펜스의 예시 마커를 `compiled`로 세지 않는다.
- [x] **Constraint 명확도** (30%) — `wikiMarkersIn` 펜스 판정만, CommonMark 전체 구현 금지, 의존성 추가 없음.
- [x] **Success 기준** (30%) — Done evidence S1·S2 + 기존 wiki 테스트·`npm test` 전체 통과.
- [x] **Context 명확도** (brownfield 한정) — `src/commands/wiki.mjs` `wikiMarkersIn`, `tests/wiki.test.mjs`.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{
  "version": 1,
  "review": "required",
  "scenarios": [
    {
      "id": "S1",
      "given": "wiki/90_system/rules.md가 인용문(`> ```markdown`) 안 펜스와 중첩 목록 항목(4칸) 안 `~~~` 펜스로 task chad/x의 마커를 예시하고, 다른 곳에는 그 task 마커가 없다",
      "when": "wiki sources chad/x 를 실행한다",
      "then": "compiled가 비어 있다. 이어서 wiki/20_domain/feature.md에 펜스 밖 실제 마커를 쓰면 compiled가 ['wiki/20_domain/feature.md']다",
      "test": "wiki sources: fenced examples inside blockquotes and list items are not compiled markers",
      "cmd": "node --test --test-name-pattern=\"inside blockquotes and list items\" tests/wiki.test.mjs"
    },
    {
      "id": "S2",
      "given": "닫히지 않은 인용문 안 펜스 뒤의 실제 마커 · 맨 위 4칸 들여쓴 백틱 뒤의 실제 마커 · 목록 항목 안 펜스의 빈 줄 뒤에 닫힌 펜스와 그 뒤 실제 마커가 있다",
      "when": "wikiMarkersIn 으로 마커를 센다",
      "then": "세 경우 모두 펜스 뒤의 실제 마커(a/c)만 세고, 기존 동작(4개 백틱 중첩·맨 위 펜스 안 4칸 들여쓴 백틱은 닫지 않음)이 유지된다",
      "test": "wiki sources: fenced examples inside blockquotes and list items are not compiled markers",
      "cmd": "node --test --test-name-pattern=\"(inside blockquotes and list items|ignoring fenced examples)\" tests/wiki.test.mjs"
    }
  ]
}
```

## 참고
- 결함 원문: `docs/chad/wiki-compile/wiki-compile-artifact.md` `## Reviews` (codex R3, 2026-10-07T06:21) — P2 `wiki.mjs:53`
- 코드: `src/commands/wiki.mjs` `wikiMarkersIn` · 테스트: `tests/wiki.test.mjs`
