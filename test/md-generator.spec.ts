import { DIRECTIVES } from '../src/directives';
import { buildSchema } from 'graphql';
import { generatedMarkdown } from '../src/md-generator';

describe('MD Generator', () => {
  it('Should generate md correctly', () => {
    const schema = buildSchema(/*GraphQL*/ `
    ${DIRECTIVES}

    type Query {
      m: MyType
    }

    type MyType @md {
      f1: String
      f2: [String]
      f3: [String]!
      f4: [String!]!
      f5: SubType
      f6: Test
    }

    type SubType {
      t: String
      i: Int!
      nest: Sub2Type!
      other: String!
    }

    enum Test {
      A
      B
      C
    }

    type Sub2Type {
      t: String
    }
    `);

    const mdOutput = generatedMarkdown(schema);
    expect(mdOutput.length).toBe(1);
    expect(mdOutput[0].content).toMatchSnapshot();
  });
});
