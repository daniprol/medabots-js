import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// Audit this list when adding runtime dependencies, including any new transitives.
const licenseFiles: Record<string, string> = {
  '@noble/hashes': 'LICENSE',
  '@colyseus/core': 'LICENSE',
  '@colyseus/sdk': 'LICENSE',
  '@colyseus/schema': 'LICENSE',
  '@colyseus/ws-transport': 'LICENSE',
  express: 'LICENSE',
  '@fontsource/barlow': 'LICENSE',
  '@fontsource/barlow-condensed': 'LICENSE',
  '@sinclair/typebox': 'license',
  'jsonc-parser': 'LICENSE.md',
  three: 'LICENSE',
};

const project = JSON.parse(await readFile('package.json', 'utf8')) as {
  dependencies: Record<string, string>;
};
const dependencies = Object.keys(project.dependencies).sort();

if (dependencies.join('\n') !== Object.keys(licenseFiles).sort().join('\n')) {
  throw new Error('Runtime dependencies changed. Review licenses and update export-notices.ts.');
}

const sections = [
  'ROBATTLE ARENA — PROJECT AND THIRD-PARTY NOTICES',
  await readFile('LICENSE', 'utf8'),
  await readFile('NOTICE.md', 'utf8'),
];

for (const name of dependencies) {
  const directory = join('node_modules', name);
  const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as {
    version: string;
  };
  const license = await readFile(join(directory, licenseFiles[name]!), 'utf8');
  sections.push(`${name} ${metadata.version}\n\n${license.trim()}`);
}

// These runtime transitives are bundled into the browser SDK. Server packages
// remain external in the Node build and retain their licenses in node_modules.
const sdkRequire = createRequire(import.meta.resolve('@colyseus/sdk'));
for (const [name, filename] of Object.entries({
  '@colyseus/shared-types': 'LICENSE',
  msgpackr: 'LICENSE',
  tslib: 'LICENSE.txt',
})) {
  let directory = dirname(sdkRequire.resolve(name));
  while (!existsSync(join(directory, 'package.json'))) {
    directory = dirname(directory);
  }
  const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as {
    version: string;
  };
  sections.push(
    `${name} ${metadata.version}\n\n${(await readFile(join(directory, filename), 'utf8')).trim()}`,
  );
}

await writeFile(
  'public/THIRD-PARTY-NOTICES.txt',
  `${sections.join('\n\n---\n\n').trim().replaceAll('\r\n', '\n')}\n`,
);
console.log(`Exported project notices and ${dependencies.length} dependency licenses.`);
