-- Embedding o'lchovini Gemini text-embedding-004 (768) ga moslash.
-- Eski indeks va ustunni olib tashlab, 768 o'lchovli yangi ustun va HNSW indeks yaratamiz.
DROP INDEX IF EXISTS "legal_source_chunks_embedding_idx";

ALTER TABLE "legal_source_chunks" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "legal_source_chunks" ADD COLUMN "embedding" vector(768);

CREATE INDEX IF NOT EXISTS "legal_source_chunks_embedding_idx"
  ON "legal_source_chunks"
  USING hnsw ("embedding" vector_cosine_ops);
