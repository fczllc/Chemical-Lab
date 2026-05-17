import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { validateSimulationConfig } from '../src/lab-sim/schema.js';

const projectRoot = process.cwd();
const evidenceRoot = path.join(projectRoot, '.sisyphus', 'evidence');
const configRoot = path.join(projectRoot, 'src', 'lab-sim', 'experiments', 'configs');
const defaultReportPath = path.join('.sisyphus', 'evidence', 'task-2-simulation-schema.json');

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  const options = parseCli(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const result = await validateSimulationConfigs();
  await maybeWriteReport(options.report, result);
  printResult(result);

  if (result.status !== 'pass') {
    process.exitCode = 1;
  }
}

function parseCli(args) {
  const options = {
    help: false,
    report: null
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--report') {
      const nextArg = args[index + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        options.report = nextArg;
        index += 1;
      } else {
        options.report = defaultReportPath;
      }
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Simulation schema validator / 虚拟实验模拟配置校验器

Usage:
  node scripts/validate-simulation-schema.mjs [--report [path]]

Default checks:
  - Validate every .json file under src/lab-sim/experiments/configs/.
  - Require experimentId, template, apparatus, parameters, phenomena, views, fallback, and completionCondition.
  - Enforce views in macro/micro and fallback in canvas/text/none.

Options:
  --report [path]  Write JSON validation report under .sisyphus/evidence/.
                   Defaults to .sisyphus/evidence/task-2-simulation-schema.json.
  --help           Show this help.`);
}

async function validateSimulationConfigs() {
  const configFiles = await listJsonConfigFiles(configRoot);
  const checks = [];

  for (const configFile of configFiles) {
    const relativePath = path.relative(projectRoot, configFile).replaceAll(path.sep, '/');
    let config = null;
    try {
      config = JSON.parse(await readFile(configFile, 'utf8'));
    } catch (error) {
      checks.push({
        source: relativePath,
        status: 'fail',
        errors: [`${relativePath} failed to parse JSON: ${error.message}`]
      });
      continue;
    }

    checks.push(validateSimulationConfig(config, relativePath));
  }

  if (configFiles.length === 0) {
    checks.push({
      source: 'src/lab-sim/experiments/configs',
      status: 'fail',
      errors: ['No simulation .json config files found']
    });
  }

  const errors = checks.flatMap((check) => check.errors ?? []);
  return {
    schemaVersion: 1,
    validator: 'scripts/validate-simulation-schema.mjs',
    source: 'src/lab-sim/experiments/configs',
    status: errors.length === 0 ? 'pass' : 'fail',
    counters: {
      configFiles: configFiles.length,
      failures: checks.filter((check) => check.status !== 'pass').length
    },
    errors,
    checks
  };
}

async function listJsonConfigFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listJsonConfigFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function printResult(result) {
  console.log(`simulationSchemaValidationStatus=${result.status}`);
  for (const [name, value] of Object.entries(result.counters ?? {})) {
    console.log(`${name}=${value}`);
  }
  for (const error of result.errors ?? []) {
    console.error(`ERROR ${error}`);
  }
}

async function maybeWriteReport(reportPath, result) {
  if (!reportPath) {
    return;
  }
  const absolutePath = resolveReportPath(reportPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

function resolveReportPath(reportPath) {
  if (path.isAbsolute(reportPath)) {
    throw new Error('--report must be a repository-relative path under .sisyphus/evidence/');
  }

  const normalizedPath = path.normalize(reportPath);
  if (normalizedPath.split(path.sep).includes('..')) {
    throw new Error('--report must not contain parent-directory traversal');
  }

  const absolutePath = path.resolve(projectRoot, normalizedPath);
  const relativeToEvidence = path.relative(evidenceRoot, absolutePath);
  if (relativeToEvidence === '' || relativeToEvidence.startsWith('..') || path.isAbsolute(relativeToEvidence)) {
    throw new Error('--report must be under .sisyphus/evidence/');
  }

  return absolutePath;
}
