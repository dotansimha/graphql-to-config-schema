#!/usr/bin/env node

import * as yargs from 'yargs';
import { loadSchema } from '@graphql-tools/load';
import { UrlLoader } from '@graphql-tools/url-loader';
import { JsonFileLoader } from '@graphql-tools/json-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { generateFromSchema } from './generate';
import { writeFile, mkdirp } from 'fs-extra';
import { resolve, join } from 'path';
import { compile } from 'json-schema-to-typescript';
import { DIRECTIVES } from './directives';
import { generatedMarkdown } from './md-generator';

async function main() {
  const { schema, typings, json, rootType, markdown } = yargs
    .option('schema', {
      required: true,
      type: 'array'
    })
    .option('json', {
      required: true,
      type: 'string'
    })
    .option('rootType', {
      type: 'string',
      default: 'Query'
    })
    .option('typings', {
      type: 'string'
    })
    .option('markdown', {
      alias: 'md',
      type: 'string'
    }).argv;

  const unifiedSchemea = await loadSchema(
    [...((schema as string[]) || []), DIRECTIVES],
    {
      loaders: [
        new UrlLoader(),
        new JsonFileLoader(),
        new GraphQLFileLoader(),
        new GraphQLFileLoader()
      ]
    }
  );

  const jsonSchema = generateFromSchema(unifiedSchemea, rootType);
  const schemaFilePath = resolve(process.cwd(), `./${json}`);
  await writeFile(schemaFilePath, JSON.stringify(jsonSchema, null, 2));

  if (typings) {
    const tsTypes = await compile(jsonSchema, 'Config');
    const tsFilePath = resolve(process.cwd(), `./${typings}`);
    await writeFile(tsFilePath, tsTypes);
  }

  if (markdown) {
    const mdFiles = await generatedMarkdown(unifiedSchemea);
    const mdDir = resolve(process.cwd(), `./${markdown}`);
    await mkdirp(mdDir);

    await Promise.all(mdFiles.map(async result => {
      const filePath = join(mdDir, result.file);
      await writeFile(filePath, result.content);
    }))
  }
}

main();
