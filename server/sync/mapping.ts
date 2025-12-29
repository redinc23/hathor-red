import { MappingConfig } from './types';

export const DEFAULT_FIELD_MAPPING: MappingConfig = {
  status: {
    sourceField: 'Status',
    targetField: 'state',
    direction: 'bidirectional'
  },
  title: {
    sourceField: 'Name',
    targetField: 'title',
    direction: 'bidirectional'
  },
  description: {
    sourceField: 'Description',
    targetField: 'description',
    direction: 'bidirectional'
  },
  linkage: {
    sourceField: 'LinearID',
    targetField: 'notionId',
    direction: 'bidirectional'
  }
};

export const buildMappingFromRows = (rows: any[]): MappingConfig => {
  const mapping: MappingConfig = { ...DEFAULT_FIELD_MAPPING };
  rows.forEach((row) => {
    const key = row.source_field.toLowerCase();
    mapping[key] = {
      sourceField: row.source_field,
      targetField: row.target_field,
      direction: row.direction || 'bidirectional'
    };
  });
  return mapping;
};

export const mapNotionToLinear = (properties: any, mapping: MappingConfig = DEFAULT_FIELD_MAPPING) => {
  const map = { ...DEFAULT_FIELD_MAPPING, ...mapping };
  const titleProp = properties?.[map.title?.sourceField];
  const statusProp = properties?.[map.status?.sourceField];
  const descriptionProp = properties?.[map.description?.sourceField];
  const linkageProp = properties?.[map.linkage?.sourceField];

  const title = titleProp?.title?.[0]?.plain_text || titleProp?.rich_text?.[0]?.plain_text;
  const status = statusProp?.select?.name || statusProp?.status?.name;
  const description = (descriptionProp?.rich_text || descriptionProp?.title || [])
    .map((r: any) => r.plain_text || r.text?.content || '')
    .join(' ');
  const linearId = linkageProp?.rich_text?.[0]?.plain_text || linkageProp?.formula?.string;

  return {
    title,
    description,
    state: status,
    linearId
  };
};

export const mapLinearToNotion = (issue: any, mapping: MappingConfig = DEFAULT_FIELD_MAPPING) => {
  const map = { ...DEFAULT_FIELD_MAPPING, ...mapping };
  return {
    [map.title?.sourceField || 'Name']: {
      title: [{ text: { content: issue.title || '' } }]
    },
    [map.status?.sourceField || 'Status']: {
      select: { name: issue.state?.name || issue.state }
    },
    [map.description?.sourceField || 'Description']: {
      rich_text: [{ text: { content: issue.description || '' } }]
    },
    [map.linkage?.sourceField || 'LinearID']: {
      rich_text: [{ text: { content: issue.id } }]
    }
  };
};
