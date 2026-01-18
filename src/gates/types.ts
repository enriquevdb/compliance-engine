/**
 * Gate system type definitions
 */

import { GateResult, ErrorType } from '../types';

export interface IGate {
  execute(transaction: unknown, context?: Record<string, unknown>): Promise<GateResult>;
}

export { GateResult, ErrorType };


