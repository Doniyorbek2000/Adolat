-- pgvector kengaytmasini yoqish
CREATE EXTENSION IF NOT EXISTS vector;

-- Eski JSON-matn embedding ustunini olib tashlash
ALTER TABLE "legal_source_chunks" DROP COLUMN IF EXISTS "embedding_ref";

-- pgvector ustuni (text-embedding-3-small → 1536 o'lchov)
ALTER TABLE "legal_source_chunks" ADD COLUMN "embedding" vector(1536);

-- Cosine masofa bo'yicha ANN indeks (HNSW). Katta hajmda qidiruvni tezlashtiradi.
CREATE INDEX IF NOT EXISTS "legal_source_chunks_embedding_idx"
  ON "legal_source_chunks"
  USING hnsw ("embedding" vector_cosine_ops);
