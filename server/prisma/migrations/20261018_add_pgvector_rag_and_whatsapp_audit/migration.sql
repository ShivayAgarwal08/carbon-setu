-- =========================================================================
-- CARbon Setu (कार्बन सेतु) — Safe pgvector RAG & WhatsApp Audit Migration
-- =========================================================================
-- This migration is strictly ADDITIVE. It introduces:
-- 1. pgvector extension for dense vector similarity search (768 dimensions)
-- 2. "SchemeDocument": Stores ingested official government guidelines & provenance
-- 3. "SchemeDocumentChunk": Stores section-level chunks, keywords, & vector embeddings
-- 4. HNSW vector cosine distance index for sub-millisecond similarity search
-- 5. "WhatsAppMessageAudit": Durable persistent idempotency tracking for WhatsApp
--
-- No existing tables, records, users, or schema definitions are modified or deleted.
-- =========================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Official Scheme Documents with Provenance
CREATE TABLE IF NOT EXISTS "SchemeDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "documentId" TEXT NOT NULL UNIQUE,
  "schemeSlug" TEXT NOT NULL,
  "schemeTitle" TEXT NOT NULL,
  "documentTitle" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "issuingAuthority" TEXT NOT NULL,
  "publicationDate" TEXT,
  "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "rawText" TEXT,
  "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SchemeDocument_schemeSlug_idx" ON "SchemeDocument"("schemeSlug");
CREATE INDEX IF NOT EXISTS "SchemeDocument_verificationStatus_idx" ON "SchemeDocument"("verificationStatus");

-- 3. Document Chunks with Vector Embeddings (768-dim from text-embedding-004)
CREATE TABLE IF NOT EXISTS "SchemeDocumentChunk" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "documentId" TEXT NOT NULL REFERENCES "SchemeDocument"("id") ON DELETE CASCADE,
  "chunkIndex" INTEGER NOT NULL,
  "sectionTitle" TEXT,
  "pageNumber" INTEGER,
  "content" TEXT NOT NULL,
  "keywords" TEXT[] NOT NULL DEFAULT '{}',
  "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-004',
  "embedding" vector(768),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SchemeDocumentChunk_documentId_idx" ON "SchemeDocumentChunk"("documentId");
CREATE INDEX IF NOT EXISTS "SchemeDocumentChunk_embeddingModel_idx" ON "SchemeDocumentChunk"("embeddingModel");

-- 4. HNSW Vector Index for Cosine Distance Search
CREATE INDEX IF NOT EXISTS "SchemeDocumentChunk_embedding_hnsw_idx" 
ON "SchemeDocumentChunk" USING hnsw ("embedding" vector_cosine_ops);

-- 5. Durable WhatsApp Message Audit & Idempotency Store
CREATE TABLE IF NOT EXISTS "WhatsAppMessageAudit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "messageId" TEXT NOT NULL UNIQUE,
  "senderPhone" TEXT NOT NULL,
  "messageType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'PROCESSED',
  "replyText" TEXT
);

CREATE INDEX IF NOT EXISTS "WhatsAppMessageAudit_messageId_idx" ON "WhatsAppMessageAudit"("messageId");
CREATE INDEX IF NOT EXISTS "WhatsAppMessageAudit_processedAt_idx" ON "WhatsAppMessageAudit"("processedAt");
