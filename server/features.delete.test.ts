import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Feature Deletion", () => {
  let testUserId: number;
  let testFeatureId: number;

  beforeAll(async () => {
    // Get existing owner user
    const ownerOpenId = process.env.OWNER_OPEN_ID || "default-owner";
    const user = await db.getUserByOpenId(ownerOpenId);
    if (!user) {
      throw new Error("Owner user not found");
    }
    testUserId = user.id;

    // Create a test feature
    testFeatureId = await db.createFeature({
      userId: testUserId,
      title: "Test Feature to Delete",
      description: "This feature will be deleted in the test",
      originalPrompt: "Test prompt for deletion test",
      status: "draft",
    });
  });

  it("should delete a feature and its associated stories", async () => {
    // Verify feature exists before deletion
    const featureBefore = await db.getFeatureById(testFeatureId);
    expect(featureBefore).toBeDefined();
    expect(featureBefore?.id).toBe(testFeatureId);

    // Delete the feature
    await db.deleteFeature(testFeatureId);

    // Verify feature no longer exists
    const featureAfter = await db.getFeatureById(testFeatureId);
    expect(featureAfter).toBeUndefined();

    // Verify associated stories were also deleted (cascade)
    const stories = await db.getUserStoriesByFeatureId(testFeatureId);
    expect(stories).toHaveLength(0);
  });

  it("should not throw error when deleting non-existent feature", async () => {
    // Attempt to delete a feature that doesn't exist
    await expect(db.deleteFeature(999999)).resolves.not.toThrow();
  });
});
