import { Value } from '@sinclair/typebox/value';
import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';

import type { RawDocument } from './catalog';
import { schemas, type Definition } from './schemas';

export function invalidContent(
  filePath: string,
  propertyPath: string,
  expected: string,
  received: unknown,
): never {
  throw new Error(
    `${filePath} ${propertyPath || '/'}: expected ${expected}; received ${JSON.stringify(received)}`,
  );
}

export function parseContentDocument(document: RawDocument): Definition {
  const errors: ParseError[] = [];
  const value: unknown = parse(document.text, errors, { allowTrailingComma: true });
  const parseError = errors[0];

  if (parseError) {
    invalidContent(
      document.path,
      `/ (offset ${parseError.offset})`,
      'valid JSONC',
      printParseErrorCode(parseError.error),
    );
  }

  const kind = value && typeof value === 'object' && 'kind' in value ? value.kind : undefined;

  if (typeof kind !== 'string' || !Object.hasOwn(schemas, kind)) {
    invalidContent(document.path, '/kind', Object.keys(schemas).join(' | '), kind);
  }

  const schema = schemas[kind as keyof typeof schemas];

  if (Value.Check(schema, value)) {
    return value;
  }

  const error = Value.Errors(schema, value).First()!;

  return invalidContent(document.path, error.path, error.message, error.value);
}
