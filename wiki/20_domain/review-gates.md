# 검토 지점 R1–R3

## 현재 모양

- **R2(시나리오 ↔ 증거 대조)**는 옵트인이다. spec `## Done evidence` JSON의 `scenarios`(Given/When/Then + 증거 `test`·`cmd`)로 선언하고 4행으로 판정한다.
  1행(증거 연결)은 선언 파서, 2행(증거 명령 exit 0)은 `harness-team scenario check`, 3·4행(증거가 Then을 검증하는가 · spec 밖 동작 없음)은
  `harness-team review <engine> --framing scenario` 루브릭이다. 시나리오를 선언한 task에서 `verify: required`는 `-scenario` kind만 센다.
- R2의 주 사용처는 선택형 기본 루프의 QA다 — [default-loop](default-loop.md).

<!-- harness:wiki task=chad/r2-scenario-evidence pr=133 commit=a9c3859 author=chad at=2026-10-07 -->
### R2 시나리오 ↔ 증거 대조 도입 (#133)

- **결정**
  - 문제: "테스트가 있다"와 "테스트가 수용 기준을 증명한다"를 가를 형식이 없었다. Done evidence `tests` 키는 테스트 파일 변경만 본다.
  - 시나리오 표는 마크다운 표가 아니라 Done evidence 안의 JSON 배열이다 — 증거 `cmd`가 `|`를 흔히 담고, 기존 JSON 선언과 파서를 공유한다.
  - 1행은 파서가 판정해 `scenario check`와 `done`이 같은 판정을 공유한다. `done`은 증거 명령을 실행하지 않는다(종결 가드는 결정론·무부작용).
  - 러너(Cucumber 등)는 스택별이라 코드에 넣지 않는다(D11). 하네스는 형식과 대조만 한다.
  - 기각: `tests` 키 흡수(기본 ON 가드가 사라지거나 시나리오 강제), 별도 `## Scenarios` 절(조용한 무시), 루브릭의 shipcheck 흡수(시점이 다름).
  - 신뢰 경계: `cmd`는 `/bin/sh -c`로 실행된다 — `gates.json`·npm scripts와 같은 수준. 검토하지 않은 브랜치의 spec에는 돌리지 않는다.
- **바뀐 모듈** — `harness-team scenario check`(신규), `review --framing scenario`(kind `<engine>-scenario`, 루브릭 E1·E2), `done` 가드의 시나리오 선언 검사, spec 템플릿 Done evidence 주석.
- **학습**
  - exit 0도 요약 개수도 2행의 증거가 아니다. `node --test --test-name-pattern`은 0건 매치에도 exit 0이고 `ℹ pass 1`을 찍는다. 증거는 테스트 이름이 찍힌 줄이다.
  - read-only 검증자는 테스트를 돌리지 못한다. 루브릭 전에 시나리오별 이름 찍힌 실행 출력을 artifact에 남겨야 E1이 판정 가능하다.
  - 부분 `includes` 대조는 문장 삭제를 놓친다. 문서에서 기대값을 독립적으로 만들어 전체를 대조한다 — R2 루브릭이 자기 task에서 처음 잡았다.
