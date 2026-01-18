/**
 * Test transaction fixtures
 */

import { TransactionInput } from '../../types';

export const validTransactionCA: TransactionInput = {
  transactionId: 'txn_123',
  merchantId: 'merchant_456',
  customerId: 'customer_789',
  destination: {
    country: 'US',
    state: 'CA',
    city: 'Los Angeles',
  },
  items: [
    {
      id: 'item_1',
      category: 'SOFTWARE',
      amount: 100.0,
    },
  ],
  totalAmount: 100.0,
  currency: 'USD',
};

export const validTransactionNY: TransactionInput = {
  transactionId: 'txn_456',
  merchantId: 'merchant_456',
  customerId: 'customer_789',
  destination: {
    country: 'US',
    state: 'NY',
    city: 'New York City',
  },
  items: [
    {
      id: 'item_1',
      category: 'PHYSICAL_GOODS',
      amount: 50.0,
    },
  ],
  totalAmount: 50.0,
  currency: 'USD',
};

export const transactionWithMultipleItems: TransactionInput = {
  transactionId: 'txn_789',
  merchantId: 'merchant_456',
  customerId: 'customer_789',
  destination: {
    country: 'US',
    state: 'CA',
    city: 'Los Angeles',
  },
  items: [
    {
      id: 'item_1',
      category: 'SOFTWARE',
      amount: 100.0,
    },
    {
      id: 'item_2',
      category: 'PHYSICAL_GOODS',
      amount: 50.0,
    },
  ],
  totalAmount: 150.0,
  currency: 'USD',
};

export const transactionWithExemptCustomer: TransactionInput = {
  transactionId: 'txn_exempt',
  merchantId: 'merchant_456',
  customerId: 'customer_wholesale',
  destination: {
    country: 'US',
    state: 'CA',
    city: 'Los Angeles',
  },
  items: [
    {
      id: 'item_1',
      category: 'SOFTWARE',
      amount: 100.0,
    },
  ],
  totalAmount: 100.0,
  currency: 'USD',
};

export const transactionWithExemptItem: TransactionInput = {
  transactionId: 'txn_food',
  merchantId: 'merchant_456',
  customerId: 'customer_789',
  destination: {
    country: 'US',
    state: 'CA',
    city: 'Los Angeles',
  },
  items: [
    {
      id: 'item_1',
      category: 'FOOD',
      amount: 50.0,
    },
  ],
  totalAmount: 50.0,
  currency: 'USD',
};

export const invalidTransactionMissingFields: Partial<TransactionInput> = {
  transactionId: 'txn_invalid',
  // Missing merchantId, customerId, etc.
};

export const invalidTransactionWrongCurrency: TransactionInput = {
  transactionId: 'txn_eur',
  merchantId: 'merchant_456',
  customerId: 'customer_789',
  destination: {
    country: 'US',
    state: 'CA',
    city: 'Los Angeles',
  },
  items: [
    {
      id: 'item_1',
      category: 'SOFTWARE',
      amount: 100.0,
    },
  ],
  totalAmount: 100.0,
  currency: 'EUR', // Invalid currency
};

export const invalidTransactionAmountMismatch: TransactionInput = {
  transactionId: 'txn_mismatch',
  merchantId: 'merchant_456',
  customerId: 'customer_789',
  destination: {
    country: 'US',
    state: 'CA',
    city: 'Los Angeles',
  },
  items: [
    {
      id: 'item_1',
      category: 'SOFTWARE',
      amount: 100.0,
    },
  ],
  totalAmount: 200.0, // Mismatch
  currency: 'USD',
};

export const transactionUnsupportedState: TransactionInput = {
  transactionId: 'txn_unsupported',
  merchantId: 'merchant_456',
  customerId: 'customer_789',
  destination: {
    country: 'US',
    state: 'FL', // Unsupported
    city: 'Miami',
  },
  items: [
    {
      id: 'item_1',
      category: 'SOFTWARE',
      amount: 100.0,
    },
  ],
  totalAmount: 100.0,
  currency: 'USD',
};

export const transactionMerchantBelowThreshold: TransactionInput = {
  transactionId: 'txn_low_merchant',
  merchantId: 'merchant_789', // Below threshold
  customerId: 'customer_789',
  destination: {
    country: 'US',
    state: 'NY',
    city: 'New York City',
  },
  items: [
    {
      id: 'item_1',
      category: 'SOFTWARE',
      amount: 100.0,
    },
  ],
  totalAmount: 100.0,
  currency: 'USD',
};


