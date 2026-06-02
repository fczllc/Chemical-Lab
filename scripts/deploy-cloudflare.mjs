import { spawn } from 'node:child_process';
import process from 'node:process';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  printHelp();
  process.exit(0);
}

const smokeTest = args.has('--smoke-test');

main().catch((error) => {
  console.error(`\n❌ Cloudflare 部署失败：${error.message}`);
  process.exitCode = 1;
});

async function main() {
  console.log('☁️  Cloudflare Pages 部署脚本');
  console.log('前置要求：已安装 Node.js，并在项目根目录运行过 npm install。');

  // 1. 构建生产版本
  console.log('\n📦 正在构建生产版本...');
  await runNpm(['run', 'build']);

  if (smokeTest) {
    console.log('\n✅ 构建完成（烟雾测试模式，跳过实际部署）。');
    return;
  }

  // 2. 检查 wrangler
  console.log('\n🔍 检查 wrangler CLI...');
  try {
    await runCommand('npx', ['wrangler', '--version'], { silent: true });
  } catch {
    console.error('错误：未找到 wrangler CLI。请安装：npm install -g wrangler');
    console.error('参考文档：https://developers.cloudflare.com/workers/wrangler/install-and-update/');
    process.exit(1);
  }

  // 3. 部署
  console.log('\n🚀 正在部署到 Cloudflare Pages...');
  await runNpx(['wrangler', 'pages', 'deploy', 'dist/']);

  console.log('\n✅ Cloudflare Pages 部署完成！');
}

function printHelp() {
  console.log(`Cloudflare Pages 部署脚本

用法：
  node scripts/deploy-cloudflare.mjs
  node scripts/deploy-cloudflare.mjs --smoke-test
  node scripts/deploy-cloudflare.mjs --help

说明：
  默认模式会先执行 Vite 生产构建，然后使用 wrangler CLI 部署到 Cloudflare Pages。
  --smoke-test 仅执行构建，不执行实际部署，适合自动化验证。`);
}

function runNpm(npmArgs, options = {}) {
  return runCommand(process.execPath, [process.platform === 'win32' ? 'npm.cmd' : 'npm', ...npmArgs], options);
}

function runNpx(npxArgs, options = {}) {
  return runCommand(process.execPath, [process.platform === 'win32' ? 'npx.cmd' : 'npx', ...npxArgs], options);
}

function runCommand(cmd, cmdArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, {
      stdio: options.silent ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      shell: process.platform === 'win32'
    });

    let stdout = '';
    let stderr = '';

    if (options.silent) {
      child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    }

    child.on('error', (error) => {
      reject(new Error(`无法启动命令 ${cmd} ${cmdArgs.join(' ')}：${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(options.silent ? { stdout: stdout.trim(), stderr: stderr.trim() } : undefined);
        return;
      }
      reject(new Error(`命令 ${cmd} ${cmdArgs.join(' ')} 退出码为 ${code}${stderr ? `：${stderr.trim()}` : ''}`));
    });
  });
}
