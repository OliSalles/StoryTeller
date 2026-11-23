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
        // Drizzle wraps pg errors in err.cause
        const pgError = (error as any).cause || error;
        
        // Ignore "already exists" errors (idempotent)
        const isAlreadyExists = 
          pgError.code === '42710' || // duplicate_object (TYPE, FUNCTION)
          pgError.code === '42P07' || // duplicate_table
          pgError.code === '42P06' || // duplicate_schema
          pgError.message?.includes('already exists');

        // Skip vector-specific failures when pgvector is unavailable
        const isVectorUnavailable =
          pgError.message?.includes('type "vector" does not exist') ||
          pgError.message?.includes('extension "vector" is not available') ||
          pgError.message?.includes('could not open extension control file') ||
          (typeof statement === 'string' && statement.includes('vector') && (
            pgError.code === '42704' || // undefined_object
            pgError.code === '0A000' || // feature_not_supported
            pgError.code === '22023'    // invalid_parameter_value (ivfflat needs data)
          ));
        
        if (isAlreadyExists || isVectorUnavailable) {
          skipped++;
          if (isVectorUnavailable) {
            console.warn(`[Auto-Migrate] ⚠️  Skipping vector-dependent statement ${i + 1}`);
          }
          continue;
        }
        
        // Log detailed error for unexpected failures
        console.error(`[Auto-Migrate] ❌ Statement ${i + 1} failed:`, {
          statement: statement.substring(0, 200) + '...',
          code: pgError.code,
          message: pgError.message,
          detail: pgError.detail,
          hint: pgError.hint,
          position: pgError.position,
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

/** Membership mais recente de cada usuário: empresa que herda as configs antigas por usuário */
const HOME_COMPANY_CTE = `home AS (
  SELECT DISTINCT ON (cm.user_id) cm.user_id, cm.company_id
  FROM company_members cm
  ORDER BY cm.user_id, cm.created_at DESC
)`;

/**
 * Azure DevOps passa a pertencer à empresa (idempotente).
 * Configs por usuário (inclusive a tabela legada azure_devops_configs) vão para a empresa do usuário;
 * se a empresa já tiver credenciais, as dela prevalecem.
 */
const AZURE_COMPANY_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS azure_devops_credentials (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    organization varchar(256) NOT NULL,
    pat text NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS azure_devops_projects (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    name varchar(256) NOT NULL,
    default_area varchar(256),
    default_iteration varchar(256),
    default_state varchar(128),
    default_board varchar(256),
    default_column varchar(128),
    default_swimlane varchar(128),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,
  `ALTER TABLE azure_devops_credentials ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE`,
  `ALTER TABLE azure_devops_projects ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id) ON DELETE CASCADE`,
  `ALTER TABLE azure_devops_credentials DROP CONSTRAINT IF EXISTS azure_devops_credentials_user_id_key`,
  `ALTER TABLE azure_devops_credentials DROP CONSTRAINT IF EXISTS azure_devops_credentials_user_id_unique`,
  `WITH ${HOME_COMPANY_CTE},
  ranked AS (
    SELECT c.id, h.company_id,
      row_number() OVER (PARTITION BY h.company_id ORDER BY c.updated_at DESC) AS rn
    FROM azure_devops_credentials c
    JOIN home h ON h.user_id = c.user_id
    WHERE c.company_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM azure_devops_credentials x WHERE x.company_id = h.company_id)
  )
  UPDATE azure_devops_credentials c SET company_id = r.company_id
  FROM ranked r WHERE r.id = c.id AND r.rn = 1`,
  `WITH ${HOME_COMPANY_CTE}
  UPDATE azure_devops_projects p SET company_id = h.company_id
  FROM home h
  WHERE p.user_id = h.user_id AND p.company_id IS NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS azure_devops_credentials_company_uq ON azure_devops_credentials(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_azure_projects_company ON azure_devops_projects(company_id)`,
  `WITH ${HOME_COMPANY_CTE},
  ranked AS (
    SELECT l.*, h.company_id AS target_company,
      row_number() OVER (PARTITION BY h.company_id ORDER BY l.updated_at DESC) AS rn
    FROM azure_devops_configs l
    JOIN home h ON h.user_id = l.user_id
  )
  INSERT INTO azure_devops_credentials (user_id, company_id, organization, pat)
  SELECT r.user_id, r.target_company, r.organization, r.pat FROM ranked r
  WHERE r.rn = 1
    AND NOT EXISTS (SELECT 1 FROM azure_devops_credentials x WHERE x.company_id = r.target_company)`,
  `WITH ${HOME_COMPANY_CTE}
  INSERT INTO azure_devops_projects
    (user_id, company_id, name, default_area, default_iteration, default_state, default_board, default_column, default_swimlane)
  SELECT l.user_id, h.company_id, l.project, l.default_area, l.default_iteration, l.default_state,
    l.default_board, l.default_column, l.default_swimlane
  FROM azure_devops_configs l
  JOIN home h ON h.user_id = l.user_id
  JOIN azure_devops_credentials c ON c.company_id = h.company_id AND lower(c.organization) = lower(l.organization)
  WHERE NOT EXISTS (
    SELECT 1 FROM azure_devops_projects p WHERE p.company_id = h.company_id AND lower(p.name) = lower(l.project)
  )`,
];

async function runAzureCompanyMigration(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  for (let i = 0; i < AZURE_COMPANY_STATEMENTS.length; i++) {
    const statement = AZURE_COMPANY_STATEMENTS[i];
    try {
      await db.execute(sql.raw(statement));
    } catch (error: any) {
      const pgError = error.cause || error;
      const missingLegacy = pgError.code === '42P01' && statement.includes('azure_devops_configs');
      if (!missingLegacy) {
        console.warn(`[Auto-Migrate] ⚠️  Azure DevOps statement ${i + 1} failed: ${pgError.message}`);
      }
    }
  }
  console.log('[Auto-Migrate] ✅ Azure DevOps vinculado às empresas');
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
      console.warn('[Auto-Migrate] ⚠️  pgvector not available - embeddings/RAG search will be limited');
      console.warn(`[Auto-Migrate] ⚠️  ${vectorResult.message}: ${vectorResult.error}`);
      console.warn('[Auto-Migrate] ⚠️  Continuing with company/chat tables migration...');
      // Don't abort: companies, teams and chat tables can still be created
    }

    // Step 2: Run knowledge base migration (companies/chat first; vector statements may be skipped)
    const migrationResult = await runKnowledgeBaseMigration();
    
    if (!migrationResult.success) {
      console.error('[Auto-Migrate] ❌ Migration failed:', migrationResult.error);
      console.warn('[Auto-Migrate] ⚠️  Knowledge base features may not work properly');
      // Don't crash the app - existing features should work
      return;
    }

    await runAzureCompanyMigration();

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
