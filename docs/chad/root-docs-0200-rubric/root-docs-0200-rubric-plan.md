# root-docs-0200-rubric — Plan

## 목표

0.20.0 기준 루트 문서 정합화 + 루브릭 평가 가이드 HTML 신규 + 하네스 컨셉 완성도 리뷰 보고.

## 단계
- [x] README.md 갱신 — D6 반영(설계 스코프·명령어 레퍼런스), Done evidence/verify 게이트 소개,
      문서(HTML) 표 확충, "변경 이력" CHANGELOG 포인터화, frontmatter modified
- [x] MAINTAINING.md 갱신 — 필수 검증 `npm test` 정정, verify kind allowlist 동기화 표면 추가
- [x] docs/prerequisites.md — 옛 리뷰 커맨드 이름을 0.19.0 재편 이후 이름으로 정정
- [x] docs/harness-rubric-guide.html 신규 — D6 루브릭 평가 가이드 (자립형 inline SVG,
      기존 가이드 디자인 토큰) — 브라우저 렌더 검증(SVG 2점, 오버플로 1건 수정)
- [x] docs/index.html Guides에 rubric guide 등재 + README 문서 표 연결
- [x] CHANGELOG.md [Unreleased]에 문서 갱신 기록
- [x] 문서 pin 테스트 실행 (documentation-inventory-pointers·prerequisites-doc·
      what-changes·agent-files) — 32 pass 0 fail + `docs:check` 최신
- [x] 하네스 컨셉 완성도 리뷰 — 사용자 보고 + artifact 요약 기록
- [x] 다이어그램(옵트인) — 미실행(비대화 자율 세션이라 옵트인 질문 불가, 기본값 "아니오" 적용;
      루브릭 가이드 HTML 자체가 inline SVG 다이어그램을 포함)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- spec의 "설계 / 접근" — 문구 pin 테스트 목록
