# subsystem-audit — Plan

## 목표
하네스 0.52.0을 강의 02의 지시·도구·상태·피드백 기준으로 감사해, 감사표·판정·후보 task를 spec과 artifact에 남긴다(코드 무변경).

## 단계
- [x] task 생성(`harness-team task subsystem-audit --member hslee`)
- [x] 본보기 읽기 — `docs/decisions.md` D11, D12와 정정·Q5 결과
- [x] 강의 원문 확인 — 강의 02(정본)와 03–12·harness-designs, 커밋 `a9342ff` 고정
- [x] 하위 시스템별 장치(`파일:줄`)·빈틈·실사용 근거 매핑(artifact 171개 서브에이전트 수집 + 표본 대조, 소비자 3곳 읽기 대조)
- [x] spec에 감사표·판정·후보 task 기록
- [x] artifact에 판정 요약·후보·측정값·학습 기록
- [x] 검증 — `npm test` fail 0(1,299개 중 pass 1,298), `npm run docs:check` 최신
- [x] 감사 결과 커밋(push·PR 없음) — 로컬 main `e5f2142`(커밋 위치는 메인테이너 선택)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- 후보 착수와 `docs/decisions.md` 기록은 메인테이너 승인 뒤 별도 task.
