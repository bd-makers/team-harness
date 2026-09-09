import { basename, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { resolveStack, KNOWN_STACK_IDS } from '../detect-stack.mjs';
import {
  planChanges, applyChanges, copyStaticAssets, formatDiff,
  loadBackupDir, saveBackupConfig, DEFAULT_BACKUP_PARENT, AI_GITIGNORE_PREVIEW,
  cloudSyncPathWarning,
} from '../harness.mjs';
import { saveRenderState } from '../render-state.mjs';
import { confirm, ask } from '../prompt.mjs';
import { ensureUsername } from '../user-config.mjs';
import { installPostCommitHook } from '../git-hooks.mjs';

export async function runInit(ctx) {
  console.log(`harness-team init → ${ctx.targetDir}`);
  const forced = ctx.flags.stack;
  if (forced !== undefined && !KNOWN_STACK_IDS.includes(forced)) {
    // A typo used to pass straight through as the stack id and render an AGENTS.md
    // naming a stack nothing recognizes. Refuse before anything is written.
    console.error(`init: unknown --stack "${forced}" (expected one of ${KNOWN_STACK_IDS.join('|')})`);
    process.exitCode = 2;
    return;
  }
  const stack = await resolveStack(ctx.targetDir, forced);
  // copyStaticAssets gates the RN-only rules on this, not just on an explicit --stack.
  ctx.stackId = stack.id;
  console.log(`  stack: ${stack.stackLabel} (${stack.id})`);

  await ensureUsername(ctx.targetDir, ctx.flags);

  // Resolve the sibling backup directory: ../<parent>/<projectName>.
  // The 3 scripts (clone.sh, symlink.sh, delete.sh) are written INTO the project
  // root with BACKUP_DIR embedded at generation time, so running `./clone.sh`
  // from the project root syncs CWD into that backup clone directory.
  const projectName = basename(ctx.targetDir);
  let saveConfig = null;

  if (ctx.flags['no-backup']) {
    ctx.backupDir = null;
    console.log('  backup: disabled');
  } else {
    let backupDir = await loadBackupDir(ctx.targetDir);
    if (!backupDir) {
      const dirFromFlag = ctx.flags['backup-dir'];
      const parentFromFlag = ctx.flags['backup-parent'];
      if (dirFromFlag) {
        backupDir = resolve(dirFromFlag.replace(/^~/, process.env.HOME || '~'));
        saveConfig = { dir: backupDir };
      } else {
        const answered = ctx.flags.yes
          ? (parentFromFlag || DEFAULT_BACKUP_PARENT)
          : await ask(
              `\nBackup clone parent folder (sibling of project, holds clone.sh/symlink.sh/delete.sh)?`,
              { defaultValue: parentFromFlag || DEFAULT_BACKUP_PARENT },
            );
        backupDir = resolve(ctx.targetDir, '..', answered, projectName);
        saveConfig = { parent: answered, name: projectName };
      }
    }
    ctx.backupDir = backupDir;
    console.log(`  backup clone dir: ${backupDir}`);
    const cloudWarn = cloudSyncPathWarning(ctx.targetDir) || cloudSyncPathWarning(backupDir);
    if (cloudWarn) console.log(`  ⚠️ ${cloudWarn}`);
  }

  // Ask whether to add AI-tool gitignore entries.
  if (ctx.flags['gitignore-ai'] !== undefined) {
    ctx.addAiGitignore = ctx.flags['gitignore-ai'] === true || ctx.flags['gitignore-ai'] === 'true';
  } else if (!ctx.flags.yes) {
    console.log(`\nAI tool .gitignore entries to add:\n`);
    console.log(AI_GITIGNORE_PREVIEW.split('\n').map(l => `  ${l}`).join('\n'));
    ctx.addAiGitignore = await confirm('\nAdd these AI tool entries to .gitignore?', { defaultYes: false });
  } else {
    ctx.addAiGitignore = false;
  }

  const { changes, legacyAgentFiles, brokenMarkerFiles, skippedSections, renderState } = await planChanges(ctx, { stack });

  if (legacyAgentFiles && legacyAgentFiles.length) {
    console.log(`\n⚠️ 레거시 alias symlink 감지: ${legacyAgentFiles.join(', ')} → CLAUDE.md`);
    console.log(`   이 파일들은 건너뜁니다(CLAUDE.md 오염 방지). 신구조 전환: harness-team migrate`);
  }
  for (const broken of brokenMarkerFiles || []) {
    console.log(`\n⚠️ ${broken.file}: ${broken.message}`);
    console.log(`   이 파일은 건너뜁니다 — 마커가 한쪽만 남은 채 병합하면 다음 실행에서 사용자 텍스트가 지워집니다.`);
  }

  if (changes.length === 0) {
    console.log('  (no changes needed for text/JSON files)');
  } else {
    console.log(formatDiff(changes));
  }

  // 관리 절의 사용자 편집은 지우지 않는다 — 그 절만 건너뛰고 무엇이 반영되지 않았는지 보여준다.
  // `--yes`에서도 이 경고와 건너뛰기는 그대로다(프롬프트만 생략). 종료 코드는 바꾸지 않는다.
  if (skippedSections && skippedSections.length) {
    console.log('\n⚠️  관리 절에 사용자 편집이 있어 건너뜁니다 (사용자 텍스트를 지우지 않습니다):');
    for (const { file, section, diff } of skippedSections) {
      console.log(`  - ${file} → harness:section="${section}"`);
      console.log(diff.split('\n').map(l => `      ${l}`).join('\n'));
    }
    console.log('  → 템플릿 변경을 반영하려면 위 diff를 보고 직접 옮긴 뒤 다시 실행하세요.');
  }

  const ok = ctx.flags.yes || await confirm('\nApply these changes + scaffold the rest?', { defaultYes: true });
  // 거절하면 아무것도 쓰지 않았으므로 렌더 상태도 저장하지 않는다 — 저장하면 다음 실행이
  // 쓰지도 않은 내용을 "우리 렌더"로 믿는다.
  if (!ok) { console.log('Aborted.'); return; }

  if (ctx.backupDir) await mkdir(ctx.backupDir, { recursive: true });
  await applyChanges(changes);
  await saveRenderState(ctx.targetDir, renderState);
  if (saveConfig) await saveBackupConfig(ctx.targetDir, saveConfig);
  const copied = await copyStaticAssets(ctx);
  await installPostCommitHook(ctx.targetDir);

  console.log(`\n✓ Wrote ${changes.length} merged file(s)`);
  if (ctx.backupDir) {
    console.log(`✓ Backup clone dir ready: ${ctx.backupDir}`);
    console.log(`\nDone. From the project root, run the backup scripts:`);
    console.log(`  ./clone.sh   # sync this project into the backup dir`);
    console.log(`  ./symlink.sh # create backup → project symlinks`);
    console.log(`  ./delete.sh  # tear down symlinks`);
  }
  console.log(`✓ Copied ${copied.filter(c => c.action === 'write').length} asset(s) (${copied.filter(c => c.action === 'skip').length} skipped as existing)`);
  console.log(`✓ Agent files: AGENTS.md (core) + CLAUDE.md (@AGENTS.md import)`);
}
