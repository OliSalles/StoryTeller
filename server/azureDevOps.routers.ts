import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

/**
 * Azure DevOps router for exporting features
 */
export const azureDevOpsRouter = router({
  exportFeature: protectedProcedure
    .input(
      z.object({
        featureId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get Azure DevOps config
      const azureConfig = await db.getAzureDevOpsConfigByUserId(ctx.user.id);
      if (!azureConfig) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Configuração do Azure DevOps não encontrada. Configure primeiro em Config. Azure DevOps.",
        });
      }

      // Get feature and user stories
      const feature = await db.getFeatureById(input.featureId);
      if (!feature) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature não encontrada",
        });
      }

      const userStories = await db.getUserStoriesByFeatureId(input.featureId);

      // Create Epic (Feature) in Azure DevOps
      const epicPayload = {
        op: "add",
        path: "/fields/System.Title",
        value: feature.title,
      };

      const epicDescriptionPayload = {
        op: "add",
        path: "/fields/System.Description",
        value: feature.description,
      };

      const epicPayloads = [epicPayload, epicDescriptionPayload];

      // Add optional fields if configured
      if (azureConfig.defaultArea) {
        epicPayloads.push({
          op: "add",
          path: "/fields/System.AreaPath",
          value: `${azureConfig.project}\\${azureConfig.defaultArea}`,
        });
      }

      if (azureConfig.defaultIteration) {
        epicPayloads.push({
          op: "add",
          path: "/fields/System.IterationPath",
          value: `${azureConfig.project}\\${azureConfig.defaultIteration}`,
        });
      }

      if (azureConfig.defaultState) {
        epicPayloads.push({
          op: "add",
          path: "/fields/System.State",
          value: azureConfig.defaultState,
        });
      }

      try {
        // Create Epic
        const epicResponse = await fetch(
          `https://dev.azure.com/${azureConfig.organization}/${azureConfig.project}/_apis/wit/workitems/$Epic?api-version=7.0`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json-patch+json",
              Authorization: `Basic ${Buffer.from(`:${azureConfig.pat}`).toString("base64")}`,
            },
            body: JSON.stringify(epicPayloads),
          }
        );

        if (!epicResponse.ok) {
          const errorText = await epicResponse.text();
          throw new Error(`Failed to create Epic: ${epicResponse.status} - ${errorText}`);
        }

        const epicData = await epicResponse.json();
        const epicId = epicData.id;

        // Update feature with Azure DevOps work item ID
        await db.updateFeature(input.featureId, {
          azureDevOpsWorkItemId: epicId,
          exportTarget: "azure_devops",
          status: "exported",
        });

        // Create User Stories
        for (const story of userStories) {
          const storyPayloads = [
            {
              op: "add",
              path: "/fields/System.Title",
              value: story.title,
            },
            {
              op: "add",
              path: "/fields/System.Description",
              value: story.description,
            },
            {
              op: "add",
              path: "/fields/System.Parent",
              value: epicId,
            },
          ];

          // Add priority mapping
          const priorityMap: Record<string, number> = {
            low: 4,
            medium: 3,
            high: 2,
            critical: 1,
          };

          storyPayloads.push({
            op: "add",
            path: "/fields/Microsoft.VSTS.Common.Priority",
            value: priorityMap[story.priority] || 3,
          });

          // Add story points if available
          if (story.storyPoints) {
            storyPayloads.push({
              op: "add",
              path: "/fields/Microsoft.VSTS.Scheduling.StoryPoints",
              value: story.storyPoints,
            });
          }

          // Add optional fields
          if (azureConfig.defaultArea) {
            storyPayloads.push({
              op: "add",
              path: "/fields/System.AreaPath",
              value: `${azureConfig.project}\\${azureConfig.defaultArea}`,
            });
          }

          if (azureConfig.defaultIteration) {
            storyPayloads.push({
              op: "add",
              path: "/fields/System.IterationPath",
              value: `${azureConfig.project}\\${azureConfig.defaultIteration}`,
            });
          }

          if (azureConfig.defaultState) {
            storyPayloads.push({
              op: "add",
              path: "/fields/System.State",
              value: azureConfig.defaultState,
            });
          }

          // Get acceptance criteria for this story
          const acceptanceCriteria = await db.getAcceptanceCriteriaByStoryId(story.id);
          if (acceptanceCriteria.length > 0) {
            const criteriaText = acceptanceCriteria
              .map((c, idx) => `${idx + 1}. ${c.criterion}`)
              .join("\n");
            storyPayloads.push({
              op: "add",
              path: "/fields/Microsoft.VSTS.Common.AcceptanceCriteria",
              value: criteriaText,
            });
          }

          const storyResponse = await fetch(
            `https://dev.azure.com/${azureConfig.organization}/${azureConfig.project}/_apis/wit/workitems/$User Story?api-version=7.0`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json-patch+json",
                Authorization: `Basic ${Buffer.from(`:${azureConfig.pat}`).toString("base64")}`,
              },
              body: JSON.stringify(storyPayloads),
            }
          );

          if (!storyResponse.ok) {
            console.error(`Failed to create story: ${story.title}`);
            continue;
          }

          const storyData = await storyResponse.json();
          await db.updateUserStory(story.id, {
            azureDevOpsWorkItemId: storyData.id,
          });
        }

        return {
          success: true,
          epicId,
          epicUrl: `https://dev.azure.com/${azureConfig.organization}/${azureConfig.project}/_workitems/edit/${epicId}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Erro ao exportar para Azure DevOps",
        });
      }
    }),
});
