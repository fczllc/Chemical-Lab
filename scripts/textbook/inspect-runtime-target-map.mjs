import { parseArgs } from 'node:util';
import { TEXTBOOK_RUNTIME_TARGET_MAP } from '../../src/data/textbookIngestion/runtimeTargetMap.js';

main();

function main() {
  const options = parseCli(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (options.classify) {
    printClassification(options.classify);
    return;
  }

  printTargetMap();
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      classify: { type: 'string' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    classify: values.classify ?? null
  };
}

function printHelp() {
  console.log(`Textbook runtime target map inspector / 教材运行时目标映射检查器

Usage:
  node scripts/textbook/inspect-runtime-target-map.mjs
  node scripts/textbook/inspect-runtime-target-map.mjs --classify <candidateType>

Options:
  --classify <candidateType>           Classify one textbook artifact type.
  --help                               Show this help.`);
}

function printTargetMap() {
  console.log('Runtime target map');
  console.log(`schemaVersion: ${TEXTBOOK_RUNTIME_TARGET_MAP.schemaVersion}`);
  console.log('supportedDestinations:');

  for (const destination of TEXTBOOK_RUNTIME_TARGET_MAP.supportedDestinations) {
    console.log(`- ${destination.candidateType} -> ${destination.targetRuntimeFile} (${destination.contentType}, ${destination.targetField})`);
  }

  console.log('preservationRules:');
  for (const rule of TEXTBOOK_RUNTIME_TARGET_MAP.preservationRules) {
    console.log(`- ${rule}`);
  }

  const namespaceRule = TEXTBOOK_RUNTIME_TARGET_MAP.namespaceRule;
  console.log('namespaceRule:');
  console.log(`- prefix: ${namespaceRule.prefix}`);
  console.log(`- format: ${namespaceRule.format}`);
  console.log(`- requiredParts: ${namespaceRule.requiredParts.join(', ')}`);

  console.log('unsupportedArtifactTypes:');
  for (const artifactType of TEXTBOOK_RUNTIME_TARGET_MAP.unsupportedArtifactTypes) {
    console.log(`- ${artifactType.candidateType} -> ${artifactType.classification}`);
  }
}

function printClassification(candidateType) {
  const supported = TEXTBOOK_RUNTIME_TARGET_MAP.supportedDestinations.find((destination) => destination.candidateType === candidateType);
  if (supported) {
    console.log(`candidateType: ${supported.candidateType}`);
    console.log(`classification: promotable`);
    console.log(`targetRuntimeFile: ${supported.targetRuntimeFile}`);
    console.log(`contentType: ${supported.contentType}`);
    return;
  }

  const unsupported = TEXTBOOK_RUNTIME_TARGET_MAP.unsupportedArtifactTypes.find((artifactType) => artifactType.candidateType === candidateType);
  if (unsupported) {
    console.log(`candidateType: ${unsupported.candidateType}`);
    console.log(`classification: ${unsupported.classification}`);
    console.log('targetRuntimeFile: none');
    return;
  }

  console.log(`candidateType: ${candidateType}`);
  console.log('classification: not-promotable: unsupported target');
  console.log('targetRuntimeFile: none');
}
