#!/usr/bin/env node

import * as yargs from 'yargs';
import { loadTypedefs } from '@graphql-toolkit/core';
import { UrlLoader } from '@graphql-toolkit/url-loader';
import { JsonFileLoader } from '@graphql-toolkit/json-file-loader';
import { GraphQLFileLoader } from '@graphql-toolkit/graphql-file-loader';

async function main() {
  const { schema, typings, json } = yargs
    .option('schema', {
      type: 'array'
    })
    .option('json', {
      type: 'string'
    })
    .option('typings', {
      type: 'string'
    }).argv;

  const unifiedSchemea = await loadTypedefs(schema as string[], {
    loaders: [
      new UrlLoader(),
      new JsonFileLoader(),
      new GraphQLFileLoader(),
      new GraphQLFileLoader()
    ]
  });

  console.log(unifiedSchemea);
}

main();
