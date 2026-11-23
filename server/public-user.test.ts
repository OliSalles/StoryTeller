import { describe, it, expect } from "vitest";
import { toPublicUser } from "./_core/public-user";

describe("toPublicUser", () => {
  it("remove a senha e mantém o resto", () => {
    const u = { id: 1, email: "a@b.com", name: "A", password: "$2a$10$hash", role: "admin" };
    const pub = toPublicUser(u);
    expect(pub).toEqual({ id: 1, email: "a@b.com", name: "A", role: "admin" });
    expect(JSON.stringify(pub)).not.toContain("hash");
    expect(u.password).toBe("$2a$10$hash");
  });
  it("aceita nulo", () => {
    expect(toPublicUser(null)).toBeNull();
  });
});
