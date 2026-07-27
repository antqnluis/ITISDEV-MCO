-- vector knowledge base table
CREATE TABLE public.wellness_knowledge_base (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category text NOT NULL, -- e.g., 'academic_engagement', 'personal_wellbeing'
  title text NOT NULL,
  content text NOT NULL CHECK (char_length(btrim(content)) >= 1),
  embedding vector(1536), -- Standard OpenAI vector dimension
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wellness_knowledge_base_pkey PRIMARY KEY (id)
);

-- semantic search function (RPC)
CREATE OR REPLACE FUNCTION public.match_wellness_resources (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  category text,
  title text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    wellness_knowledge_base.id,
    wellness_knowledge_base.category,
    wellness_knowledge_base.title,
    wellness_knowledge_base.content,
    1 - (wellness_knowledge_base.embedding <=> query_embedding) as similarity
  FROM wellness_knowledge_base
  WHERE 1 - (wellness_knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY wellness_knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
$$;
