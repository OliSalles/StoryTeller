/**
 * Script to run SQL migrations manually
 * Usage: node scripts/run-migration.js <migration-file>
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

async function runMigration(migrationFile) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    
    console.log(`📄 Reading migration file: ${migrationFile}`);
    const migrationPath = join(__dirname, '..', migrationFile);
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('🚀 Running migration...');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    client.release();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Usage: node scripts/run-migration.js <migration-file>');
  console.error('   Example: node scripts/run-migration.js drizzle/migrations/001_add_knowledge_base_and_multitenant.sql');
  process.exit(1);
}

runMigration(migrationFile);
