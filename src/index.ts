#!/usr/bin/env node

import * as yargs from 'yargs';
import { loadSchema } from '@graphql-toolkit/core';
import { UrlLoader } from '@graphql-toolkit/url-loader';
import { JsonFileLoader } from '@graphql-toolkit/json-file-loader';
import { GraphQLFileLoader } from '@graphql-toolkit/graphql-file-loader';
import { generateFromSchema } from './generate';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { compile } from 'json-schema-to-typescript';

async function main() {
  const { schema, typings, json, rootType } = yargs
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
    }).argv;

  const unifiedSchemea = await loadSchema(schema as string[], {
    loaders: [
      new UrlLoader(),
      new JsonFileLoader(),
      new GraphQLFileLoader(),
      new GraphQLFileLoader()
    ]
  });

  const jsonSchema = generateFromSchema(unifiedSchemea, rootType);
  const schemaFilePath = resolve(process.cwd(), `./${json}`);
  writeFileSync(schemaFilePath, JSON.stringify(jsonSchema, null, 2));

  if (typings) {
    const tsTypes = await compile(jsonSchema as any, 'Config');
    const tsFilePath = resolve(process.cwd(), `./${typings}`);
    writeFileSync(tsFilePath, tsTypes);
  }
}

main();
