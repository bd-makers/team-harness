// task 문서 경로의 유일한 조립 지점. 다른 모듈은 `'docs'` 와 user·task 로 task 경로를 만들지 않는다.
//
// 같은 `docs/<user>/<task>` 가 13파일 약 60줄에 따로 조립돼 있었고, 경로 규칙을 바꾸려면 그 전부를 같이 고쳐야
// 했다 — 모노레포 area 논의에서 드러난 근본 원인이다(docs/spec-monorepo-scope.md §2).
//
// 두 계열을 섞지 않는다. 기존 호출부가 쓰던 구분을 그대로 옮긴 것이라 어느 OS 에서도 이전과 같은 문자열이 나온다.
// - `*Rel`  : POSIX('/') 문자열. git pathspec·stdout·active.json·다른 파일 본문에 그대로 실린다.
// - `*Path` : targetDir 기준 경로. `join` 으로 만든다(OS 구분자) — 파일 I/O 용.
// 예외: `userIndexRel`·`metaRel`·`SUMMARY_REL` 은 원래 `join` 으로 만든 rel 이라 그 의미를 유지한다 —
// migrate 가 `metaRel` 을 그대로 출력하므로 POSIX 로 바꾸면 Windows 출력이 달라진다.
//
// 옮기지 않은 것: 0.6 이전 `docs/<u>/{feature,fix}/<n>` 처럼 **옛 구조를 서술하는** migrate 코드, 그리고 소비자에
// 복사돼 src 를 import 할 수 없는 훅 템플릿 `templates/.claude/hooks/observe-tools.mjs` 의 task 식별자.
import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { exists } from './fsx.mjs';

export const DOCS_DIR = 'docs';

export const taskDirRel = (user, task) => `${DOCS_DIR}/${user}/${task}`;
// kind: 'spec.md' | 'plan.md' | 'handoff.md' | 'artifact.md' | 'context.md' | 'meta.json' | 'diagram.html'
export const taskFileRel = (user, task, kind) => `${taskDirRel(user, task)}/${task}-${kind}`;
export const userHandoffRel = (user) => `${DOCS_DIR}/${user}/${user}-handoff.md`;

// 출력·원장 키·규칙 유래 마커가 쓰는 task 식별자. user/task 모두 ^[\w.-]+$ 라 `/` 가 들어갈 수 없어 모호하지 않다.
export const taskLabel = (user, task) => `${user}/${task}`;

export const docsPath = (targetDir) => join(targetDir, DOCS_DIR);
export const taskDirPath = (targetDir, user, task) => join(targetDir, DOCS_DIR, user, task);
export const taskFilePath = (targetDir, user, task, kind) => join(targetDir, DOCS_DIR, user, task, `${task}-${kind}`);
export const userHandoffPath = (targetDir, user) => join(targetDir, DOCS_DIR, user, `${user}-handoff.md`);

export const SUMMARY_REL = join(DOCS_DIR, 'task_summary.md');
export const userIndexRel = (user) => join(DOCS_DIR, user, `${user}-task.md`);
export const metaRel = (user, task) => join(DOCS_DIR, user, task, `${task}-meta.json`);

// task = `<task>-spec.md` 마커를 가진 `docs/<user>/<task>/`. `list`·`summary`·SessionStart 재개 후보가 공유하는
// 판정이다 — docs/superpowers/{plans,specs} 처럼 user/task 가 아닌 디렉터리는 마커가 없어 빠진다.
// readdir 순서 그대로 돌려준다(정렬은 호출자 몫). docs/ 존재 확인은 **호출자** 몫이다 — 호출자마다 없을 때의
// 답이 다르고('(no docs/)' 출력 vs 빈 목록), 여기서 다시 확인하면 확인 뒤 사라진 docs/ 의 readdir 오류를
// 빈 목록으로 삼켜 리팩터 전과 달라진다(codex 리뷰 P3).
// observe(meta.json 판정)·readLedger(1단)·migrate 레거시 스캐너는 규칙이 달라 이 함수를 쓰지 않는다.
export async function listTaskRefs(targetDir) {
  const docs = docsPath(targetDir);
  const refs = [];
  for (const userEntry of await readdir(docs, { withFileTypes: true })) {
    if (!userEntry.isDirectory()) continue;
    const user = userEntry.name;
    for (const taskEntry of await readdir(join(docs, user), { withFileTypes: true })) {
      if (!taskEntry.isDirectory()) continue;
      const task = taskEntry.name;
      if (!(await exists(taskFilePath(targetDir, user, task, 'spec.md')))) continue;
      refs.push({ user, task });
    }
  }
  return refs;
}
