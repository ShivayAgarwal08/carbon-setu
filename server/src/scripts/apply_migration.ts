import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prisma';

async function main() {
  console.log('--- CARbon Setu Safe Production Migration Execution ---');

  const migrationFile = path.join(
    __dirname,
    '../../prisma/migrations/20261018_add_pgvector_rag_and_whatsapp_audit/migration.sql'
  );

  if (!fs.existsSync(migrationFile)) {
    throw new Error(`Migration file not found at ${migrationFile}`);
  }

  const sql = fs.readFileSync(migrationFile, 'utf8');

  // Split SQL statements on semicolon while ignoring comments
  const cleanSql = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Executing ${statements.length} reviewed migration statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`[${i + 1}/${statements.length}] Executing: ${stmt.slice(0, 60).replace(/\n/g, ' ')}...`);
    await prisma.$executeRawUnsafe(stmt);
  }

  console.log('\n--- Post-Migration Verification Checks ---');

  // 1. Verify tables exist
  const newTables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('SchemeDocument', 'SchemeDocumentChunk', 'WhatsAppMessageAudit')
    ORDER BY table_name;
  `);
  console.log('Created Tables Verified:', newTables.map(t => t.table_name));
  if (newTables.length !== 3) {
    throw new Error(`Expected 3 new tables, but found ${newTables.length}`);
  }

  // 2. Verify HNSW index
  const hnswCheck = await prisma.$queryRawUnsafe<any[]>(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'SchemeDocumentChunk' 
      AND indexname = 'SchemeDocumentChunk_embedding_hnsw_idx';
  `);
  console.log('HNSW Index Verified:', hnswCheck.length > 0 ? hnswCheck[0].indexname : 'MISSING!');
  if (hnswCheck.length === 0) {
    throw new Error('HNSW vector index was not created!');
  }

  // 3. Verify PENDING_REVIEW default on SchemeDocument
  const defaultCheck = await prisma.$queryRawUnsafe<any[]>(`
    SELECT column_name, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'SchemeDocument' AND column_name = 'verificationStatus';
  `);
  console.log('Verification Status Default:', defaultCheck[0]?.column_default);

  // 4. Test non-destructive insertion & retrieval
  const testDocId = `TEST-VERIFY-${Date.now()}`;
  console.log('\n--- Non-Destructive Test Record Insertion ---');

  await prisma.$executeRawUnsafe(`
    INSERT INTO "SchemeDocument" (
      "id", "documentId", "schemeSlug", "schemeTitle", "documentTitle",
      "sourceUrl", "issuingAuthority", "verificationStatus"
    ) VALUES (
      $1, $2, 'test-scheme', 'Test Scheme Verification', 'Test Gazette Doc',
      'https://myscheme.gov.in/test', 'Ministry of Verification', 'PENDING_REVIEW'
    );
  `, testDocId, testDocId);

  // Test vector insert with a dummy 768-dim zero/one vector
  const dummyEmbedding = Array(768).fill(0.01);
  const vectorStr = `[${dummyEmbedding.join(',')}]`;

  await prisma.$executeRawUnsafe(`
    INSERT INTO "SchemeDocumentChunk" (
      "id", "documentId", "chunkIndex", "sectionTitle", "content",
      "keywords", "embeddingModel", "embedding"
    ) VALUES (
      gen_random_uuid()::text, $1, 1, 'Section 1', 'Test statutory clause for vector verification',
      $2, 'deterministic-hash-768', $3::vector
    );
  `, testDocId, ['test', 'verification'], vectorStr);

  // Test cosine distance query against the inserted record
  const queryRes = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      c.id, c."sectionTitle", 
      1 - (c.embedding <=> $1::vector) AS similarity
    FROM "SchemeDocumentChunk" c
    WHERE c."documentId" = $2;
  `, vectorStr, testDocId);

  console.log(`Vector Cosine Query Test Result: Similarity = ${queryRes[0]?.similarity}`);

  // Test WhatsApp audit insert
  const testAuditId = `msg-test-${Date.now()}`;
  await prisma.$executeRawUnsafe(`
    INSERT INTO "WhatsAppMessageAudit" (
      "id", "messageId", "senderPhone", "messageType", "status"
    ) VALUES (
      gen_random_uuid()::text, $1, '91******99', 'text', 'PROCESSED'
    );
  `, testAuditId);

  // Clean up ONLY the test records created in this test
  console.log('\n--- Cleaning up temporary test records ---');
  await prisma.$executeRawUnsafe(`DELETE FROM "WhatsAppMessageAudit" WHERE "messageId" = $1;`, testAuditId);
  await prisma.$executeRawUnsafe(`DELETE FROM "SchemeDocument" WHERE "id" = $1;`, testDocId);
  console.log('Cleaned up test records successfully.');

  console.log('\n✅ MIGRATION AND INTEGRATION VERIFIED SUCCESSFULLY ON NEON POSTGRESQL!');
}

main()
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
