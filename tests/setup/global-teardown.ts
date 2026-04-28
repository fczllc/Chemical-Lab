import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const PID_FILE = path.join(ROOT_DIR, '.playwright-runtime', 'vite-server.json');

export default async function globalTeardown() {
  const pid = await readPid();
  if (!pid) {
    return;
  }

  if (process.platform === 'win32') {
    await stopWindowsProcess(pid);
  } else {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Process already exited.
    }
  }

  await rm(PID_FILE, { force: true });
}

async function readPid() {
  try {
    const content = await readFile(PID_FILE, 'utf8');
    const payload = JSON.parse(content);
    return Number(payload?.pid) || null;
  } catch {
    return null;
  }
}

async function stopWindowsProcess(pid: number) {
  await new Promise((resolve) => {
    const killer = spawn('taskkill', ['/pid', `${pid}`, '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true
    });
    killer.on('exit', () => resolve(undefined));
    killer.on('error', () => resolve(undefined));
  });
}
