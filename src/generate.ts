import {
  GraphQLSchema,
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
import { JSONSchema4 } from 'json-schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

export function generateFromSchema(
  schema: GraphQLSchema,
  rootType = 'Query'
): JSONSchema4 {
  const documentNode = parse(printSchemaWithDirectives(schema));
  const jsonSchema: JSONSchema4 = {
    definitions: {},
    title: 'Config',
    type: 'object',
    $schema: 'http://json-schema.org/draft-04/schema#'
  };

  visit(documentNode, {
    ObjectTypeDefinition(node) {
      if (node.name.value === rootType) {
        const required = (node.fields || [])
          .filter(f => f.type.kind === Kind.NON_NULL_TYPE)
          .map(f => f.name.value);

        if (required.length) {
          jsonSchema.required = required;
        }

        jsonSchema.properties = buildPropertiesFromFields(
          schema,
          node.fields || []
        );
        jsonSchema.additionalProperties = false;

        return;
      }

      if (jsonSchema.definitions) {
        const additional: JSONSchema4 = {};

        const required = (node.fields || [])
          .filter(f => f.type.kind === Kind.NON_NULL_TYPE)
          .map(f => f.name.value);

        if (required.length) {
          additional.required = required;
        }

        jsonSchema.definitions[node.name.value] = {
          additionalProperties: node.directives?.some(directiveNode => directiveNode.name.value === 'withAdditionalProperties'),
          type: 'object',
          title: node.name.value,
          properties: buildPropertiesFromFields(schema, node.fields || []),
          ...additional
        };
      }
    }
  });

  return jsonSchema;
}

function buildPropertiesFromFields(
  schema: GraphQLSchema,
  fields: ReadonlyArray<FieldDefinitionNode>
): Record<string, JSONSchema4> {
  return fields.reduce((prev, field) => {
    const namedType = getBaseTypeNode(field.type);
    const typeToUse = getTypeToUse(schema, namedType.name.value);
    const isArrayField = isArray(field.type);
    const fieldDef: JSONSchema4 = (isArrayField
      ? { type: 'array', items: typeToUse, additionalItems: false }
      : typeToUse) as JSONSchema4;

    if (!isArray) {
      fieldDef.additionalProperties = false;
    } else {
      fieldDef.description = typeToUse.description;
    }

    if (field.description?.value) {
      if (fieldDef.description) {
        fieldDef.description = `${field.description.value} (${fieldDef.description})`;
      } else {
        fieldDef.description = field.description.value;
      }
    }

    return {
      ...prev,
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

const SCALARS: Record<string, string> = {
  String: 'string',
  ID: 'string',
  Boolean: 'boolean',
  Float: 'number',
  Int: 'integer',
  JSON: 'object'
};

function getTypeToUse(schema: GraphQLSchema, typeName: string): JSONSchema4 {
  const schemaType = schema.getType(typeName);

  if (isScalarType(schemaType) && SCALARS[schemaType.name]) {
    const scalar = SCALARS[schemaType.name] as any;

    if (scalar === 'object') {
      return {
        type: scalar,
        properties: {},
      }
    };

    return {
      type: scalar,
    };
  } else if (isEnumType(schemaType)) {
    const values = schemaType.getValues().map(v => v.value);

    return {
      type: 'string',
      enum: values,
      description: `Allowed values: ${values.join(', ')}`
    };
  } else if (isObjectType(schemaType)) {
    return {
      $ref: `#/definitions/${schemaType.name}`
    };
  } else if (isInterfaceType(schemaType)) {
    const types = getImplementingTypes(schema, schemaType);

    return {
      description: `Any of: ${types.join(', ')}`,
      anyOf: types.map(t => getTypeToUse(schema, t))
    };
  } else if (isUnionType(schemaType)) {
    const types = schemaType.getTypes();

    return {
      description: `Any of: ${types.join(', ')}`,
      anyOf: types.map(t => getTypeToUse(schema, t.name))
    };
  }

  return {
    description: `Unknown object`,
    type: 'object',
    properties: {},
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
