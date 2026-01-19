/**
 * Audit Repository
 * Handles persistence and retrieval of audit trails
 */

import * as auditQueries from '../queries/auditQueries';

export class AuditRepository {
  /**
   * Save audit trail for a transaction
   */
  async saveAuditTrail(
    transactionId: string,
    auditEntries: string[],
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await auditQueries.saveAuditTrail(transactionId, auditEntries, metadata);
  }

  /**
   * Get audit trail for a transaction
   */
  async getAuditTrail(transactionId: string): Promise<string[] | null> {
    return auditQueries.getAuditTrail(transactionId);
  }

  /**
   * Get audit trails by date range
   */
  async getAuditTrailsByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<Array<{ transactionId: string; auditEntries: string[]; createdAt: Date }>> {
    return auditQueries.getAuditTrailsByDateRange(startDate, endDate, limit);
  }
}

