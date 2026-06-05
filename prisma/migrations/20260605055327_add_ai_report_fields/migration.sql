-- AlterTable
ALTER TABLE "ai_reports" ADD COLUMN     "confidenceLevel" TEXT,
ADD COLUMN     "limitations" JSONB;
