import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

export async function confirm(question, { defaultYes = false } = {}) {
  const rl = createInterface({ input: stdin, output: stdout });
  const suffix = defaultYes ? '[Y/n]' : '[y/N]';
  try {
    const ans = (await rl.question(`${question} ${suffix} `)).trim().toLowerCase();
    if (!ans) return defaultYes;
    return ans === 'y' || ans === 'yes';
  } finally {
    rl.close();
  }
}

export async function ask(question, { defaultValue = '' } = {}) {
  const rl = createInterface({ input: stdin, output: stdout });
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  try {
    const ans = (await rl.question(`${question}${suffix} `)).trim();
    return ans || defaultValue;
  } finally {
    rl.close();
  }
}
