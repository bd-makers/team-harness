# release-publish-workflow — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`v*` 태그 push로 GitHub Release가 자동 발행되게 했다 (2026-08-08).

- `.github/workflows/release.yml` — `on: push: tags: ['v*']`, `contents: write`.
  ① 태그 버전 ↔ `package.json` version 정합 → ② `npm test` → ③ CHANGELOG 절 추출 →
  ④ `gh release create`. 앞의 세 단계 중 하나라도 실패하면 Release가 만들어지지 않는다.
- `scripts/changelog-section.mjs` — `extractChangelogSection(changelog, version)` export +
  CLI. 절 범위는 `## [X.Y.Z]` 다음 줄부터 다음 `## ` 직전까지. 버전 문자열은 정규식
  메타문자 전체를 이스케이프한다.
- `tests/changelog-section.test.mjs` — 5건 (본문 격리·누락/빈 절 null·SemVer 빌드
  메타데이터·dot 리터럴 매칭·실제 CHANGELOG가 배포 버전을 담고 있는지).
- `MAINTAINING.md` — 9단계(자동 발행 + 실패 조건 3가지 + 태그 재생성 복구 절차) 추가.

배경: 저장소에 `test.yml` 하나뿐이었고 태그 트리거가 없어, 원격 태그 27개 중 Release는
10개(v0.2.0~v0.6.4, 2026-06-02 수동 소급분)뿐이었다. 절차 문서도 8단계(태그 push)에서
끝나 발행 단계가 아예 없었다.

검증: `npm run test` 218 + perf 1 pass / 0 fail. mutation 4건 전부 fail로 확인
(절 경계 훼손 / dot 이스케이프 제거 / 빈 절 가드 제거 / escapeRegExp 되돌리기).
워크플로우 셸 로직은 로컬에서 양쪽 분기 재현 — 정상(v0.14.0 → 노트 1259B), 불일치(v9.9.9 → exit 1).

미완: 누락된 17개 태그의 소급 발행은 범위 밖(사용자가 자동화만 선택). v0.14.0의 실제
발행은 머지 후 태그 재생성이 필요하며 사용자 승인 대기 중이다.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-08 — Codex (`codex exec --sandbox read-only`, working tree)

P1 0 / P2 2 / P3 1, verdict "request changes". 각 발견을 코드로 검증 후 조치:

| 발견 | 판별 | 조치 |
|---|---|---|
| P2 `v*`는 태그 이름만 거르므로 미검증 커밋의 태그도 발행 가능 — 주석의 "main에서 테스트됨" 주장이 근거 없음 | **진짜 결함** (주장과 강제의 불일치) | 릴리스 잡에서 `npm test`를 직접 실행하고 주석을 사실에 맞게 수정 |
| P2 dot만 이스케이프해 SemVer 빌드 메타데이터(`1.2.3+build.1`)가 매칭 실패 | **진짜 결함** — 재현 확인(`null` 반환) | `escapeRegExp`로 메타문자 전체 이스케이프 + 회귀 테스트 추가 |
| P3 MAINTAINING이 "절이 그대로 들어간다"고 했으나 헤딩 제외·trim 수행 | **유효** | "절 **내용**(헤딩 제외·공백 정리)"으로 문구 정정 |

Gemini 미실행 — `gemini` CLI가 이 머신에 없음.

## Learnings

- **테스트를 짜고 나면 그 테스트가 무엇을 못 잡는지 먼저 확인한다.** dot 와일드카드
  회귀 테스트를 처음엔 반대 방향(`1x2x0`으로 질의)으로 짜서 mutation을 놓쳤다
  (`pass 4 / fail 0`). 위험은 "질의의 dot이 다른 문자에 매칭되는 것"이므로, 샘플에
  `[1x2x0]` 디코이 헤딩을 넣어 실제 오탐이 가능한 구성으로 바꾼 뒤에야 잡혔다.
  통과만 확인했다면 결함이 있는 채로 병합됐을 것이다.
- **CI 안에서만 실행되는 로직은 스크립트로 분리한다.** YAML 인라인 sed/awk는
  `node --test`가 닿지 못해 검증 없이 배포된다 — 이 저장소는 같은 이유로 #16의 404를
  겪었다. 분리해 두면 mutation까지 걸 수 있다.
- **주석은 강제되지 않는 주장을 하지 않는다.** "이미 main에서 테스트된 커밋"이라는
  주석은 워크플로우가 강제하는 사실이 아니었다. 주장을 강제로 바꾸거나(테스트 실행),
  주장을 지우거나 둘 중 하나여야 한다.
