# raw-stubs — 변환 전 원본 (실행 대상 아님)

team-onboarding-kit 검증에 쓴 DOM 스텁 원본이다. `/tmp`에만 있어 휘발 위험이 있었으므로
2026-09-13에 여기로 옮겨 보존했다. **`tests/`가 아니므로 `npm test`가 실행하지 않는다.**

`docs-html-stub-tests` task가 이 3종을 `node:test` 기반 `tests/*.test.mjs`로 변환한 뒤
이 디렉터리를 통째로 지운다 — plan의 마지막 단계다.

원본은 `/tmp/pg.js` · `/tmp/ob.js` · `/tmp/dk.js`(HTML에서 추출한 inline script)를
하드코딩해 읽는다. 변환 후에는 HTML에서 직접 추출하므로 이 의존이 사라진다.
