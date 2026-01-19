/**
 * Transaction queries
 * Insert and query transaction data
 */

import { db } from '../client';
import { TransactionInput, ComplianceResponse } from '../../types';

/**
 * Save a transaction (input and response)
 */
export async function saveTransaction(
  transaction: TransactionInput,
  response: ComplianceResponse
): Promise<void> {
  await db.transaction(async (client) => {
    // Insert main transaction record
    await client.query(
      `INSERT INTO transactions (
        transaction_id, merchant_id, customer_id,
        destination_country, destination_state, destination_city,
        total_amount, currency, status,
        transaction_input, transaction_response
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (transaction_id) DO UPDATE SET
        status = EXCLUDED.status,
        transaction_response = EXCLUDED.transaction_response,
        updated_at = CURRENT_TIMESTAMP`,
      [
        transaction.transactionId,
        transaction.merchantId,
        transaction.customerId,
        transaction.destination.country,
        transaction.destination.state,
        transaction.destination.city,
        transaction.totalAmount,
        transaction.currency,
        response.status,
        JSON.stringify(transaction),
        JSON.stringify(response),
      ]
    );

    // Delete existing transaction items (for updates)
    await client.query(`DELETE FROM transaction_items WHERE transaction_id = $1`, [
      transaction.transactionId,
    ]);

    // Insert transaction items
    for (const item of transaction.items) {
      await client.query(
        `INSERT INTO transaction_items (transaction_id, item_id, category, amount)
         VALUES ($1, $2, $3, $4)`,
        [transaction.transactionId, item.id, item.category, item.amount]
      );
    }
  });
}

/**
 * Get transaction by ID
 */
export async function getTransaction(transactionId: string): Promise<{
  transaction: TransactionInput;
  response: ComplianceResponse;
} | null> {
  const result = await db.query<{
    transaction_input: string;
    transaction_response: string;
  }>(`SELECT transaction_input, transaction_response FROM transactions WHERE transaction_id = $1`, [
    transactionId,
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  return {
    transaction: JSON.parse(result.rows[0].transaction_input) as TransactionInput,
    response: JSON.parse(result.rows[0].transaction_response) as ComplianceResponse,
  };
}

/**
 * Get transactions by merchant ID
 */
export async function getTransactionsByMerchant(
  merchantId: string,
  limit: number = 100
): Promise<Array<{ transaction: TransactionInput; response: ComplianceResponse; createdAt: Date }>> {
  const result = await db.query<{
    transaction_input: string;
    transaction_response: string;
    created_at: Date;
  }>(
    `SELECT transaction_input, transaction_response, created_at
     FROM transactions
     WHERE merchant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [merchantId, limit]
  );

  return result.rows.map((row) => ({
    transaction: JSON.parse(row.transaction_input) as TransactionInput,
    response: JSON.parse(row.transaction_response) as ComplianceResponse,
    createdAt: row.created_at,
  }));
}

/**
 * Get transactions by date range
 */
export async function getTransactionsByDateRange(
  startDate: Date,
  endDate: Date,
  limit: number = 100
): Promise<Array<{ transaction: TransactionInput; response: ComplianceResponse; createdAt: Date }>> {
  const result = await db.query<{
    transaction_input: string;
    transaction_response: string;
    created_at: Date;
  }>(
    `SELECT transaction_input, transaction_response, created_at
     FROM transactions
     WHERE created_at BETWEEN $1 AND $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [startDate, endDate, limit]
  );

  return result.rows.map((row) => ({
    transaction: JSON.parse(row.transaction_input) as TransactionInput,
    response: JSON.parse(row.transaction_response) as ComplianceResponse,
    createdAt: row.created_at,
  }));
}

