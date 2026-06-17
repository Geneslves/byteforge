import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const MIGRATIONS_DIR = 'migrations';
const DATABASE = process.argv[2] || 'byteforge';
const IS_REMOTE = process.argv.includes('--remote');
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Migration script for ByteForge D1 database
 *
 * Usage:
 *   node scripts/db/migrate.js [database] [--remote] [--dry-run]
 *
 * Examples:
 *   node scripts/db/migrate.js byteforge-dev          # Local dev database
 *   node scripts/db/migrate.js byteforge --remote     # Production database
 *   node scripts/db/migrate.js byteforge --dry-run    # Test without applying
 */

async function getMigrationVersion(database, isRemote) {
  try {
    const remoteFlag = isRemote ? '--remote' : '--local';
    const result = execSync(
      `wrangler d1 execute ${database} ${remoteFlag} --command="SELECT value FROM settings WHERE key = 'migration_version'"`,
      { encoding: 'utf8' }
    );

    // Parse wrangler output to get version
    const match = result.match(/value\s+│\s+(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  } catch (error) {
    console.log('No migration version found, starting from 0');
    return 0;
  }
}

async function getAppliedMigrations(database, isRemote) {
  try {
    const remoteFlag = isRemote ? '--remote' : '--local';
    const result = execSync(
      `wrangler d1 execute ${database} ${remoteFlag} --command="SELECT version FROM schema_migrations ORDER BY version"`,
      { encoding: 'utf8' }
    );

    // Parse wrangler output to get versions
    const versions = [];
    const matches = result.matchAll(/version\s+│\s+(\d+)/g);
    for (const match of matches) {
      versions.push(parseInt(match[1], 10));
    }
    return versions;
  } catch (error) {
    console.log('schema_migrations table not found, using migration_version only');
    return [];
  }
}

async function runMigrations() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        ByteForge Database Migration Tool                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Database:     ${DATABASE}`);
  console.log(`Environment:  ${IS_REMOTE ? 'Remote (Production/Staging)' : 'Local (Development)'}`);
  console.log(`Mode:         ${DRY_RUN ? 'Dry Run (No changes)' : 'Live'}`);
  console.log('');

  // Check if migrations directory exists
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Error: ${MIGRATIONS_DIR} directory not found`);
    process.exit(1);
  }

  // Get all migration files
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && /^\d{3}_/.test(f))
    .sort();

  if (files.length === 0) {
    console.log('✅ No migration files found');
    return;
  }

  console.log(`Found ${files.length} migration file(s):`);
  files.forEach(file => console.log(`  • ${file}`));
  console.log('');

  // Get current migration state
  console.log('Checking current migration state...');
  const currentVersion = await getMigrationVersion(DATABASE, IS_REMOTE);
  const appliedMigrations = await getAppliedMigrations(DATABASE, IS_REMOTE);

  console.log(`Current version: ${currentVersion}`);
  if (appliedMigrations.length > 0) {
    console.log(`Applied migrations: ${appliedMigrations.join(', ')}`);
  }
  console.log('');

  // Filter pending migrations
  const pendingFiles = files.filter(file => {
    const version = parseInt(file.match(/^(\d{3})/)[1], 10);
    return !appliedMigrations.includes(version) && version > currentVersion;
  });

  if (pendingFiles.length === 0) {
    console.log('✅ Database is up to date. No migrations to apply.');
    return;
  }

  console.log(`Found ${pendingFiles.length} pending migration(s) to apply:`);
  pendingFiles.forEach(file => console.log(`  • ${file}`));
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 Dry run mode - no changes will be made');
    console.log('');
    return;
  }

  // Apply each pending migration
  const remoteFlag = IS_REMOTE ? '--remote' : '--local';
  let successCount = 0;
  let failureCount = 0;

  for (const file of pendingFiles) {
    const version = parseInt(file.match(/^(\d{3})/)[1], 10);
    const path = join(MIGRATIONS_DIR, file);

    console.log(`─────────────────────────────────────────────────────────────`);
    console.log(`📦 Applying migration ${version}: ${file}`);

    try {
      // Read migration file to show preview
      const sql = readFileSync(path, 'utf8');
      const lines = sql.split('\n').filter(l => l.trim() && !l.trim().startsWith('--'));
      console.log(`   Preview: ${lines[0].substring(0, 60)}...`);

      // Execute migration
      execSync(`wrangler d1 execute ${DATABASE} ${remoteFlag} --file=${path}`, {
        stdio: 'inherit',
      });

      console.log(`✅ Migration ${version} applied successfully`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to apply migration ${version}`);
      console.error(`   Error: ${error.message}`);
      failureCount++;

      console.log('');
      console.log('⚠️  Migration failed. Stopping migration process.');
      console.log('   Review the error above and fix any issues.');
      console.log('   You may need to manually rollback partial changes.');
      break;
    }
  }

  console.log(`─────────────────────────────────────────────────────────────`);
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  Migration Summary                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`✅ Successful: ${successCount}`);
  if (failureCount > 0) {
    console.log(`❌ Failed:     ${failureCount}`);
  }
  console.log('');

  if (successCount > 0) {
    // Verify final state
    const finalVersion = await getMigrationVersion(DATABASE, IS_REMOTE);
    console.log(`Current database version: ${finalVersion}`);
    console.log('');
  }

  if (failureCount > 0) {
    console.log('⚠️  Some migrations failed. Database may be in an inconsistent state.');
    console.log('   Recommended actions:');
    console.log('   1. Check the error message above');
    console.log('   2. Review the failed migration file');
    console.log('   3. Fix the issue and re-run migrations');
    console.log('   4. Consider restoring from backup if needed');
    process.exit(1);
  } else if (successCount > 0) {
    console.log('🎉 All migrations applied successfully!');
  }
}

runMigrations().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
