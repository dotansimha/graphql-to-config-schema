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

    """ test desc """
    type MyType @md {
      """
      this
      is
      multi
      """
      f1: String
      f2: [String]
      f3: [String]!
      f4: [String!]!
      f5: SubType
      f6: Test
      u: MyUnion
    }

    union MyUnion = Boolean | OtherType

    type OtherType {
      boop: String
    }

    type SubType {
      t: String
      i: Int!
      """
      test
      """
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
    console.log(mdOutput[0].content);
    expect(mdOutput.length).toBe(1);
    expect(mdOutput[0].content).toMatchSnapshot();
  });
});
