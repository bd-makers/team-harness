# review-restructure — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

리뷰 커맨드 표면을 엔진 중립으로 재편했다 (2026-08-21):

- **신규**: `commands/harness-review.md`·`commands/harness-adversarial-review.md` + 동명 Codex wrapper
  스킬. 엔진(codex·claude·gemini·custom)은 첫 위치 인자, 생략 시 probe 폴백 체인
  codex → gemini → claude. 절차는 base 커맨드가 1회 소유, adversarial은 프롬프트만 교체(현행 상속 패턴 유지).
- **claude 엔진 실측 핀**: `claude -p --permission-mode plan` — 인증 상속 OK(AUTH_OK 응답),
  쓰기 차단 OK(plan 모드에서 파일 미생성 확인), read-only git 실행 OK. harness-sim의
  "nested claude -p 인증 미상속" 기록은 이 경로(부모 Bash에서 직접 spawn)에는 해당하지 않았다 —
  그 기록은 sim 스크립트가 clean env로 spawn하는 경우다.
- **custom 엔진**: `.harness/reviewers.json`의 `{"custom": {"command": "... {prompt} ..."}}` 치환.
  미설정 시 실패 없이 스키마 안내 후 종료.
- **deprecated**: 구명 커맨드 2개·스킬 2개는 엔진 `codex` 포워딩 문서로 교체, plugin.json 등재 유지,
  1개 마이너 버전 후 제거 예정.
- **부수**: `commands/harness-task.md`의 구명 참조 1곳 갱신, CHANGELOG(Added/Deprecated),
  `docs/harness-overview.html` 재생성. templates(AGENTS.md.hbs)는 커맨드명을 언급하지 않아 무변경.
- **검증**: `npm run test` 301 pass / 0 fail (manifest-sync가 커맨드⟺plugin.json 양방향,
  스킬-커맨드 참조, 스킬 frontmatter 규격을 커버).

남은 후속(릴리스 후, 이 task 범위 밖): 전역 CLAUDE.md 2대(회사 chadonpro·집 hsonpro)와
메모리(codex-review-invocation)의 구명 참조를 새 이름으로 갱신, 다음 마이너에서 alias 제거.

PR: https://github.com/bd-makers/team-harness/pull/35 (2026-08-22 open, base: main)


## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-21 — Codex 통상 리뷰 (엔진: codex, 새 `/harness-review` 절차 셀프 드라이브)

- **실행**: `codex exec --sandbox read-only` (gpt-5.6-terra), scope: working tree 전체.
  probe 체인 없이 엔진 명시 호출. **Gemini 병렬 리뷰 미실행 — `gemini` CLI 이 머신 미설치.**
- **발견 및 판별** (4건 모두 검증 후 진짜 결함으로 확정, 전부 조치 완료):
  - P1 `docs/harness-overview.html` — 생성기가 `git ls-files` 기반이라 untracked 신규 커맨드/스킬
    4파일이 source-tree에서 누락, 커밋 후 `docs:check` CI 실패 예정.
    → 조치: 신규 파일 `git add` 후 overview 재생성, `docs:check` 통과 확인.
  - P2 `README.md:87,90,109` — 슬래시 커맨드 개수 22개 표기가 24개와 불일치.
    → 조치: 3곳 24개로 갱신.
  - P2 `commands/harness-review.md` 엔진 결정 — `custom`에 `command -v <cli>` preflight가
    적용 불가(설정을 읽기 전엔 CLI를 모름)한 모순.
    → 조치: custom preflight를 "reviewers.json 로드 + `custom.command` 키 확인 + 템플릿 첫 토큰
    `command -v`"로 명시 분리.
  - P2 `commands/harness-review.md` custom 절 — `{prompt}` 치환에 인용 계약이 없어 focus의
    셸 문법이 명령으로 해석될 수 있는 read-only 경계 훼손 위험.
    → 조치: "POSIX 단일 인용 리터럴 치환(내부 `'`는 `'\''`)" 계약을 명문화.
- **평결**: Request changes → 4건 조치 후 `npm run test` 301 pass / 0 fail, `docs:check` 최신 재확인.


## Learnings

