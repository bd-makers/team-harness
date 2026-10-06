// `harness-team scenario check` — R2 기계 2행(harness-cycle §4-1b). spec `## Done evidence`의
// `scenarios` 선언을 읽어 (1) 모든 시나리오에 증거가 연결됐는지(파서가 판정) (2) 증거 명령이 exit 0인지 본다.
// 출력 계약은 `boundary check`를 따른다 — stdout은 판정 줄, 증거 명령의 출력은 stderr.
//
// exit 0은 필요조건일 뿐이다: 이름 필터가 아무 테스트도 고르지 못해도 러너는 exit 0을 낼 수 있다.
// 러너 출력 형식은 언어별 지식이라 여기서 파싱하지 않고(D11), "증거가 Then을 검증하는가"는
// `harness-team review <engine> --framing scenario` 루브릭이 판정한다.
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { parseDoneEvidenceDeclaration, readActive } from './task.mjs';
import { taskFilePath } from '../task-paths.mjs';

function fail(failures) {
  process.exitCode = 2;
  console.log('scenario: failed');
  for (const f of failures) console.log(`failure: ${f.id} | ${f.code} | ${f.message}`);
  return { status: 'error', failures };
}

function runCommand(targetDir, cmd) {
  const r = spawnSync('/bin/sh', ['-c', cmd], { cwd: targetDir, stdio: ['ignore', 2, 2] });
  return { status: r.status, signal: r.signal };
}

export async function runScenarioCheck(ctx) {
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    return fail([{ id: 'declaration', code: 'no-active-task', message: 'activate a task before running scenario check' }]);
  }
  let spec;
  try {
    spec = await readFile(taskFilePath(ctx.targetDir, active.user, active.task, 'spec.md'), 'utf8');
  } catch (err) {
    return fail([{ id: 'declaration', code: 'unreadable-spec', message: err.code || err.message }]);
  }

  const evidence = parseDoneEvidenceDeclaration(spec);
  if (evidence.status === 'invalid') {
    return fail([{ id: 'declaration', code: 'invalid-declaration', message: `## Done evidence: ${evidence.reason}` }]);
  }
  if (!evidence.scenarios) {
    console.log('scenario: not-configured');
    return { status: 'not-configured' };
  }

  // 같은 명령(예: 전체 테스트 스위트)을 여러 시나리오가 증거로 걸어도 한 번만 실행한다.
  const results = new Map();
  const failures = [];
  for (const s of evidence.scenarios) {
    if (!results.has(s.cmd)) results.set(s.cmd, runCommand(ctx.targetDir, s.cmd));
    const r = results.get(s.cmd);
    const ok = r.status === 0;
    console.log(`${s.id} ${ok ? 'pass' : 'fail'} — Given ${s.given} / When ${s.when} / Then ${s.then} [${s.test}]`);
    if (ok) continue;
    if (r.status === 127) failures.push({ id: s.id, code: 'command-not-found', message: s.cmd });
    else failures.push({ id: s.id, code: 'exit-nonzero', message: `exit ${r.status ?? r.signal}: ${s.cmd}` });
  }
  if (failures.length) return fail(failures);
  console.log(`scenario: pass (${evidence.scenarios.length} checked)`);
  console.log('next: exit 0은 테스트가 실제로 돌았음을 보장하지 않는다 — `harness-team review <engine> --framing scenario`로 증거가 Then을 검증하는지 판정');
  return { status: 'pass', checked: evidence.scenarios.length };
}

export async function runScenario(ctx) {
  if ((ctx.taskArgs || [])[0] === 'check' && (ctx.taskArgs || []).length === 1) return runScenarioCheck(ctx);
  process.exitCode = 2;
  console.log('scenario: invalid-action');
  console.log('usage: harness-team scenario check');
  return { status: 'invalid-action' };
}
