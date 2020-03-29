import {
  GraphQLSchema,
  GraphQLOutputType,
  isListType,
  isNonNullType,
  isObjectType,
  isInterfaceType,
  isEnumType,
  getNamedType,
  isUnionType,
  isScalarType
} from 'graphql';

export type FileOutput = { file: string; content: string };

export function generatedMarkdown(schema: GraphQLSchema): FileOutput[] {
  const result: FileOutput[] = [];

  for (const [typeName, type] of Object.entries(schema.getTypeMap())) {
    if (
      isObjectType(type) &&
      type.astNode &&
      type.astNode.directives &&
      type.astNode.directives.find(d => d.name.value === 'md')
    ) {
      result.push({
        file: `${typeName}.generated.md`,
        content: `${
          type.description ? type.description + '\n\n' : ''
        }${transformTypeToMdFormat(type)}`
      });
    }
  }

  return result;
}

export function transformTypeToMdFormat(
  type: GraphQLOutputType,
  level = 0
): string {
  if (isListType(type)) {
    return `Array<${transformTypeToMdFormat(type.ofType, level)}>`;
  }
  if (isNonNullType(type)) {
    return transformTypeToMdFormat(type.ofType, level);
  }

  if (isObjectType(type) || isInterfaceType(type)) {
    const fields: string[] = [];

    for (const [fieldName, field] of Object.entries(type.getFields())) {
      const baseField = `${indent(level)}* \`${fieldName}\``;
      const hasChildObject = isObjectType(getNamedType(field.type));
      const hasMultipleTypes = isUnionType(getNamedType(field.type));
      const isRequired =
        isNonNullType(field.type) ||
        (isListType(field.type) && isNonNullType(field.type.ofType));
      const typeToUse = transformTypeToMdFormat(field.type, level + 1);

      if (hasChildObject) {
        fields.push(
          `${baseField} (type: \`object\`${isRequired ? ', required' : ''})${
            field.description ? ' - ' + field.description : ''
          }: ${typeToUse}`
        );
      } else if (hasMultipleTypes) {
        fields.push(
          `${baseField} - ${
            field.description ? ' - ' + field.description : ''
          }${isRequired ? ' (required)' : ''}one of: ${typeToUse}`
        );
      } else {
        fields.push(
          `${baseField} (type: \`${typeToUse}\`${
            isRequired ? ', required' : ''
          })${field.description ? ' - ' + field.description : ''}`
        );
      }
    }

    return '\n' + fields.join('\n');
  } else if (isEnumType(type)) {
    return `String (${type
      .getValues()
      .map(v => v.name)
      .join(' | ')})`;
  } else if (isUnionType(type)) {
    return '\n' + type.getTypes().map(t => {
      const content = transformTypeToMdFormat(t, level + 1);

      if (isObjectType(t)) {
        return `${indent(level)}* \`object\`: ${content}`
      } else {
        return `${indent(level)}* \`${content}\``;
      }
    }).join('\n');
  } else {
    return type.toString();
  }
}

function indent(num: number): string {
  return num === 0 ? '' : new Array(num * 2).fill(' ').join('');
}
