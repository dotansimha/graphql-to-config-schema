import { buildSchema } from 'graphql';
import { generateFromSchema } from '../src/generate';

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
        properties: {
          additionalItems: false,
          additionalProperties: false,
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
        definitions: {
          MyType: {
            additionalItems: false,
            additionalProperties: false,
            properties: {
              additionalItems: false,
              additionalProperties: false,
              id: { type: 'string' }
            },
            required: ['id'],
            title: 'MyType',
            type: 'object'
          }
        },
        properties: {
          a1: { type: 'string' },
          a2: { items: { type: 'string' }, type: 'array' },
          a3: { items: { type: 'string' }, type: 'array' },
          a4: { items: { type: 'string' }, type: 'array' },
          a5: { $ref: '#/definitions/MyType' },
          a6: { $ref: '#/definitions/MyType' },
          a7: { items: { $ref: '#/definitions/MyType' }, type: 'array' },
          a8: { items: { $ref: '#/definitions/MyType' }, type: 'array' },
          additionalItems: false,
          additionalProperties: false
        },
        required: ['a3', 'a4', 'a6', 'a8']
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
        definitions: {
          MyType: {
            additionalItems: false,
            additionalProperties: false,
            properties: {
              additionalItems: false,
              additionalProperties: false,
              id: { type: 'string' }
            },
            required: [],
            title: 'MyType',
            type: 'object'
          }
        },
        properties: {
          additionalItems: false,
          additionalProperties: false,
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
        definitions: {
          Link: {
            additionalItems: false,
            additionalProperties: false,
            properties: {
              additionalItems: false,
              additionalProperties: false,
              from: { type: 'string' },
              to: { type: 'string' },
              type: { type: 'string' }
            },
            required: ['type', 'from', 'to'],
            title: 'Link',
            type: 'object'
          },
          Prefix: {
            additionalItems: false,
            additionalProperties: false,
            properties: {
              additionalItems: false,
              additionalProperties: false,
              prefix: { type: 'string' },
              type: { type: 'string' }
            },
            required: ['type'],
            title: 'Prefix',
            type: 'object'
          }
        },
        properties: {
          additionalItems: false,
          additionalProperties: false,
          t: {
            anyOf: [
              { $ref: '#/definitions/Prefix' },
              { $ref: '#/definitions/Link' }
            ]
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
        definitions: {
          Complex: {
            additionalItems: false,
            additionalProperties: false,
            type: 'object',
            title: 'Complex',
            required: ['id'],
            properties: {
              additionalItems: false,
              additionalProperties: false,
              id: {
                type: 'string'
              }
            }
          }
        },
        required: ['test'],
        properties: {
          additionalItems: false,
          additionalProperties: false,
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
            ]
          }
        }
      })
    );
  });
});
