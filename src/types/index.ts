/**
 * Type definitions matching Appendix B (Input) and Appendix A (Output)
 */

// ============================================================================
// INPUT TYPES (Appendix B)
// ============================================================================

export interface TransactionInput {
  transactionId: string;
  merchantId: string;
  customerId: string;
  destination: {
    country: string;
    state: string;
    city: string;
  };
  items: Array<{
    id: string;
    category: string;
    amount: number;
  }>;
  totalAmount: number;
  currency: string;
}

// ============================================================================
// OUTPUT TYPES (Appendix A)
// ============================================================================

export type TransactionStatus = 'CALCULATED' | 'FAILED' | 'REJECTED';

export interface GateEntry {
  name: string; // Must match: "ADDRESS_VALIDATION", "APPLICABILITY", "EXEMPTION_CHECK"
  passed: boolean;
  message?: string;
  appliedExemptions?: string[]; // Only present for EXEMPTION_CHECK gate
}

export interface FeeRateBreakdown {
  jurisdiction?: string; // For stateRate, countyRate, cityRate
  category?: string; // For categoryModifier
  rate: number;
  amount: number;
}

export interface ItemFeeCalculation {
  itemId: string;
  amount: number;
  category: string;
  fees: {
    stateRate: FeeRateBreakdown;
    countyRate?: FeeRateBreakdown;
    cityRate?: FeeRateBreakdown;
    categoryModifier: FeeRateBreakdown;
  };
  totalFee: number;
}

export interface CalculationResult {
  items: ItemFeeCalculation[];
  totalFees: number;
  effectiveRate: number; // totalFees / totalAmount
}

export interface ComplianceResponse {
  transactionId: string;
  status: TransactionStatus;
  gates: GateEntry[];
  calculation?: CalculationResult;
  auditTrail: string[];
}

// ============================================================================
// INTERNAL TYPES (Not in API contract)
// ============================================================================

export type ErrorType = 'VALIDATION' | 'DEPENDENCY' | 'SYSTEM';

export interface GateResult {
  gateName: string; // Internal name (e.g., "InputValidation", "AddressValidation")
  passed: boolean;
  message?: string;
  metadata?: Record<string, unknown>;
  errorType?: ErrorType;
}

export interface ExemptionData {
  customerExemptions: string[]; // e.g., ["WHOLESALE"]
  itemExemptions: Map<string, string[]>; // itemId -> exemption reasons
}

export interface MerchantData {
  merchantId: string;
  volumeByState: Map<string, number>; // state -> volume
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface JurisdictionRates {
  stateRate: number;
  countyRate?: number; // Optional, only for specific counties
  cityRate?: number; // Optional, only for specific cities
}


