/**
 * Exemption Gate
 * Identifies customer-level and item-level exemptions
 * Returns exemption data (does NOT calculate fees)
 */

import { BaseGate } from './IGate';
import { GateResult } from './types';
import { TransactionInput, ExemptionData } from '../types';
import { isCustomerExempt, isItemExempt } from '../config/rules';

export class ExemptionGate extends BaseGate {
  protected getGateName(): string {
    return 'ExemptionCheck';
  }

  async execute(transaction: TransactionInput, context?: Record<string, unknown>): Promise<GateResult> {
    const { customerId, items, destination } = transaction;
    const { state } = destination;

    const exemptionData: ExemptionData = {
      customerExemptions: [],
      itemExemptions: new Map(),
    };

    // Check customer-level exemptions
    // Note: In real system, customer type would come from customer service
    // For now, we'll check if customerId indicates WHOLESALE (simplified)
    const customerType = context?.customerType as string | undefined;
    if (customerType && isCustomerExempt(customerType)) {
      exemptionData.customerExemptions.push(customerType);
    }

    // Check item-level exemptions
    for (const item of items) {
      const itemExemptions: string[] = [];
      
      if (isItemExempt(item.category, state)) {
        itemExemptions.push(`${item.category} exempt in ${state}`);
      }

      if (itemExemptions.length > 0) {
        exemptionData.itemExemptions.set(item.id, itemExemptions);
      }
    }

    // Format exemption list for response
    const appliedExemptions: string[] = [];
    if (exemptionData.customerExemptions.length > 0) {
      appliedExemptions.push(...exemptionData.customerExemptions);
    }
    for (const [itemId, reasons] of exemptionData.itemExemptions.entries()) {
      appliedExemptions.push(...reasons.map((reason) => `${itemId}: ${reason}`));
    }

    return this.createPassResult(
      appliedExemptions.length === 0 ? 'No exemptions applied' : `${appliedExemptions.length} exemption(s) applied`,
      {
        exemptionData, // Internal data structure
        appliedExemptions, // Formatted list for response
      }
    );
  }
}


