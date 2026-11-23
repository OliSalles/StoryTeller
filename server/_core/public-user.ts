/**
 * Versão segura do usuário para enviar ao cliente: nunca inclui a senha (hash) nem campos sensíveis.
 * Use sempre que um objeto de usuário for devolvido por uma rota.
 */
const SENSITIVE_USER_FIELDS = ["password", "passwordHash", "password_hash", "resetToken", "resetTokenExpiry"] as const;

export type PublicUser<T> = Omit<T, (typeof SENSITIVE_USER_FIELDS)[number]>;

export function toPublicUser<T extends Record<string, any>>(user: T): PublicUser<T>;
export function toPublicUser<T extends Record<string, any>>(user: T | null | undefined): PublicUser<T> | null;
export function toPublicUser<T extends Record<string, any>>(user: T | null | undefined): PublicUser<T> | null {
  if (!user) return null;
  const copy: Record<string, any> = { ...user };
  for (const field of SENSITIVE_USER_FIELDS) delete copy[field];
  return copy as PublicUser<T>;
}
