/**
 * Applicability Gate
 * Checks merchant volume thresholds to determine if rules apply
 */

import { BaseGate } from './IGate';
import { GateResult } from './types';
import { TransactionInput } from '../types';
import { merchantMeetsThreshold, getMerchantVolume, MERCHANT_THRESHOLD } from '../config/rules';

export class ApplicabilityGate extends BaseGate {
  protected getGateName(): string {
    return 'Applicability';
  }

  async execute(transaction: TransactionInput, _context?: Record<string, unknown>): Promise<GateResult> {
    const { merchantId } = transaction;
    const { state } = transaction.destination;

    const volume = getMerchantVolume(merchantId, state);
    const meetsThreshold = merchantMeetsThreshold(merchantId, state);

    if (meetsThreshold) {
      return this.createPassResult(
        `Merchant above $100K threshold in ${state}`,
        {
          merchantId,
          state,
          volume,
          threshold: MERCHANT_THRESHOLD,
        }
      );
    } else {
      return this.createFailResult(
        `Merchant volume ($${volume.toLocaleString()}) below threshold ($${MERCHANT_THRESHOLD.toLocaleString()}) in ${state}`,
        'VALIDATION',
        {
          merchantId,
          state,
          volume,
          threshold: MERCHANT_THRESHOLD,
        }
      );
    }
  }
}


