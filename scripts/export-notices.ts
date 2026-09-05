import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Audit this list when adding runtime dependencies, including any new transitives.
const licenseFiles: Record<string, string> = {
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

await writeFile('public/THIRD-PARTY-NOTICES.txt', `${sections.join('\n\n---\n\n').trim()}\n`);
console.log(`Exported project notices and ${dependencies.length} dependency licenses.`);
