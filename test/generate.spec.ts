import { buildSchema } from 'graphql';
import { generateFromSchema } from '../src/generate';
import { DIRECTIVES } from '../src/directives';

describe('generate', () => {
  it('simple primitive types, also with mandatory', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        field: String
        requiredField: String!
      }
    `);
    const out = await generateFromSchema(schema);

    expect(out).toEqual(
      expect.objectContaining({
        definitions: {},
        additionalProperties: false,
        properties: {
          field: { type: 'string' },
          requiredField: { type: 'string' }
        },
        required: ['requiredField']
      })
    );
  });

  it('array with primitives and types', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        a1: String
        a2: [String]
        a3: [String]!
        a4: [String!]!
        a5: MyType
        a6: MyType!
        a7: [MyType!]
        a8: [MyType!]!
      }

      type MyType {
        id: ID!
      }
    `);
    const out = await generateFromSchema(schema);

    expect(out).toEqual(
      expect.objectContaining({
        additionalProperties: false,
        definitions: {
          MyType: {
            additionalProperties: false,
            properties: { id: { type: 'string' } },
            required: ['id'],
            title: 'MyType',
            type: 'object'
          }
        },
        properties: {
          a1: { type: 'string' },
          a2: {
            additionalItems: false,
            items: { type: 'string' },
            type: 'array'
          },
          a3: {
            additionalItems: false,
            items: { type: 'string' },
            type: 'array'
          },
          a4: {
            additionalItems: false,
            items: { type: 'string' },
            type: 'array'
          },
          a5: { $ref: '#/definitions/MyType' },
          a6: { $ref: '#/definitions/MyType' },
          a7: {
            additionalItems: false,
            items: { $ref: '#/definitions/MyType' },
            type: 'array'
          },
          a8: {
            additionalItems: false,
            items: { $ref: '#/definitions/MyType' },
            type: 'array'
          }
        },
        required: ['a3', 'a4', 'a6', 'a8'],
        title: 'Config',
        type: 'object'
      })
    );
  });

  it('works with type $ref', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        field: MyType!
      }

      type MyType {
        id: String
      }
    `);
    const out = await generateFromSchema(schema);

    expect(out).toEqual(
      expect.objectContaining({
        additionalProperties: false,
        definitions: {
          MyType: {
            additionalProperties: false,
            properties: {
              id: { type: 'string' }
            },
            title: 'MyType',
            type: 'object'
          }
        },
        properties: {
          field: { $ref: '#/definitions/MyType' }
        },
        required: ['field']
      })
    );
  });

  it('works with interfaces', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        t: Transformer!
      }

      interface Transformer {
        type: String!
      }

      type Prefix implements Transformer {
        type: String!
        prefix: String
      }

      type Link implements Transformer {
        type: String!
        from: String!
        to: String!
      }
    `);
    const out = await generateFromSchema(schema);

    expect(out).toEqual(
      expect.objectContaining({
        additionalProperties: false,
        definitions: {
          Link: {
            additionalProperties: false,
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              type: { type: 'string' }
            },
            required: ['type', 'from', 'to'],
            title: 'Link',
            type: 'object'
          },
          Prefix: {
            additionalProperties: false,
            properties: {
              prefix: { type: 'string' },
              type: { type: 'string' }
            },
            required: ['type'],
            title: 'Prefix',
            type: 'object'
          }
        },
        properties: {
          t: {
            anyOf: [
              { $ref: '#/definitions/Prefix' },
              { $ref: '#/definitions/Link' }
            ],
            description: 'Any of: Prefix, Link'
          }
        },
        required: ['t']
      })
    );
  });

  it('works with unions', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        test: Something!
      }

      union Something = String | Int | Complex

      type Complex {
        id: ID!
      }
    `);
    const out = await generateFromSchema(schema);

    expect(out).toEqual(
      expect.objectContaining({
        additionalProperties: false,
        definitions: {
          Complex: {
            additionalProperties: false,
            type: 'object',
            title: 'Complex',
            required: ['id'],
            properties: {
              id: {
                type: 'string'
              }
            }
          }
        },
        required: ['test'],
        properties: {
          test: {
            anyOf: [
              {
                type: 'string'
              },
              {
                type: 'integer'
              },
              {
                $ref: '#/definitions/Complex'
              }
            ],
            description: 'Any of: String, Int, Complex'
          }
        }
      })
    );
  });
  it('allow additional properties if withAdditionalProperties directive is added', async () => {

    const schema = buildSchema(/* GraphQL */ `
      ${DIRECTIVES}
      type Query {
        handler: Handler
      }

      type Handler @withAdditionalProperties {
        graphql: GraphQLHandlerConfig
      }

      type GraphQLHandlerConfig {
        source: String!
      }
    `);
    const out = await generateFromSchema(schema);

    expect(out?.definitions).toEqual(
      expect.objectContaining({
        Handler: {
          additionalProperties: true,
          properties: {
            graphql: { $ref: '#/definitions/GraphQLHandlerConfig' }
          },
          title: 'Handler',
          type: 'object'
        }
      })
    )
  })
});
