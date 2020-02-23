import {
  GraphQLSchema,
  printSchema,
  parse,
  visit,
  FieldDefinitionNode,
  Kind,
  TypeNode,
  NamedTypeNode,
  isScalarType,
  isEnumType,
  isObjectType,
  isInterfaceType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  isUnionType
} from 'graphql';
import { JSONSchema7, JSONSchema7Definition } from 'json-schema';

export function generateFromSchema(
  schema: GraphQLSchema,
  rootType = 'Query'
): JSONSchema7 {
  const documentNode = parse(printSchema(schema));
  const jsonSchema: JSONSchema7 = {
    definitions: {},
    title: 'Config',
    type: 'object',
    $schema: 'http://json-schema.org/draft-07/schema#'
  };

  visit(documentNode, {
    ObjectTypeDefinition(node) {
      if (node.name.value === rootType) {
        (jsonSchema.required = node.fields
          .filter(f => f.type.kind === Kind.NON_NULL_TYPE)
          .map(f => f.name.value)),
          (jsonSchema.properties = buildPropertiesFromFields(
            schema,
            node.fields
          ));
        return;
      }

      jsonSchema.definitions[node.name.value] = {
        additionalItems: false,
        additionalProperties: false,
        type: 'object',
        title: node.name.value,
        required: node.fields
          .filter(f => f.type.kind === Kind.NON_NULL_TYPE)
          .map(f => f.name.value),
        properties: buildPropertiesFromFields(schema, node.fields)
      };
    }
  });

  return jsonSchema;
}

function buildPropertiesFromFields(
  schema: GraphQLSchema,
  fields: ReadonlyArray<FieldDefinitionNode>
): Record<string, JSONSchema7Definition> {
  return fields.reduce((prev, field) => {
    const namedType = getBaseTypeNode(field.type);
    const typeToUse = getTypeToUse(schema, namedType.name.value);
    const isArrayField = isArray(field.type);
    const fieldDef = isArrayField
      ? { type: 'array', items: typeToUse }
      : typeToUse;

    return {
      ...prev,
      additionalItems: false,
      additionalProperties: false,
      [field.name.value]: fieldDef
    };
  }, {});
}

function getBaseTypeNode(typeNode: TypeNode): NamedTypeNode {
  if (
    typeNode.kind === Kind.LIST_TYPE ||
    typeNode.kind === Kind.NON_NULL_TYPE
  ) {
    return getBaseTypeNode(typeNode.type);
  }

  return typeNode;
}

function isArray(typeNode: TypeNode): boolean {
  if (typeNode.kind === Kind.NON_NULL_TYPE) {
    return isArray(typeNode.type);
  } else if (typeNode.kind === Kind.LIST_TYPE) {
    return true;
  }

  return false;
}

const SCALARS = {
  String: 'string',
  ID: 'string', // Should be ["string", "number"] ?
  Boolean: 'boolean',
  Float: 'number',
  Int: 'integer',
  JSON: 'object'
};

function getTypeToUse(
  schema: GraphQLSchema,
  typeName: string
): JSONSchema7Definition {
  const schemaType = schema.getType(typeName);

  if (isScalarType(schemaType) && SCALARS[schemaType.name]) {
    return {
      type: SCALARS[schemaType.name]
    };
  } else if (isEnumType(schemaType)) {
    return {
      type: 'string',
      enum: schemaType.getValues().map(v => v.value)
    };
  } else if (isObjectType(schemaType)) {
    return {
      $ref: `#/definitions/${schemaType.name}`
    };
  } else if (isInterfaceType(schemaType)) {
    return {
      anyOf: getImplementingTypes(schema, schemaType).map(t =>
        getTypeToUse(schema, t)
      )
    };
  } else if (isUnionType(schemaType)) {
    return {
      anyOf: schemaType.getTypes().map(t => getTypeToUse(schema, t.name))
    };
  }

  return {
    type: 'object'
  };
}

function getImplementingTypes(
  schema: GraphQLSchema,
  type: GraphQLInterfaceType
): string[] {
  const allTypesMap = schema.getTypeMap();
  const implementingTypes: string[] = [];

  for (const graphqlType of Object.values(allTypesMap)) {
    if (graphqlType instanceof GraphQLObjectType) {
      const allInterfaces = graphqlType.getInterfaces();
      if (allInterfaces.find(int => int.name === type.name)) {
        implementingTypes.push(graphqlType.name);
      }
    }
  }

  return implementingTypes;
}
