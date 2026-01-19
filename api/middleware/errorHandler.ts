/**
 * Global error handler middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types/api';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  const errorResponse: ErrorResponse = {
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred',
  };

  // Add details in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.details = {
      stack: err.stack,
      path: req.path,
      method: req.method,
    };
  }

  res.status(500).json(errorResponse);
}

