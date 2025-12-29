import { MAX_RETRIES } from './config';
import { SyncJobPayload, SyncStateRecord, SyncSystem } from './types';
import * as db from '../config/database';

const emptyErrorLog = '[]';

export const ensurePendingState = async (payload: SyncJobPayload): Promise<SyncStateRecord | undefined> => {
  const { entityId, sourceSystem, targetSystem, operationId } = {
    entityId: payload.entityId,
    sourceSystem: payload.sourceSystem,
    targetSystem: payload.targetSystem,
    operationId: payload.operationId
  };

  const result = await db.query(
    `
    INSERT INTO sync_state (entity_id, source_system, target_system, sync_status, last_synced_at, retry_count, error_log, version, operation_id, updated_at)
    VALUES ($1, $2, $3, 'pending', NULL, 0, $4::jsonb, 1, $5, NOW())
    ON CONFLICT (entity_id, source_system, target_system)
    DO UPDATE SET sync_status='pending', operation_id=EXCLUDED.operation_id, updated_at=NOW()
    RETURNING *;
    `,
    [entityId, sourceSystem, targetSystem, emptyErrorLog, operationId]
  );

  return result.rows?.[0];
};

export const markSyncing = async (entityId: string, sourceSystem: SyncSystem, targetSystem: SyncSystem, operationId?: string) => {
  await db.query(
    `
    UPDATE sync_state
    SET sync_status='syncing',
        version = version + 1,
        operation_id = COALESCE($4, operation_id),
        updated_at = NOW()
    WHERE entity_id=$1 AND source_system=$2 AND target_system=$3;
    `,
    [entityId, sourceSystem, targetSystem, operationId || null]
  );
};

export const markSynced = async (entityId: string, sourceSystem: SyncSystem, targetSystem: SyncSystem, operationId?: string) => {
  await db.query(
    `
    UPDATE sync_state
    SET sync_status='synced',
        last_synced_at=NOW(),
        retry_count=0,
        error_log=$4::jsonb,
        version = version + 1,
        operation_id = COALESCE($5, operation_id),
        updated_at = NOW()
    WHERE entity_id=$1 AND source_system=$2 AND target_system=$3;
    `,
    [entityId, sourceSystem, targetSystem, emptyErrorLog, operationId || null]
  );
};

export const recordFailure = async (entityId: string, sourceSystem: SyncSystem, targetSystem: SyncSystem, message: string) => {
  await db.query(
    `
    UPDATE sync_state
    SET retry_count = retry_count + 1,
        sync_status = CASE WHEN retry_count + 1 >= $4 THEN 'failed' ELSE 'pending' END,
        error_log = COALESCE(error_log, '[]'::jsonb) || jsonb_build_array(to_jsonb($5::json)),
        version = version + 1,
        updated_at = NOW()
    WHERE entity_id=$1 AND source_system=$2 AND target_system=$3;
    `,
    [
      entityId,
      sourceSystem,
      targetSystem,
      MAX_RETRIES,
      JSON.stringify({ message, timestamp: new Date().toISOString() })
    ]
  );
};

export const getSyncState = async (entityId: string, sourceSystem: SyncSystem, targetSystem: SyncSystem): Promise<SyncStateRecord | null> => {
  const result = await db.query(
    `
    SELECT * FROM sync_state
    WHERE entity_id=$1 AND source_system=$2 AND target_system=$3
    LIMIT 1;
    `,
    [entityId, sourceSystem, targetSystem]
  );

  return result.rows?.[0] || null;
};

export const recordDeadLetter = async (payload: SyncJobPayload, reason: string) => {
  const { entityId, sourceSystem, targetSystem } = payload;
  await db.query(
    `
    INSERT INTO sync_dead_letters (id, entity_id, source_system, target_system, reason, payload)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb);
    `,
    [
      payload.operationId,
      entityId,
      sourceSystem,
      targetSystem,
      reason,
      JSON.stringify(payload)
    ]
  );
};

export const fetchFieldMappings = async (sourceSystem: SyncSystem, targetSystem: SyncSystem) => {
  const res = await db.query(
    `
    SELECT source_field, target_field, direction, transform
    FROM sync_field_mappings
    WHERE source_system=$1 AND target_system=$2;
    `,
    [sourceSystem, targetSystem]
  );

  return res.rows || [];
};
