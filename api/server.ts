/**
 * HTTP API Server for Compliance Engine
 * Independent wrapper around the ComplianceEngine library
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { validateComplianceRequest } from './middleware/validator';
import complianceRoutes from './routes/compliance';
import { HealthCheckResponse } from './types/api';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const response: HealthCheckResponse = {
    status: 'ok',
    service: 'compliance-engine-api',
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

// API routes
app.use('/api/compliance', validateComplianceRequest, complianceRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('Compliance Engine API Server');
  console.log('='.repeat(50));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API endpoint: http://localhost:${PORT}/api/compliance/calculate`);
  console.log('='.repeat(50));
});

export default app;

