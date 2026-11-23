/**
 * Configurações por empresa guardadas em companies.settings (jsonb).
 *
 * A coluna é opcional: enquanto a migração (scripts/add-company-settings.sql)
 * não for aplicada, a leitura devolve os padrões (tudo desligado) e a escrita
 * falha com uma mensagem clara. Assim o deploy não depende da migração.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db";

export type CompanySettings = {
  /** Seção "Débitos técnicos e propostas de melhoria" nas respostas do chat */
  techDebtSection: boolean;
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = { techDebtSection: false };

/** Chave global para desligar o recurso em todas as empresas */
export function techDebtGloballyDisabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return /^(1|true|yes|sim)$/i.test((env.KNOWLEDGE_TECH_DEBT_DISABLED ?? "").trim());
}

export function parseCompanySettings(raw: unknown): CompanySettings {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return { techDebtSection: obj.techDebtSection === true };
}

export class CompanySettingsUnavailableError extends Error {
  constructor() {
    super("As configurações por empresa ainda não estão disponíveis neste ambiente (migração pendente).");
  }
}

function isMissingColumn(err: unknown): boolean {
  const e = err as { code?: string; message?: string; cause?: { code?: string } };
  return e?.code === "42703" || e?.cause?.code === "42703" || /column .*settings.* does not exist/i.test(e?.message ?? "");
}

/** Evita consultar a coluna a cada mensagem enquanto a migração não foi aplicada */
let missingColumnUntil = 0;

export async function getCompanySettings(
  companyId: number,
  opts: { useCache?: boolean } = {}
): Promise<CompanySettings & { available: boolean }> {
  const db = await getDb();
  if (!db || (opts.useCache && Date.now() < missingColumnUntil)) return { ...DEFAULT_COMPANY_SETTINGS, available: false };
  try {
    const res = await db.execute(sql`SELECT settings FROM companies WHERE id = ${companyId}`);
    const row = (res.rows as any[])[0];
    missingColumnUntil = 0;
    return { ...parseCompanySettings(row?.settings), available: true };
  } catch (err) {
    if (isMissingColumn(err)) missingColumnUntil = Date.now() + 5 * 60 * 1000;
    else console.warn("[CompanySettings] leitura falhou:", err);
    return { ...DEFAULT_COMPANY_SETTINGS, available: false };
  }
}

export async function updateCompanySettings(companyId: number, patch: Partial<CompanySettings>): Promise<CompanySettings> {
  const db = await getDb();
  if (!db) throw new CompanySettingsUnavailableError();
  const clean: Partial<CompanySettings> = {};
  if (typeof patch.techDebtSection === "boolean") clean.techDebtSection = patch.techDebtSection;
  try {
    const res = await db.execute(sql`
      UPDATE companies
      SET settings = COALESCE(settings, '{}'::jsonb) || ${JSON.stringify(clean)}::jsonb, updated_at = NOW()
      WHERE id = ${companyId}
      RETURNING settings
    `);
    missingColumnUntil = 0;
    return parseCompanySettings((res.rows as any[])[0]?.settings);
  } catch (err) {
    if (isMissingColumn(err)) throw new CompanySettingsUnavailableError();
    throw err;
  }
}

/** O recurso está ligado para a empresa (flag da empresa e sem a chave global) */
export async function isTechDebtSectionEnabled(companyId: number): Promise<boolean> {
  if (techDebtGloballyDisabled()) return false;
  const s = await getCompanySettings(companyId, { useCache: true });
  return s.techDebtSection;
}
