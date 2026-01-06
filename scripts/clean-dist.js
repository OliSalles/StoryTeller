#!/usr/bin/env node

/**
 * Remove a pasta dist/ antiga antes do build
 * Isso garante que não haverá conflito com builds antigos
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distPath = path.join(rootDir, 'dist');

if (fs.existsSync(distPath)) {
  console.log('🗑️  Removendo pasta dist/ antiga...');
  fs.rmSync(distPath, { recursive: true, force: true });
  console.log('✅ Pasta dist/ removida com sucesso!');
} else {
  console.log('✅ Pasta dist/ não existe, tudo certo!');
}










