// 관리 절의 "마지막 렌더 결과" 해시 저장소.
//
// D8의 provenance refresh는 **출하 sha 테이블**로 판정한다(migrate.mjs). 관리 절에는 그 테이블을
// 만들 수 없다 — 렌더 결과가 프로젝트마다 다르기 때문이다(stack은 감지 결과, roles는 사용자명).
// 그래서 판정 근거를 설치 측에 둔다. 목적은 D8과 같고 소재지만 출하 측 → 설치 측으로 옮긴 것이다.
//
// 이 파일은 **커밋 대상**이다. .gitignore가 `.harness/`를 통째로 무시하면 팀원이 clone한 뒤
// 첫 init마다 부트스트랩 판정(= stock 간주 = 1회 덮어쓰기)이 다시 일어난다.
import { join } from 'node:path';
import { rename, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readTextSafe, writeText } from './fsx.mjs';
import { extractSections } from './merge.mjs';

export const RENDER_STATE_REL = '.harness/render-state.json';

const EMPTY = () => ({ version: 1, sections: {} });

// 마커를 포함한 블록 전체를 해싱한다 — mergeMarkdown이 교체하는 단위가 바로 그 블록이다.
export function sectionHashes(markdown) {
  const out = {};
  for (const [name, block] of Object.entries(extractSections(markdown ?? ''))) {
    out[name] = createHash('sha256').update(block).digest('hex');
  }
  return out;
}

export async function loadRenderState(targetDir) {
  const raw = await readTextSafe(join(targetDir, RENDER_STATE_REL));
  if (!raw) return EMPTY();
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || typeof data.sections !== 'object' || data.sections === null) return EMPTY();
    return { version: data.version ?? 1, sections: data.sections };
  } catch { return EMPTY(); }
}

// 원자적으로 쓴다. 중간에 끊기면 깨진 JSON이 남고, loadRenderState는 그것을 빈 부트스트랩
// 상태로 읽어 다음 init이 관리 절을 덮는다 — 실패 모드가 "보호 해제"라 조용하고 위험하다
// (codex 리뷰 P2). 임시 파일에 쓴 뒤 rename으로 갈아끼운다(같은 디렉터리라 원자적이다).
export async function saveRenderState(targetDir, state) {
  const path = join(targetDir, RENDER_STATE_REL);
  const tmp = `${path}.${process.pid}.tmp`;
  await writeText(tmp, JSON.stringify(state, null, 2) + '\n');
  try {
    await rename(tmp, path);
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}
