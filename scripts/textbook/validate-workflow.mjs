import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const options = parseCli(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const steps = options.allReviewed ? [
    ['validate:textbook-promotion-manifest', ['--all-reviewed']],
    ['validate:textbook-runtime-boundary', []],
    ['validate:textbook-runtime-integrity', []]
  ] : [
    ['textbook:extract', ['--textbook', options.textbook]],
    ['textbook:generate-drafts', ['--textbook', options.textbook]],
    ['validate:textbook-batch', ['--textbook', options.textbook]],
    ['validate:textbook-drafts', ['--textbook', options.textbook]],
    ['validate:textbook-experiments', ['--textbook', options.textbook]],
    ['validate:textbook-runtime-boundary', []],
    ['validate:textbook-runtime-integrity', []],
    ['textbook:coverage', ['--textbook', options.textbook]],
    ['validate:textbook-coverage', ['--textbook', options.textbook]]
  ];

  if (!options.allReviewed && !options.textbook) {
    throw new Error('--textbook is required unless --all-reviewed is provided');
  }

  for (const [scriptName, scriptArgs] of steps) {
    console.log(`Running ${scriptName}`);
    runWorkflowStep(scriptName, scriptArgs);
  }

  console.log(`Textbook workflow valid: ${options.allReviewed ? 'all-reviewed' : options.textbook}`);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      textbook: { type: 'string' },
      'all-reviewed': { type: 'boolean' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    textbook: values.textbook ?? null,
    allReviewed: values['all-reviewed'] === true
  };
}

function printHelp() {
  console.log(`Textbook workflow validator / 教材工作流校验器

Usage:
  node scripts/textbook/validate-workflow.mjs --textbook <volumeId>
  node scripts/textbook/validate-workflow.mjs --all-reviewed

Options:
  --textbook <volumeId>                Run the textbook ingestion workflow gate.
  --all-reviewed                       Run non-mutating gates for all reviewed manifests and runtime targets.
  --help                               Show this help.`);
}

function runWorkflowStep(scriptName, scriptArgs) {
  const scriptPath = workflowScriptPath(scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: projectRoot,
    stdio: 'inherit'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function workflowScriptPath(scriptName) {
  const scriptPaths = {
    'textbook:extract': path.join(projectRoot, 'scripts', 'textbook', 'extract-textbook.mjs'),
    'textbook:generate-drafts': path.join(projectRoot, 'scripts', 'textbook', 'generate-drafts.mjs'),
    'validate:textbook-batch': path.join(projectRoot, 'scripts', 'textbook', 'validate-batch-contract.mjs'),
    'validate:textbook-drafts': path.join(projectRoot, 'scripts', 'textbook', 'validate-draft-schema.mjs'),
    'validate:textbook-experiments': path.join(projectRoot, 'scripts', 'textbook', 'validate-experiment-backlog.mjs'),
    'validate:textbook-promotion-manifest': path.join(projectRoot, 'scripts', 'textbook', 'validate-promotion-manifest.mjs'),
    'validate:textbook-runtime-boundary': path.join(projectRoot, 'scripts', 'textbook', 'validate-runtime-boundary.mjs'),
    'validate:textbook-runtime-integrity': path.join(projectRoot, 'scripts', 'textbook', 'validate-runtime-integrity.mjs'),
    'textbook:coverage': path.join(projectRoot, 'scripts', 'textbook', 'generate-coverage.mjs'),
    'validate:textbook-coverage': path.join(projectRoot, 'scripts', 'textbook', 'validate-coverage.mjs')
  };

  const scriptPath = scriptPaths[scriptName];
  if (!scriptPath) {
    throw new Error(`Unknown workflow step: ${scriptName}`);
  }

  return scriptPath;
}
