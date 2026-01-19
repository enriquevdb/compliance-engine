/**
 * Database Migration Script
 * Runs SQL migration files in order
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

async function runMigrations(): Promise<void> {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'compliance_engine',
    user: process.env.DB_USER || 'compliance_user',
    password: process.env.DB_PASSWORD || 'compliance_pass',
  };

  const pool = new Pool(config);

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✓ Connected to database');

    // Migration files in order
    const migrations = [
      '001_initial_schema.sql',
      '002_seed_data.sql',
    ];

    for (const migrationFile of migrations) {
      const migrationPath = join(__dirname, 'migrations', migrationFile);
      console.log(`\nRunning migration: ${migrationFile}...`);

      try {
        const sql = readFileSync(migrationPath, 'utf-8');
        await pool.query(sql);
        console.log(`✓ Completed: ${migrationFile}`);
      } catch (error) {
        console.error(`✗ Failed to run ${migrationFile}:`, error);
        throw error;
      }
    }

    console.log('\n✓ All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

