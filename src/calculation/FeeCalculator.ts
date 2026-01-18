/**
 * Fee Calculator
 * Applies rates and calculates fees per item
 * Consumes exemption data (does not check exemptions itself)
 * Handles precision/rounding to ensure sum(item fees) = total
 */

import Decimal from 'decimal.js';
import { RateTable } from './RateTable';
import { TransactionInput, ExemptionData, ItemFeeCalculation, FeeRateBreakdown } from '../types';

export class FeeCalculator {
  private rateTable: RateTable;

  constructor(rateTable?: RateTable) {
    this.rateTable = rateTable || RateTable.getInstance();
  }

  /**
   * Calculate fees for all items
   */
  calculateFees(
    transaction: TransactionInput,
    exemptionData: ExemptionData
  ): {
    items: ItemFeeCalculation[];
    totalFees: number;
    effectiveRate: number;
    auditTrail: string[];
  } {
    const { items, destination, totalAmount } = transaction;
    const { state, city } = destination;
    const auditTrail: string[] = [];

    const itemCalculations: ItemFeeCalculation[] = [];
    let totalFees = new Decimal(0);

    // Check if customer is fully exempt
    const isCustomerFullyExempt = exemptionData.customerExemptions.length > 0;

    for (const item of items) {
      // Check if item is exempt
      const itemExemptions = exemptionData.itemExemptions.get(item.id) || [];
      const isItemExempt = itemExemptions.length > 0 || isCustomerFullyExempt;

      if (isItemExempt) {
        // Exempt item - no fees
        itemCalculations.push({
          itemId: item.id,
          amount: item.amount,
          category: item.category,
          fees: {
            stateRate: { rate: 0, amount: 0 },
            categoryModifier: { category: item.category, rate: 0, amount: 0 },
          },
          totalFee: 0,
        });
        auditTrail.push(`Item ${item.id} (${item.category}) exempt - no fees applied`);
        continue;
      }

      // Calculate fees for non-exempt item
      const itemCalculation = this.calculateItemFees(item, state, city);
      itemCalculations.push(itemCalculation);
      totalFees = totalFees.plus(new Decimal(itemCalculation.totalFee));

      // Add to audit trail
      if (itemCalculation.fees.stateRate.amount > 0) {
        auditTrail.push(
          `Applied ${state} state rate: ${(itemCalculation.fees.stateRate.rate * 100).toFixed(2)}%`
        );
      }
      if (itemCalculation.fees.countyRate && itemCalculation.fees.countyRate.amount > 0) {
        auditTrail.push(
          `Applied ${itemCalculation.fees.countyRate.jurisdiction} county rate: ${(itemCalculation.fees.countyRate.rate * 100).toFixed(2)}%`
        );
      }
      if (itemCalculation.fees.cityRate && itemCalculation.fees.cityRate.amount > 0) {
        auditTrail.push(
          `Applied ${itemCalculation.fees.cityRate.jurisdiction} city rate: ${(itemCalculation.fees.cityRate.rate * 100).toFixed(2)}%`
        );
      }
      if (itemCalculation.fees.categoryModifier.amount > 0) {
        auditTrail.push(
          `Applied ${item.category} category modifier: ${(itemCalculation.fees.categoryModifier.rate * 100).toFixed(2)}%`
        );
      }
    }

    // Round total to 2 decimal places
    const totalFeesRounded = parseFloat(totalFees.toFixed(2));
    const effectiveRate = totalAmount > 0 ? totalFeesRounded / totalAmount : 0;

    // Precision check: ensure sum of item fees equals total (within tolerance)
    const itemFeesSum = itemCalculations.reduce((sum, item) => sum + item.totalFee, 0);
    const tolerance = 0.01;
    if (Math.abs(itemFeesSum - totalFeesRounded) > tolerance) {
      // Adjust last item to match total (distribute rounding error)
      const difference = totalFeesRounded - itemFeesSum;
      if (itemCalculations.length > 0) {
        const lastItem = itemCalculations[itemCalculations.length - 1];
        lastItem.totalFee = parseFloat((lastItem.totalFee + difference).toFixed(2));
      }
    }

    return {
      items: itemCalculations,
      totalFees: totalFeesRounded,
      effectiveRate: parseFloat(effectiveRate.toFixed(4)), // 4 decimal places for rate
      auditTrail,
    };
  }

  /**
   * Calculate fees for a single item
   */
  private calculateItemFees(
    item: { id: string; category: string; amount: number },
    state: string,
    city: string
  ): ItemFeeCalculation {
    const itemAmount = new Decimal(item.amount);

    // State rate
    const stateRate = this.rateTable.getStateRate(state);
    const stateFee = itemAmount.times(stateRate);
    const stateRateBreakdown: FeeRateBreakdown = {
      jurisdiction: state,
      rate: stateRate,
      amount: parseFloat(stateFee.toFixed(2)),
    };

    // County rate (if applicable)
    const countyRate = this.rateTable.getCountyRate(state, city);
    let countyRateBreakdown: FeeRateBreakdown | undefined;
    if (countyRate !== undefined) {
      const countyFee = itemAmount.times(countyRate);
      const countyName = this.getCountyName(city);
      countyRateBreakdown = {
        jurisdiction: countyName,
        rate: countyRate,
        amount: parseFloat(countyFee.toFixed(2)),
      };
    }

    // City rate (if applicable)
    const cityRate = this.rateTable.getCityRate(state, city);
    let cityRateBreakdown: FeeRateBreakdown | undefined;
    if (cityRate !== undefined) {
      const cityFee = itemAmount.times(cityRate);
      cityRateBreakdown = {
        jurisdiction: city,
        rate: cityRate,
        amount: parseFloat(cityFee.toFixed(2)),
      };
    }

    // Category modifier
    const categoryModifierRate = this.rateTable.getCategoryModifier(item.category);
    const categoryModifierFee = itemAmount.times(categoryModifierRate);
    const categoryModifierBreakdown: FeeRateBreakdown = {
      category: item.category,
      rate: categoryModifierRate,
      amount: parseFloat(categoryModifierFee.toFixed(2)),
    };

    // Calculate total fee for this item
    let itemTotalFee = stateFee;
    if (countyRateBreakdown) {
      itemTotalFee = itemTotalFee.plus(new Decimal(countyRateBreakdown.amount));
    }
    if (cityRateBreakdown) {
      itemTotalFee = itemTotalFee.plus(new Decimal(cityRateBreakdown.amount));
    }
    itemTotalFee = itemTotalFee.plus(categoryModifierFee);

    const fees: ItemFeeCalculation['fees'] = {
      stateRate: stateRateBreakdown,
      categoryModifier: categoryModifierBreakdown,
    };

    if (countyRateBreakdown) {
      fees.countyRate = countyRateBreakdown;
    }
    if (cityRateBreakdown) {
      fees.cityRate = cityRateBreakdown;
    }

    return {
      itemId: item.id,
      amount: item.amount,
      category: item.category,
      fees,
      totalFee: parseFloat(itemTotalFee.toFixed(2)),
    };
  }

  /**
   * Get county name for a city
   */
  private getCountyName(city: string): string {
    // Simplified mapping - in real system would be more comprehensive
    if (city === 'Los Angeles') {
      return 'Los Angeles County';
    }
    return `${city} County`; // Fallback
  }
}


