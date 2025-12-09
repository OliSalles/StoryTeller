import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("config.llm", () => {
  it("should save and retrieve LLM configuration", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Save LLM config
    const savedConfig = await caller.config.llm.save({
      provider: "openai",
      model: "gpt-4",
      temperature: "0.7",
      maxTokens: 2000,
    });

    expect(savedConfig).toBeDefined();
    expect(savedConfig?.provider).toBe("openai");
    expect(savedConfig?.model).toBe("gpt-4");

    // Retrieve LLM config
    const retrievedConfig = await caller.config.llm.get();
    expect(retrievedConfig).toBeDefined();
    expect(retrievedConfig?.userId).toBe(ctx.user.id);
    expect(retrievedConfig?.provider).toBe("openai");
  });
});

describe("config.jira", () => {
  it("should save and retrieve Jira configuration", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Save Jira config
    const savedConfig = await caller.config.jira.save({
      jiraUrl: "https://test.atlassian.net",
      email: "test@example.com",
      apiToken: "test-token",
      defaultProject: "TEST",
    });

    expect(savedConfig).toBeDefined();
    expect(savedConfig?.jiraUrl).toBe("https://test.atlassian.net");
    expect(savedConfig?.defaultProject).toBe("TEST");

    // Retrieve Jira config
    const retrievedConfig = await caller.config.jira.get();
    expect(retrievedConfig).toBeDefined();
    expect(retrievedConfig?.userId).toBe(ctx.user.id);
    expect(retrievedConfig?.email).toBe("test@example.com");
  });
});
