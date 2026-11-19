/**
 * Tests for ingestion service
 */

import { describe, it, expect } from 'vitest';
import { resolveFileExtension } from './ingestion';

describe('resolveFileExtension', () => {
  it('should resolve extension from metadata.originalFileName when present', () => {
    const result = resolveFileExtension(
      '/tmp/upload_abc123',
      'Miro Ticket - Board completo',
      { originalFileName: 'board-export.pdf' }
    );
    expect(result).toBe('.pdf');
  });

  it('should fall back to filePath when metadata.originalFileName is missing', () => {
    const result = resolveFileExtension(
      '/tmp/upload_abc123.docx',
      'Miro Ticket - Board completo',
      {}
    );
    expect(result).toBe('.docx');
  });

  it('should fall back to filePath when metadata is undefined', () => {
    const result = resolveFileExtension(
      '/tmp/upload_abc123.txt',
      'User typed name',
      undefined
    );
    expect(result).toBe('.txt');
  });

  it('should use fileName as last resort when other sources have no extension', () => {
    const result = resolveFileExtension(
      '/tmp/no_extension',
      'document.csv',
      {}
    );
    expect(result).toBe('.csv');
  });

  it('should handle metadata.originalFileName with no extension', () => {
    const result = resolveFileExtension(
      '/tmp/upload_abc123.md',
      'Notes',
      { originalFileName: 'no_ext' }
    );
    expect(result).toBe('.md');
  });

  it('should return empty string when no extension found anywhere', () => {
    const result = resolveFileExtension(
      '/tmp/no_extension',
      'no_extension_either',
      {}
    );
    expect(result).toBe('');
  });

  it('should handle complex metadata.originalFileName paths', () => {
    const result = resolveFileExtension(
      '/tmp/upload_xyz',
      'User Name',
      { originalFileName: '/path/to/file/document.docx' }
    );
    expect(result).toBe('.docx');
  });

  it('should return lowercase extensions', () => {
    const result = resolveFileExtension(
      '/tmp/upload.PDF',
      'Document',
      { originalFileName: 'File.PDF' }
    );
    expect(result).toBe('.pdf');
  });
});
