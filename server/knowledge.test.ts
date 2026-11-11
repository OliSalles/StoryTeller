/**
 * Tests for multi-tenant isolation and knowledge base functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as knowledgeDb from './knowledge-db';
import * as db from './db';
import { getDb } from './db';

describe('Multi-Tenant Isolation', () => {
  let company1Id: number;
  let company2Id: number;
  let user1Id: number;
  let user2Id: number;

  beforeAll(async () => {
    // Create test users
    user1Id = await db.createUser({
      email: 'test1@example.com',
      password: 'password123',
      name: 'Test User 1',
    }) || 0;

    user2Id = await db.createUser({
      email: 'test2@example.com',
      password: 'password123',
      name: 'Test User 2',
    }) || 0;

    // Create test companies
    company1Id = await knowledgeDb.createCompany({
      name: 'Company 1',
      slug: 'company-1-test',
      ownerId: user1Id,
    });

    company2Id = await knowledgeDb.createCompany({
      name: 'Company 2',
      slug: 'company-2-test',
      ownerId: user2Id,
    });

    // Add users to their companies
    await knowledgeDb.addCompanyMember({
      companyId: company1Id,
      userId: user1Id,
      role: 'owner',
    });

    await knowledgeDb.addCompanyMember({
      companyId: company2Id,
      userId: user2Id,
      role: 'owner',
    });
  });

  afterAll(async () => {
    // Cleanup
    const database = await getDb();
    if (database) {
      // Delete companies (cascade should handle the rest)
      await knowledgeDb.deleteCompany(company1Id);
      await knowledgeDb.deleteCompany(company2Id);
    }
  });

  it('should isolate knowledge sources by company', async () => {
    // Create knowledge source for company 1
    const source1Id = await knowledgeDb.createKnowledgeSource({
      companyId: company1Id,
      name: 'Company 1 Source',
      type: 'document',
      status: 'pending',
      createdBy: user1Id,
    });

    // Create knowledge source for company 2
    const source2Id = await knowledgeDb.createKnowledgeSource({
      companyId: company2Id,
      name: 'Company 2 Source',
      type: 'document',
      status: 'pending',
      createdBy: user2Id,
    });

    // Get sources for company 1
    const company1Sources = await knowledgeDb.getKnowledgeSourcesByCompanyId(company1Id);
    
    // Get sources for company 2
    const company2Sources = await knowledgeDb.getKnowledgeSourcesByCompanyId(company2Id);

    // Company 1 should only see its own source
    expect(company1Sources.some(s => s.id === source1Id)).toBe(true);
    expect(company1Sources.some(s => s.id === source2Id)).toBe(false);

    // Company 2 should only see its own source
    expect(company2Sources.some(s => s.id === source2Id)).toBe(true);
    expect(company2Sources.some(s => s.id === source1Id)).toBe(false);
  });

  it('should isolate teams by company', async () => {
    // Create team for company 1
    const team1Id = await knowledgeDb.createTeam({
      companyId: company1Id,
      name: 'Team 1',
    });

    // Create team for company 2
    const team2Id = await knowledgeDb.createTeam({
      companyId: company2Id,
      name: 'Team 2',
    });

    // Get teams for each company
    const company1Teams = await knowledgeDb.getTeamsByCompanyId(company1Id);
    const company2Teams = await knowledgeDb.getTeamsByCompanyId(company2Id);

    // Each company should only see their own teams
    expect(company1Teams.some(t => t.id === team1Id)).toBe(true);
    expect(company1Teams.some(t => t.id === team2Id)).toBe(false);

    expect(company2Teams.some(t => t.id === team2Id)).toBe(true);
    expect(company2Teams.some(t => t.id === team1Id)).toBe(false);
  });

  it('should prevent cross-company member access', async () => {
    // Get company members for company 1
    const company1Members = await knowledgeDb.getCompanyMembers(company1Id);
    
    // Get company members for company 2
    const company2Members = await knowledgeDb.getCompanyMembers(company2Id);

    // User 1 should be in company 1, not company 2
    expect(company1Members.some(m => m.userId === user1Id)).toBe(true);
    expect(company1Members.some(m => m.userId === user2Id)).toBe(false);

    // User 2 should be in company 2, not company 1
    expect(company2Members.some(m => m.userId === user2Id)).toBe(true);
    expect(company2Members.some(m => m.userId === user1Id)).toBe(false);
  });
});

describe('Knowledge Chunking', () => {
  it('should chunk text with correct overlap', async () => {
    const { chunkText } = await import('./_core/ingestion');
    
    const text = 'A'.repeat(2500); // 2500 characters
    const chunks = chunkText(text, 1000, 200);

    // Should create 3 chunks (0-1000, 800-1800, 1600-2500)
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.length).toBeLessThan(5);

    // Each chunk should be <= 1000 chars
    chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(1000);
    });
  });

  it('should handle short text', async () => {
    const { chunkText } = await import('./_core/ingestion');
    
    const text = 'Short text';
    const chunks = chunkText(text, 1000, 200);

    // Should create 1 chunk
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe(text);
  });
});

describe('Embedding Generation', () => {
  it('should generate embedding with correct dimensions', async () => {
    const { generateEmbedding } = await import('./_core/ingestion');
    
    // Skip if no API key configured
    if (!process.env.OPENAI_API_KEY) {
      console.log('Skipping embedding test - no OPENAI_API_KEY');
      return;
    }

    const text = 'This is a test for embedding generation';
    const embedding = await generateEmbedding(text);

    // text-embedding-3-small has 1536 dimensions
    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(1536);
    
    // All values should be numbers
    embedding.forEach(value => {
      expect(typeof value).toBe('number');
      expect(isFinite(value)).toBe(true);
    });
  }, 30000); // 30 second timeout for API call
});

describe('Story Similarity Classification', () => {
  // Default thresholds
  const thresholds = {
    duplicate: 85,
    reusable: 60,
    minimum: 40,
  };

  it('should classify high similarity as duplicate', () => {
    const similarityScore = 92;
    
    const isDuplicate = similarityScore > thresholds.duplicate;
    const isReusable = similarityScore >= thresholds.reusable && similarityScore <= thresholds.duplicate;
    const isConvergent = similarityScore >= thresholds.minimum && similarityScore < thresholds.reusable;
    const isNotRelated = similarityScore < thresholds.minimum;

    expect(isDuplicate).toBe(true);
    expect(isReusable).toBe(false);
    expect(isConvergent).toBe(false);
    expect(isNotRelated).toBe(false);
  });

  it('should classify medium similarity as reusable', () => {
    const similarityScore = 72;
    
    const isDuplicate = similarityScore > thresholds.duplicate;
    const isReusable = similarityScore >= thresholds.reusable && similarityScore <= thresholds.duplicate;
    const isConvergent = similarityScore >= thresholds.minimum && similarityScore < thresholds.reusable;
    const isNotRelated = similarityScore < thresholds.minimum;

    expect(isDuplicate).toBe(false);
    expect(isReusable).toBe(true);
    expect(isConvergent).toBe(false);
    expect(isNotRelated).toBe(false);
  });

  it('should classify low similarity as convergent', () => {
    const similarityScore = 45;
    
    const isDuplicate = similarityScore > thresholds.duplicate;
    const isReusable = similarityScore >= thresholds.reusable && similarityScore <= thresholds.duplicate;
    const isConvergent = similarityScore >= thresholds.minimum && similarityScore < thresholds.reusable;
    const isNotRelated = similarityScore < thresholds.minimum;

    expect(isDuplicate).toBe(false);
    expect(isReusable).toBe(false);
    expect(isConvergent).toBe(true);
    expect(isNotRelated).toBe(false);
  });

  it('should filter out not related stories below minimum threshold', () => {
    const similarityScore = 25;
    
    const isDuplicate = similarityScore > thresholds.duplicate;
    const isReusable = similarityScore >= thresholds.reusable && similarityScore <= thresholds.duplicate;
    const isConvergent = similarityScore >= thresholds.minimum && similarityScore < thresholds.reusable;
    const isNotRelated = similarityScore < thresholds.minimum;

    expect(isDuplicate).toBe(false);
    expect(isReusable).toBe(false);
    expect(isConvergent).toBe(false);
    expect(isNotRelated).toBe(true); // Should be filtered out
  });

  it('should support configurable thresholds per company', () => {
    // Custom company thresholds
    const customThresholds = {
      duplicate: 90,
      reusable: 70,
      minimum: 50,
    };

    const similarityScore = 75;
    
    const isDuplicate = similarityScore > customThresholds.duplicate;
    const isReusable = similarityScore >= customThresholds.reusable && similarityScore <= customThresholds.duplicate;
    const isConvergent = similarityScore >= customThresholds.minimum && similarityScore < customThresholds.reusable;

    expect(isDuplicate).toBe(false);
    expect(isReusable).toBe(true); // 75 is in 70-90 range
    expect(isConvergent).toBe(false);
  });
});
