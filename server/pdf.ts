import PDFDocument from "pdfkit";
import type { Feature, UserStory, Task, AcceptanceCriterion } from "../drizzle/schema";

interface StoryWithDetails extends UserStory {
  tasks?: Task[];
  acceptanceCriteria?: AcceptanceCriterion[];
}

export async function generateFeaturePdf(
  feature: Feature,
  stories: StoryWithDetails[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Title
      doc.fontSize(24).font("Helvetica-Bold").text(feature.title, { align: "center" });
      doc.moveDown();

      // Description
      doc.fontSize(12).font("Helvetica").text(feature.description || "Sem descrição", {
        align: "justify",
      });
      doc.moveDown(2);

      // Metadata
      doc.fontSize(10).font("Helvetica-Oblique");
      doc.text(`Status: ${feature.status}`, { continued: true });
      doc.text(`  |  Idioma: ${feature.language}`, { continued: true });
      doc.text(`  |  Criado em: ${new Date(feature.createdAt).toLocaleDateString("pt-BR")}`);
      doc.moveDown(2);

      // User Stories
      doc.fontSize(18).font("Helvetica-Bold").text("Histórias de Usuário");
      doc.moveDown();

      stories.forEach((story, index) => {
        // Story header
        doc.fontSize(14).font("Helvetica-Bold");
        doc.text(`${index + 1}. ${story.title}`);
        doc.moveDown(0.5);

        // Story details
        doc.fontSize(10).font("Helvetica");
        doc.text(`Prioridade: ${story.priority}  |  Story Points: ${story.storyPoints || "N/A"}`);
        doc.moveDown(0.5);

        // Description
        doc.fontSize(11).font("Helvetica");
        doc.text(story.description, { align: "justify" });
        doc.moveDown();

        // Acceptance Criteria
        if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
          doc.fontSize(12).font("Helvetica-Bold").text("Critérios de Aceite:");
          doc.fontSize(10).font("Helvetica");
          story.acceptanceCriteria.forEach((criterion) => {
            doc.text(`  • ${criterion.criterion}`, { indent: 20 });
          });
          doc.moveDown();
        }

        // Tasks
        if (story.tasks && story.tasks.length > 0) {
          doc.fontSize(12).font("Helvetica-Bold").text("Tasks Técnicas:");
          doc.fontSize(10).font("Helvetica");
          story.tasks.forEach((task) => {
            doc.text(`  ✓ ${task.title}`, { indent: 20 });
            if (task.description) {
              doc.fontSize(9).text(`    ${task.description}`, { indent: 30 });
            }
            if (task.estimatedHours) {
              doc.fontSize(9).text(`    Estimativa: ${task.estimatedHours}h`, { indent: 30 });
            }
          });
          doc.moveDown();
        }

        doc.moveDown(1.5);

        // Add page break if needed (avoid orphan stories)
        if (doc.y > 650 && index < stories.length - 1) {
          doc.addPage();
        }
      });

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font("Helvetica-Oblique");
        doc.text(
          `Página ${i + 1} de ${pageCount}`,
          50,
          doc.page.height - 50,
          { align: "center" }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
