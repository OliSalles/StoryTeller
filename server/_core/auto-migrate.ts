/**
 * Auto-migration system for production deployments
 * Runs idempotently at server startup
 * Safe to run multiple times, never drops or alters existing data
 */

import { getDb } from '../db';
import { sql } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MigrationResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Check if pgvector extension is available
 */
async function checkPgVectorAvailability(): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    await db.execute(sql`SELECT 1 FROM pg_available_extensions WHERE name = 'vector'`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Enable pgvector extension (idempotent)
 */
async function enablePgVector(): Promise<MigrationResult> {
  try {
    const isAvailable = await checkPgVectorAvailability();
    
    if (!isAvailable) {
      return {
        success: false,
        message: 'pgvector extension is not available in this database',
        error: 'Install pgvector extension or use pgvector/pgvector Docker image'
      };
    }

    const db = await getDb();
    if (!db) {
      return {
        success: false,
        message: 'Database connection failed',
        error: 'Could not get database instance'
      };
    }
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    console.log('[Auto-Migrate] ✅ pgvector extension enabled');
    
    return {
      success: true,
      message: 'pgvector extension enabled successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to enable pgvector extension',
      error: error.message
    };
  }
}

/**
 * Check if a table exists
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      )
    `);
    return result.rows[0]?.exists === true;
  } catch (error) {
    return false;
  }
}

/**
 * Run the knowledge base migration (idempotent)
 */
async function runKnowledgeBaseMigration(): Promise<MigrationResult> {
  try {
    // Check if migration already applied
    const companiesExists = await tableExists('companies');
    
    if (companiesExists) {
      console.log('[Auto-Migrate] ℹ️  Knowledge base tables already exist, skipping migration');
      return {
        success: true,
        message: 'Migration already applied'
      };
    }

    console.log('[Auto-Migrate] 🔄 Running knowledge base migration...');

    // Read migration file
    const migrationPath = path.join(__dirname, '../../drizzle/migrations/001_add_knowledge_base_and_multitenant.sql');
    console.log(`[Auto-Migrate] Migration file path: ${migrationPath}`);
    
    const migrationSQL = await readFile(migrationPath, 'utf-8');
    console.log(`[Auto-Migrate] Migration SQL loaded (${migrationSQL.length} bytes)`);

    const db = await getDb();
    if (!db) {
      return {
        success: false,
        message: 'Database connection failed',
        error: 'Could not get database instance'
      };
    }
    
    // Split migration into individual statements
    // Remove comments first
    const lines = migrationSQL
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      });
    
    const cleanSQL = lines.join('\n');
    
    // Smart split: handle $$ blocks (PL/pgSQL) and regular statements
    const statements: string[] = [];
    let current = '';
    let inDollarQuote = false;
    
    for (let i = 0; i < cleanSQL.length; i++) {
      const char = cleanSQL[i];
      const next = cleanSQL[i + 1];
      
      // Check for $$ delimiter
      if (char === '$' && next === '$') {
        inDollarQuote = !inDollarQuote;
        current += '$$';
        i++; // Skip next $
        continue;
      }
      
      // Split on semicolon only if not in dollar-quoted block
      if (char === ';' && !inDollarQuote) {
        const stmt = current.trim();
        if (stmt.length > 0) {
          statements.push(stmt);
        }
        current = '';
        continue;
      }
      
      current += char;
    }
    
    // Add last statement if exists
    if (current.trim().length > 0) {
      statements.push(current.trim());
    }
    
    console.log(`[Auto-Migrate] Found ${statements.length} statements to execute`);
    
    let executed = 0;
    let skipped = 0;
    
    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await db.execute(sql.raw(statement));
        executed++;
      } catch (error: any) {
        // Ignore "already exists" errors (idempotent)
        const isAlreadyExists = 
          error.code === '42710' || // duplicate_object (TYPE)
          error.code === '42P07' || // duplicate_table
          error.code === '42710' || // duplicate_function
          error.message?.includes('already exists');
        
        if (isAlreadyExists) {
          skipped++;
          continue;
        }
        
        // Log detailed error for unexpected failures
        console.error(`[Auto-Migrate] ❌ Statement ${i + 1} failed:`, {
          statement: statement.substring(0, 200) + '...',
          code: error.code,
          message: error.message,
          detail: error.detail,
          hint: error.hint,
        });
        
        return {
          success: false,
          message: `Migration failed at statement ${i + 1}`,
          error: `${error.message}${error.detail ? ` - ${error.detail}` : ''}${error.hint ? ` (Hint: ${error.hint})` : ''}`
        };
      }
    }
    
    console.log(`[Auto-Migrate] ✅ Migration completed: ${executed} executed, ${skipped} skipped (already exist)`);

    console.log('[Auto-Migrate] ✅ Knowledge base migration completed');
    
    return {
      success: true,
      message: 'Knowledge base migration completed successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to run knowledge base migration',
      error: error.message
    };
  }
}

/**
 * Main auto-migration function
 * Called at server startup
 */
export async function runAutoMigrations(): Promise<void> {
  console.log('[Auto-Migrate] 🚀 Starting auto-migration process...');

  try {
    // Step 1: Enable pgvector extension
    const vectorResult = await enablePgVector();
    
    if (!vectorResult.success) {
      console.warn('[Auto-Migrate] ⚠️  pgvector not available - Knowledge base features will be disabled');
      console.warn(`[Auto-Migrate] ⚠️  ${vectorResult.message}: ${vectorResult.error}`);
      // Don't crash the app - existing features should work
      return;
    }

    // Step 2: Run knowledge base migration
    const migrationResult = await runKnowledgeBaseMigration();
    
    if (!migrationResult.success) {
      console.error('[Auto-Migrate] ❌ Migration failed:', migrationResult.error);
      console.warn('[Auto-Migrate] ⚠️  Knowledge base features may not work properly');
      // Don't crash the app - existing features should work
      return;
    }

    console.log('[Auto-Migrate] ✅ All migrations completed successfully');
  } catch (error: any) {
    console.error('[Auto-Migrate] ❌ Unexpected error during auto-migration:', error.message);
    console.warn('[Auto-Migrate] ⚠️  Continuing server startup - existing features should work');
    // Don't crash the app
  }
}

/**
 * Check if knowledge base features are available
 */
export async function isKnowledgeBaseAvailable(): Promise<boolean> {
  try {
    const companiesExists = await tableExists('companies');
    const vectorAvailable = await checkPgVectorAvailability();
    return companiesExists && vectorAvailable;
  } catch (error) {
    return false;
  }
}
