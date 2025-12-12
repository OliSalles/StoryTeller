import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./_core/trpc";
import * as db from "./db";

describe("features.exportToPdf", () => {
  let testFeatureId: number;
  const testUserId = 1; // Owner user ID

  beforeAll(async () => {
    // Create a test feature with user stories
    testFeatureId = await db.createFeature({
      userId: testUserId,
      title: "Test Feature for PDF Export",
      description: "This is a test feature to validate PDF export functionality",
      status: "draft",
      language: "pt",
      original_prompt: "Test prompt for PDF export",
    });

    // Create user stories
    const storyId1 = await db.createUserStory({
      featureId: testFeatureId,
      title: "User Story 1",
      description: "As a user, I want to test PDF export",
      priority: "high",
      storyPoints: 3,
      orderIndex: 0,
    });

    const storyId2 = await db.createUserStory({
      featureId: testFeatureId,
      title: "User Story 2",
      description: "As a developer, I want to validate PDF generation",
      priority: "medium",
      storyPoints: 5,
      orderIndex: 1,
    });

    // Add acceptance criteria
    await db.createAcceptanceCriterion({
      userStoryId: storyId1,
      criterion: "PDF should contain feature title",
      orderIndex: 0,
    });

    await db.createAcceptanceCriterion({
      userStoryId: storyId1,
      criterion: "PDF should contain all user stories",
      orderIndex: 1,
    });

    // Add tasks
    await db.createTask({
      userStoryId: storyId2,
      title: "Implement PDF generation",
      description: "Create PDF generation module using pdfkit",
      estimatedHours: 4,
      orderIndex: 0,
    });
  });

  it("should export feature to PDF successfully", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: "test-open-id", name: "Test User", role: "user" },
    });

    const result = await caller.features.exportToPdf({ featureId: testFeatureId });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.pdfBase64).toBeDefined();
    expect(typeof result.pdfBase64).toBe("string");
    expect(result.pdfBase64.length).toBeGreaterThan(0);
    expect(result.filename).toBeDefined();
    expect(result.filename).toContain("feature-");
    expect(result.filename).toContain(".pdf");
  });

  it("should throw error for non-existent feature", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: "test-open-id", name: "Test User", role: "user" },
    });

    await expect(
      caller.features.exportToPdf({ featureId: 999999 })
    ).rejects.toThrow("Feature not found");
  });

  it("should generate valid PDF buffer", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: "test-open-id", name: "Test User", role: "user" },
    });

    const result = await caller.features.exportToPdf({ featureId: testFeatureId });

    // Decode base64 to buffer
    const pdfBuffer = Buffer.from(result.pdfBase64, "base64");

    // Check PDF magic number (PDF files start with %PDF-)
    const pdfHeader = pdfBuffer.slice(0, 5).toString();
    expect(pdfHeader).toBe("%PDF-");

    // Check minimum PDF size (should be at least 1KB)
    expect(pdfBuffer.length).toBeGreaterThan(1024);
  });
});
