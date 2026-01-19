/**
 * PostgreSQL Database Client
 * Manages connection pool and provides query helpers
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

class DatabaseClient {
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'compliance_engine',
      user: process.env.DB_USER || 'compliance_user',
      password: process.env.DB_PASSWORD || 'compliance_pass',
    };
  }

  /**
   * Initialize the database connection pool
   */
  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    // Test connection
    try {
      await this.pool.query('SELECT NOW()');
      console.log('Database connection established');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      await this.connect();
    }
    return this.pool!.connect();
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      await this.connect();
    }
    return this.pool!.query<T>(text, params);
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('Database connection pool closed');
    }
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.pool !== null;
  }
}

// Singleton instance
export const db = new DatabaseClient();

