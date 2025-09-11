-- CreateEnum
CREATE TYPE "public"."ModelType" AS ENUM ('TEXT', 'IMAGE_GENERATION', 'IMAGE_ANALYSIS', 'VIDEO_GENERATION', 'VIDEO_ANALYSIS', 'AUDIO_GENERATION', 'AUDIO_TRANSCRIPTION', 'EMBEDDING', 'CODE_GENERATION', 'MULTIMODAL');

-- AlterTable
ALTER TABLE "public"."conversations" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isStarred" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."ai_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelType" "public"."ModelType" NOT NULL DEFAULT 'TEXT',
    "category" TEXT,
    "apiEndpoint" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiKeyName" TEXT NOT NULL DEFAULT 'Authorization',
    "headers" JSONB,
    "requestFormat" JSONB,
    "responseFormat" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "maxTokens" INTEGER,
    "supportedFeatures" JSONB,
    "rateLimit" JSONB,
    "cost" JSONB,
    "description" TEXT,
    "version" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_models_modelType_isActive_idx" ON "public"."ai_models"("modelType", "isActive");

-- CreateIndex
CREATE INDEX "ai_models_provider_isActive_idx" ON "public"."ai_models"("provider", "isActive");

-- CreateIndex
CREATE INDEX "ai_models_isDefault_isActive_idx" ON "public"."ai_models"("isDefault", "isActive");

-- CreateIndex
CREATE INDEX "ai_models_priority_idx" ON "public"."ai_models"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_provider_name_key" ON "public"."ai_models"("provider", "name");

-- CreateIndex
CREATE INDEX "conversations_userId_isStarred_idx" ON "public"."conversations"("userId", "isStarred");

-- CreateIndex
CREATE INDEX "conversations_userId_isDeleted_idx" ON "public"."conversations"("userId", "isDeleted");
