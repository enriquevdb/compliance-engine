/**
 * Request validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types/api';

export function validateComplianceRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const body = req.body;

  // Check if body exists
  if (!body || typeof body !== 'object') {
    const error: ErrorResponse = {
      error: 'Validation error',
      message: 'Request body is required',
    };
    res.status(400).json(error);
    return;
  }

  // If body has 'transaction' field, use it; otherwise use body as transaction
  const transaction = body.transaction || body;

  // Basic validation - library will do detailed validation
  if (!transaction.transactionId || typeof transaction.transactionId !== 'string') {
    const error: ErrorResponse = {
      error: 'Validation error',
      message: 'transactionId is required and must be a string',
    };
    res.status(400).json(error);
    return;
  }

  // Attach validated transaction to request for route handler
  (req as any).validatedTransaction = transaction;
  (req as any).context = body.context || {};

  next();
}

