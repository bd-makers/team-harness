---
max_turns: 15
timeout_seconds: 400
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit]
runs: 3
---
지금 활성 task의 spec 초안을 써줘. 소스는 인터뷰만 쓰고 Confluence·Figma는 없어. 인터뷰 답은 아래가 전부고 이걸로 충분하니까, 추가 질문 없이 바로 spec 파일에 초안을 작성해줘.

- 문제: 운영팀이 관리자 주문 목록을 엑셀로 옮기려고 화면을 복사·붙여넣기 하고 있어. 주에 3시간쯤 쓰고, 붙여넣다가 행이 빠지는 실수도 나.
- 목표: 관리자 주문 목록 화면에 "CSV 내보내기" 버튼을 두고, 지금 걸린 필터 그대로의 주문을 CSV 파일로 내려받게 한다.
- 제약: 기존 `GET /admin/orders` 엔드포인트를 그대로 쓰고 새 의존성은 넣지 않는다. 한 번에 최대 10,000행.
- 성공 기준: 필터를 건 뒤 내보낸 CSV의 데이터 행 수가 화면의 총 건수와 같다. 열은 주문번호·주문일·고객명·금액 4개. 엑셀에서 열었을 때 한글이 깨지지 않는다(UTF-8 BOM).
- 영향 파일: `src/admin/OrdersPage.tsx`, `src/admin/api.ts`
- 범위 밖: 다른 화면의 내보내기, xlsx 형식
