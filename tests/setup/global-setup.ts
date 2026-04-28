import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const HOST = '127.0.0.1';
const PORT = 4173;
const SERVER_URL = `http://${HOST}:${PORT}/`;
const ROOT_DIR = process.cwd();
const RUNTIME_DIR = path.join(ROOT_DIR, '.playwright-runtime');
const PID_FILE = path.join(RUNTIME_DIR, 'vite-server.json');
const VITE_BIN = process.platform === 'win32'
  ? path.join(ROOT_DIR, 'node_modules', '.bin', 'vite.cmd')
  : path.join(ROOT_DIR, 'node_modules', '.bin', 'vite');

export default async function globalSetup() {
  await mkdir(RUNTIME_DIR, { recursive: true });

  if (await isServerReady()) {
    return;
  }

  await rm(PID_FILE, { force: true });

  const command = process.platform === 'win32' ? 'cmd.exe' : VITE_BIN;
  const args = process.platform === 'win32'
    ? ['/c', VITE_BIN, '--host', HOST, '--port', `${PORT}`, '--strictPort']
    : ['--host', HOST, '--port', `${PORT}`, '--strictPort'];

  const server = spawn(command, args, {
    cwd: ROOT_DIR,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });

  server.unref();

  await writeFile(PID_FILE, JSON.stringify({ pid: server.pid }), 'utf8');
  await waitForServerReady();
}

async function waitForServerReady() {
  const deadline = Date.now() + 60000;

  while (Date.now() < deadline) {
    if (await isServerReady()) {
      return;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for Vite server at ${SERVER_URL}`);
}

async function isServerReady() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(SERVER_URL, { signal: controller.signal });
    const html = await response.text();
    clearTimeout(timeoutId);
    return response.ok && html.includes('/src/main.js');
  } catch {
    return false;
  }
}

function delay(timeMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeMs);
  });
}
