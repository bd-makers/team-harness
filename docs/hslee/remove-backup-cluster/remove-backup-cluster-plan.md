# remove-backup-cluster — Plan

## 목표
D11 기준으로 사이클 밖 장치(백업 클론·AI gitignore 옵션)를 빼고, 메인테이너 전용 명령·스킬을 배포 표면에서 내린다.

## 단계
- [x] 소비자 사용 실측(세 곳 모두 backup.json·백업 폴더 있음, symlink 없음, job-scraper는 AI 파일 gitignore) → 메인테이너 재확인
- [x] 제거·이동 구현(서브에이전트 위임)
- [x] 메인 세션 검증: 전체 테스트, docs:check, grep, 핵심 diff 3곳, 임시 저장소 init·doctor 스모크
- [x] 외부 리뷰(R3) 기록 — codex PASS, P3 1건 반영
- [x] 커밋 · PR (#122)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-05 "백업 클론"(제거)과 "관리 절 백업"(유지) 구분.

## 참고
- 머지 후 종결(`done`·`summary --write`)은 기본 브랜치 몫이다.
