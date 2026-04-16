import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const pexec = promisify(execFile);

export async function detectMember(cwd, flags = {}) {
  if (flags.member) return sanitize(flags.member);
  try {
    const { stdout } = await pexec('git', ['-C', cwd, 'config', 'user.name']);
    const name = stdout.trim();
    if (name) return sanitize(name);
  } catch { /* ignore */ }
  const envUser = process.env.USER || process.env.USERNAME;
  if (envUser) return sanitize(envUser);
  return 'unknown';
}

function sanitize(name) {
  return name.trim().replace(/\s+/g, '-').replace(/[^\w.-]/g, '');
}
