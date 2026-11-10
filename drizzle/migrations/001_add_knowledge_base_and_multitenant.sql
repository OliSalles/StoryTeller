-- Migration: Add Knowledge Base and Multi-Tenant Support
-- Date: 2026-11-10
-- Description: Adds companies, teams, knowledge sources, embeddings, and multi-tenant columns

-- ============================================
-- Enable pgvector extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Multi-Tenant: Companies & Teams
-- ============================================

-- Company roles enum
CREATE TYPE company_role AS ENUM ('owner', 'admin', 'member');

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

-- Company members table
CREATE TABLE IF NOT EXISTS company_members (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role company_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_company_id ON teams(company_id);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- ============================================
-- RAG Knowledge Base
-- ============================================

-- Knowledge source type enum
CREATE TYPE knowledge_source_type AS ENUM ('code_repo', 'document', 'story', 'miro_board');

-- Knowledge source status enum
CREATE TYPE knowledge_source_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Knowledge sources table
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  name VARCHAR(512) NOT NULL,
  type knowledge_source_type NOT NULL,
  status knowledge_source_status NOT NULL DEFAULT 'pending',
  source_url TEXT,
  metadata JSONB,
  total_chunks INTEGER DEFAULT 0,
  processed_chunks INTEGER DEFAULT 0,
  error_message TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_company_id ON knowledge_sources(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_team_id ON knowledge_sources(team_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_type ON knowledge_sources(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_status ON knowledge_sources(status);

-- Knowledge chunks table
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source_id ON knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_company_id ON knowledge_chunks(company_id);

-- Knowledge embeddings table (uses pgvector)
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id SERIAL PRIMARY KEY,
  chunk_id INTEGER NOT NULL REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  embedding vector(1536),
  model VARCHAR(128) NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_chunk_id ON knowledge_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_company_id ON knowledge_embeddings(company_id);

-- Create index for cosine similarity search (most common for embeddings)
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector_cosine 
  ON knowledge_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Story similarity type enum
CREATE TYPE story_similarity_type AS ENUM ('duplicate', 'reusable', 'convergent');

-- Story similarities table
CREATE TABLE IF NOT EXISTS story_similarities (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  story_id INTEGER NOT NULL,
  story_title TEXT NOT NULL,
  story_description TEXT NOT NULL,
  related_type VARCHAR(64) NOT NULL,
  related_id INTEGER,
  related_title TEXT NOT NULL,
  related_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  similarity_type story_similarity_type NOT NULL,
  similarity_score INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_similarities_company_id ON story_similarities(company_id);
CREATE INDEX IF NOT EXISTS idx_story_similarities_story_id ON story_similarities(story_id);

-- Knowledge chat sessions table
CREATE TABLE IF NOT EXISTS knowledge_chat_sessions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(512),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chat_sessions_company_id ON knowledge_chat_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chat_sessions_user_id ON knowledge_chat_sessions(user_id);

-- Knowledge chat messages table
CREATE TABLE IF NOT EXISTS knowledge_chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES knowledge_chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  citations JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chat_messages_session_id ON knowledge_chat_messages(session_id);

-- ============================================
-- Add company_id to existing tables (nullable for backward compatibility)
-- ============================================

-- Add company_id to features table (nullable initially, will be populated for existing data)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'features' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE features ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_features_company_id ON features(company_id);
  END IF;
END $$;

-- Add team_id to features table (optional)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'features' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE features ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL;
    CREATE INDEX idx_features_team_id ON features(team_id);
  END IF;
END $$;

-- Add team_id to user_stories table (optional)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stories' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL;
    CREATE INDEX idx_user_stories_team_id ON user_stories(team_id);
  END IF;
END $$;

-- ============================================
-- Helper function for similarity search
-- ============================================

-- Function to search similar embeddings by cosine distance
CREATE OR REPLACE FUNCTION search_similar_embeddings(
  query_embedding vector(1536),
  company_filter INTEGER,
  match_count INTEGER DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id INTEGER,
  content TEXT,
  similarity FLOAT,
  source_id INTEGER,
  source_name VARCHAR,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id AS chunk_id,
    kc.content,
    1 - (ke.embedding <=> query_embedding) AS similarity,
    ks.id AS source_id,
    ks.name AS source_name,
    kc.metadata
  FROM knowledge_embeddings ke
  JOIN knowledge_chunks kc ON ke.chunk_id = kc.id
  JOIN knowledge_sources ks ON kc.source_id = ks.id
  WHERE 
    ke.company_id = company_filter
    AND (1 - (ke.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Data migration: Create default personal company for existing users
-- ============================================

-- For each existing user without a company, create a personal company
DO $$
DECLARE
  user_record RECORD;
  company_id INTEGER;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email, u.name 
    FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM company_members cm WHERE cm.user_id = u.id
    )
  LOOP
    -- Create a personal company for this user
    INSERT INTO companies (name, slug, owner_id)
    VALUES (
      user_record.name || ' - Pessoal',
      'personal-' || user_record.id,
      user_record.id
    )
    RETURNING id INTO company_id;
    
    -- Add user as owner of their company
    INSERT INTO company_members (company_id, user_id, role)
    VALUES (company_id, user_record.id, 'owner');
    
    -- Update existing features to belong to this company
    UPDATE features 
    SET company_id = company_id 
    WHERE user_id = user_record.id AND company_id IS NULL;
  END LOOP;
END $$;

-- ============================================
-- Comments and documentation
-- ============================================

COMMENT ON TABLE companies IS 'Organizations/workspaces for multi-tenant support';
COMMENT ON TABLE teams IS 'Teams within a company for organizing members';
COMMENT ON TABLE knowledge_sources IS 'Tracks uploaded/connected knowledge sources (code, docs, stories)';
COMMENT ON TABLE knowledge_chunks IS 'Text chunks from processed knowledge sources';
COMMENT ON TABLE knowledge_embeddings IS 'Vector embeddings for semantic search using pgvector';
COMMENT ON TABLE story_similarities IS 'Analysis results comparing stories for duplicates, reusability, convergence';
COMMENT ON FUNCTION search_similar_embeddings IS 'Searches for similar embeddings using cosine distance';
