/**
 * Compliance calculation routes
 */

import { Router, Request, Response } from 'express';
import { ComplianceEngine } from '../../src/ComplianceEngine';
import { TransactionInput } from '../../src/types';
import { ErrorResponse } from '../types/api';

const router = Router();
const complianceEngine = new ComplianceEngine();

/**
 * POST /api/compliance/calculate
 * Calculate compliance fees for a transaction
 */
router.post('/calculate', async (req: Request, res: Response): Promise<void> => {
  try {
    const transaction = (req as any).validatedTransaction as TransactionInput;
    const context = (req as any).context as Record<string, unknown>;

    // Process transaction through compliance engine
    const response = await complianceEngine.process(transaction, context);

    // Return response (matches Appendix A format)
    res.status(200).json(response);
  } catch (error) {
    console.error('Error processing compliance calculation:', error);

    const errorResponse: ErrorResponse = {
      error: 'Processing error',
      message: error instanceof Error ? error.message : 'Failed to process transaction',
    };

    res.status(500).json(errorResponse);
  }
});

export default router;

