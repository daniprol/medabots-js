import { mkdir, writeFile } from 'node:fs/promises';

import { schemas } from '../src/content/schemas';

await mkdir('game-data/schemas', { recursive: true });

await Promise.all(
  Object.entries(schemas).map(([kind, schema]) =>
    writeFile(
      `game-data/schemas/${kind}.schema.json`,
      JSON.stringify(
        {
          $schema: 'http://json-schema.org/draft-07/schema#',
          title: `Medabots ${kind} definition`,
          ...schema,
        },
        null,
        2,
      ) + '\n',
    ),
  ),
);

console.log(`Generated ${Object.keys(schemas).length} content schemas.`);
