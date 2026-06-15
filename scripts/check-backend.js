import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const errors = [];

// Check schema file
const schemaPath = 'schema/d1.sql';
if (!existsSync(schemaPath)) {
  errors.push('missing schema file: schema/d1.sql');
} else {
  const schema = readFileSync(schemaPath, 'utf8');
  if (!schema.includes('CREATE TABLE IF NOT EXISTS feedback')) {
    errors.push('schema/d1.sql missing feedback table');
  }
  if (!schema.includes('CREATE TABLE IF NOT EXISTS content_events')) {
    errors.push('schema/d1.sql missing content_events table');
  }
}

// Check API functions
const functionsDir = 'functions/api';
const requiredFunctions = ['health.js', 'feedback.js', 'content-events.js'];

if (!existsSync(functionsDir)) {
  errors.push('missing functions/api directory');
} else {
  for (const file of requiredFunctions) {
    const filePath = join(functionsDir, file);
    if (!existsSync(filePath)) {
      errors.push(`missing API function: ${filePath}`);
      continue;
    }

    const source = readFileSync(filePath, 'utf8');

    // Check for required exports
    if (file !== 'health.js' && !source.includes('onRequestPost')) {
      errors.push(`${filePath} missing onRequestPost export`);
    }
    if (file !== 'health.js' && !source.includes('onRequestOptions')) {
      errors.push(`${filePath} missing onRequestOptions export (CORS)`);
    }

    // Check for error handling
    if (!source.includes('try') || !source.includes('catch')) {
      errors.push(`${filePath} missing error handling`);
    }
  }
}

// Check wrangler.toml
const wranglerPath = 'wrangler.toml';
if (!existsSync(wranglerPath)) {
  errors.push('missing wrangler.toml configuration');
} else {
  const wrangler = readFileSync(wranglerPath, 'utf8');
  if (!wrangler.includes('d1_databases')) {
    errors.push('wrangler.toml missing D1 database binding');
  }
  if (!wrangler.includes('binding = "DB"')) {
    errors.push('wrangler.toml missing DB binding name');
  }
}

// Check backend design docs
const backendDocsPath = 'docs/backend-design.md';
if (!existsSync(backendDocsPath)) {
  errors.push('missing backend documentation: docs/backend-design.md');
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log('Backend check passed: 3 API endpoints, 2 database tables, wrangler.toml configured.');
