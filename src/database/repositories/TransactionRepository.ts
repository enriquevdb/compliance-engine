/**
 * Transaction Repository
 * Handles persistence and retrieval of transactions
 */

import * as transactionQueries from '../queries/transactionQueries';
import { TransactionInput, ComplianceResponse } from '../../types';

export class TransactionRepository {
  /**
   * Save a transaction (input and response)
   */
  async saveTransaction(transaction: TransactionInput, response: ComplianceResponse): Promise<void> {
    await transactionQueries.saveTransaction(transaction, response);
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<{
    transaction: TransactionInput;
    response: ComplianceResponse;
  } | null> {
    return transactionQueries.getTransaction(transactionId);
  }

  /**
   * Get transactions by merchant ID
   */
  async getTransactionsByMerchant(
    merchantId: string,
    limit: number = 100
  ): Promise<Array<{ transaction: TransactionInput; response: ComplianceResponse; createdAt: Date }>> {
    return transactionQueries.getTransactionsByMerchant(merchantId, limit);
  }

  /**
   * Get transactions by date range
   */
  async getTransactionsByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<Array<{ transaction: TransactionInput; response: ComplianceResponse; createdAt: Date }>> {
    return transactionQueries.getTransactionsByDateRange(startDate, endDate, limit);
  }
}

