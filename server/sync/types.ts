export type SyncSystem = 'notion' | 'linear';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncStateRecord {
  entity_id: string;
  source_system: SyncSystem;
  target_system: SyncSystem;
  last_synced_at: Date | null;
  sync_status: SyncStatus;
  retry_count: number;
  error_log: any;
  version: number;
  operation_id?: string | null;
  updated_at?: Date;
}

export interface SyncJobPayload {
  operationId: string;
  entityId: string;
  sourceSystem: SyncSystem;
  targetSystem: SyncSystem;
  sourceRecordId: string;
  targetRecordId?: string;
  updatedAt?: string;
  fields?: Record<string, any>;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  direction: 'notion-to-linear' | 'linear-to-notion' | 'bidirectional';
  transform?: (value: any) => any;
}

export interface MappingConfig {
  [key: string]: FieldMapping;
}
