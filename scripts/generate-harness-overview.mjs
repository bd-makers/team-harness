import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const templatePath = 'docs/harness-overview.template.html';
const outputPath = 'docs/harness-overview.html';
const diagramDirectory = 'docs/diagrams/harness-overview';
const sourceTreeEntries = [
  '.claude-plugin',
  '.codex-plugin',
  'bin',
  'commands',
  'scripts',
  'skills',
  'src',
  'templates',
  'tests',
  diagramDirectory,
  templatePath,
];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseFrontmatter(source, sourcePath) {
  if (!source.startsWith('---\n')) throw new Error(`${sourcePath}: frontmatter가 없습니다.`);
  const end = source.indexOf('\n---', 4);
  if (end === -1) throw new Error(`${sourcePath}: frontmatter가 닫히지 않았습니다.`);

  const fields = new Map();
  for (const line of source.slice(4, end).split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1 || /^\s/.test(line)) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    fields.set(key, value);
  }
  return fields;
}

export async function buildCommandRows(root = repositoryRoot) {
  const manifest = JSON.parse(await readFile(join(root, '.claude-plugin/plugin.json'), 'utf8'));
  if (!Array.isArray(manifest.commands)) throw new Error('.claude-plugin/plugin.json: commands 배열이 없습니다.');

  return Promise.all(manifest.commands.map(async (entry) => {
    const sourcePath = entry.replace(/^\.\//, '');
    if (!sourcePath.startsWith('commands/') || !sourcePath.endsWith('.md')) {
      throw new Error(`지원하지 않는 command 경로입니다: ${entry}`);
    }
    const fields = parseFrontmatter(await readFile(join(root, sourcePath), 'utf8'), sourcePath);
    const description = fields.get('description');
    const phase = fields.get('phase');
    if (!description) throw new Error(`${sourcePath}: description이 없습니다.`);
    if (!phase) throw new Error(`${sourcePath}: phase가 없습니다.`);

    return {
      command: `/${basename(sourcePath, '.md')}`,
      sourcePath,
      description,
      phase,
    };
  }));
}

export function renderCommandTable(rows) {
  const body = rows.map((row) => `
          <tr data-command-source="${escapeHtml(row.sourcePath)}">
            <td><span class="cmd">${escapeHtml(row.command)}</span></td>
            <td><code>${escapeHtml(row.sourcePath)}</code></td>
            <td>${escapeHtml(row.description)}</td>
            <td><span class="tag tag-blue" style="font-size:0.72rem;padding:2px 8px;">${escapeHtml(row.phase)}</span></td>
          </tr>`).join('');

  return `<div class="table-wrap">
      <table data-generated="commands">
        <thead><tr><th>명령</th><th>소스 파일</th><th>설명</th><th>Phase</th></tr></thead>
        <tbody>${body}
        </tbody>
      </table>
    </div>`;
}

async function walkFiles(root, entry) {
  const absolutePath = join(root, entry);
  const children = await readdir(absolutePath, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOTDIR') return null;
    throw error;
  });
  if (children === null) return [entry];

  const files = [];
  for (const child of children) {
    const childPath = join(entry, child.name);
    if (child.isDirectory()) files.push(...await walkFiles(root, childPath));
    else if (child.isFile()) files.push(childPath);
  }
  return files;
}

function normalizePath(path) {
  return path.split(sep).join('/');
}

function fileType(path) {
  if (path.endsWith('.mmd')) return 'Mermaid';
  if (path.endsWith('.test.mjs') || path.startsWith('tests/')) return 'Test';
  if (path.startsWith('commands/')) return 'Command';
  if (path.endsWith('/SKILL.md')) return 'Skill';
  if (path.startsWith('templates/')) return 'Template';
  if (path.endsWith('plugin.json') || path.endsWith('marketplace.json')) return 'Manifest';
  if (path.endsWith('.md') || path.endsWith('.html')) return 'Document';
  if (path.endsWith('.json') || path.endsWith('.yaml')) return 'Config';
  if (path.endsWith('.sh')) return 'Script';
  return 'Module';
}

function fileRole(path, commandDescriptions) {
  if (commandDescriptions.has(path)) return commandDescriptions.get(path);
  if (path === 'bin/harness-team.mjs') return 'CLI 진입점과 command router';
  if (path.startsWith('src/commands/')) return `harness-team ${basename(path, '.mjs')} CLI 구현`;
  if (path.startsWith('src/')) return 'CLI가 공유하는 핵심 모듈';
  if (path.startsWith('templates/.claude/hooks/')) return '소비자 프로젝트에 설치되는 Claude Code hook';
  if (path.startsWith('templates/.claude/rules/')) return '소비자 프로젝트에 설치되는 코딩 규칙';
  if (path.startsWith('templates/.claude/skills/')) return '소비자 프로젝트에 설치되는 workflow skill';
  if (path.startsWith('templates/')) return '소비자 프로젝트 scaffold 템플릿';
  if (path.endsWith('/SKILL.md')) return 'Codex용 harness workflow 지침';
  if (path.includes('/agents/openai.yaml')) return 'Codex skill 표시 메타데이터';
  if (path.startsWith('skills/')) return 'Codex skill 보조 리소스';
  if (path.startsWith('tests/')) return '자동 회귀 검증';
  if (path.startsWith('.claude-plugin/')) return 'Claude Code 플러그인 등록 정보';
  if (path.startsWith('.codex-plugin/')) return 'Codex 플러그인 등록 정보';
  if (path.endsWith('.mmd')) return 'harness overview 아키텍처 다이어그램 원본';
  if (path === templatePath) return 'harness overview HTML 템플릿';
  if (path === 'scripts/generate-harness-overview.mjs') return '다이어그램과 인벤토리를 한 번에 생성';
  return '프로젝트 소스 파일';
}

export async function buildFileRows(root = repositoryRoot, commandRows) {
  commandRows ??= await buildCommandRows(root);
  const commandDescriptions = new Map(commandRows.map((row) => [row.sourcePath, row.description]));
  const paths = (await Promise.all(sourceTreeEntries.map((entry) => walkFiles(root, entry))))
    .flat()
    .map(normalizePath);
  return [...new Set(paths)].sort().map((path) => ({
    path,
    type: fileType(path),
    role: fileRole(path, commandDescriptions),
  }));
}

export function renderFileTreeTable(rows) {
  const body = rows.map((row) => `
          <tr>
            <td><code>${escapeHtml(row.path)}</code></td>
            <td><span class="tag tag-blue" style="font-size:0.7rem;padding:1px 7px;">${escapeHtml(row.type)}</span></td>
            <td>${escapeHtml(row.role)}</td>
          </tr>`).join('');

  return `<div class="table-wrap">
      <table data-generated="source-tree">
        <thead><tr><th>경로</th><th>유형</th><th>역할</th></tr></thead>
        <tbody>${body}
        </tbody>
      </table>
    </div>`;
}

async function injectMermaidSources(root, template) {
  const names = [...template.matchAll(/\{\{MERMAID:([a-z0-9-]+)\}\}/g)].map((match) => match[1]);
  const sourceFiles = (await readdir(join(root, diagramDirectory)))
    .filter((name) => name.endsWith('.mmd'))
    .map((name) => basename(name, '.mmd'))
    .sort();
  const expectedFiles = [...new Set(names)].sort();
  if (JSON.stringify(sourceFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error(`Mermaid 원본과 템플릿 placeholder가 다릅니다: ${sourceFiles.join(', ')}`);
  }

  let output = template;
  for (const name of names) {
    const source = (await readFile(join(root, diagramDirectory, `${name}.mmd`), 'utf8')).trimEnd();
    output = output.replace(`{{MERMAID:${name}}}`, source);
  }
  return output;
}

export async function generateOverview(root = repositoryRoot) {
  const commandRows = await buildCommandRows(root);
  const fileRows = await buildFileRows(root, commandRows);
  let output = await readFile(join(root, templatePath), 'utf8');
  output = output.replace(
    '<!DOCTYPE html>',
    '<!DOCTYPE html>\n<!-- scripts/generate-harness-overview.mjs로 생성된 파일입니다. 직접 수정하지 마세요. -->',
  );
  output = await injectMermaidSources(root, output);
  output = output.replace('{{COMMAND_TABLE}}', renderCommandTable(commandRows));
  output = output.replace('{{FILE_TREE_TABLE}}', renderFileTreeTable(fileRows));
  if (/\{\{(?:MERMAID:|COMMAND_TABLE|FILE_TREE_TABLE)/.test(output)) {
    throw new Error('치환되지 않은 harness overview placeholder가 있습니다.');
  }
  return output;
}

async function main() {
  const output = await generateOverview();
  const outputFile = join(repositoryRoot, outputPath);
  if (process.argv.includes('--check')) {
    const current = await readFile(outputFile, 'utf8');
    if (current !== output) {
      console.error('docs/harness-overview.html이 소스와 다릅니다. npm run docs:generate를 실행하세요.');
      process.exitCode = 1;
      return;
    }
    console.log('harness overview 생성 상태가 최신입니다.');
    return;
  }
  await writeFile(outputFile, output);
  console.log(`generated ${relative(repositoryRoot, outputFile)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
