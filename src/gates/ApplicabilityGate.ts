/**
 * Applicability Gate
 * Checks merchant volume thresholds to determine if rules apply
 */

import { BaseGate } from './IGate';
import { GateResult } from './types';
import { TransactionInput } from '../types';
import { getMerchantVolume, getMerchantThreshold } from '../database/queries/configQueries';

export class ApplicabilityGate extends BaseGate {
  protected getGateName(): string {
    return 'Applicability';
  }

  async execute(transaction: TransactionInput, _context?: Record<string, unknown>): Promise<GateResult> {
    const { merchantId } = transaction;
    const { state } = transaction.destination;

    const volume = await getMerchantVolume(merchantId, state);
    const threshold = await getMerchantThreshold(merchantId, state);
    const meetsThreshold = volume >= threshold;

    if (meetsThreshold) {
      return this.createPassResult(
        `Merchant above $${threshold.toLocaleString()} threshold in ${state}`,
        {
          merchantId,
          state,
          volume,
          threshold,
        }
      );
    } else {
      return this.createFailResult(
        `Merchant volume ($${volume.toLocaleString()}) below threshold ($${threshold.toLocaleString()}) in ${state}`,
        'VALIDATION',
        {
          merchantId,
          state,
          volume,
          threshold,
        }
      );
    }
  }
}


