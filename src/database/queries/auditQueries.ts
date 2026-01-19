/**
 * Audit trail queries
 * Insert and query audit trail data
 */

import { db } from '../client';

/**
 * Save audit trail for a transaction
 */
export async function saveAuditTrail(
  transactionId: string,
  auditEntries: string[],
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.query(
    `INSERT INTO audit_trails (transaction_id, audit_entries, metadata)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [transactionId, JSON.stringify(auditEntries), metadata ? JSON.stringify(metadata) : null]
  );
}

/**
 * Get audit trail for a transaction
 */
export async function getAuditTrail(transactionId: string): Promise<string[] | null> {
  const result = await db.query<{ audit_entries: string }>(
    `SELECT audit_entries FROM audit_trails WHERE transaction_id = $1`,
    [transactionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return JSON.parse(result.rows[0].audit_entries) as string[];
}

/**
 * Get audit trails by date range
 */
export async function getAuditTrailsByDateRange(
  startDate: Date,
  endDate: Date,
  limit: number = 100
): Promise<Array<{ transactionId: string; auditEntries: string[]; createdAt: Date }>> {
  const result = await db.query<{
    transaction_id: string;
    audit_entries: string;
    created_at: Date;
  }>(
    `SELECT transaction_id, audit_entries, created_at
     FROM audit_trails
     WHERE created_at BETWEEN $1 AND $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [startDate, endDate, limit]
  );

  return result.rows.map((row) => ({
    transactionId: row.transaction_id,
    auditEntries: JSON.parse(row.audit_entries) as string[],
    createdAt: row.created_at,
  }));
}

