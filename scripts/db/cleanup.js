import { execSync } from 'node:child_process';

/**
 * Database Cleanup Script
 *
 * Periodically cleans up expired and old data from the database:
 * - Expired rate_limits entries
 * - Expired refresh_tokens
 * - Old content_events (configurable retention period)
 *
 * Usage:
 *   node scripts/db/cleanup.js [database] [--remote] [--dry-run]
 *
 * Examples:
 *   node scripts/db/cleanup.js byteforge-dev          # Local dev database
 *   node scripts/db/cleanup.js byteforge --remote     # Production database
 *   node scripts/db/cleanup.js byteforge --dry-run    # Test without deleting
 */

const DATABASE = process.argv[2] || 'byteforge';
const IS_REMOTE = process.argv.includes('--remote');
const DRY_RUN = process.argv.includes('--dry-run');

// Retention periods
const CONTENT_EVENTS_RETENTION_DAYS = 90;
const RATE_LIMITS_RETENTION_DAYS = 1; // Already expired, but keep 1 day for safety
const REFRESH_TOKENS_RETENTION_DAYS = 7; // Keep expired tokens for 7 days

async function executeQuery(query, description) {
  const remoteFlag = IS_REMOTE ? '--remote' : '--local';
  const command = `wrangler d1 execute ${DATABASE} ${remoteFlag} --command="${query}"`;

  console.log(`\n📊 ${description}`);
  console.log(`   Query: ${query.substring(0, 80)}...`);

  if (DRY_RUN) {
    console.log(`   🔍 [DRY RUN] Would execute query`);
    return null;
  }

  try {
    const output = execSync(command, { encoding: 'utf8' });

    // Parse the number of affected rows
    const changesMatch = output.match(/(\d+)\s+row.*affected|Rows\s+affected:\s+(\d+)/i);
    const changes = changesMatch ? parseInt(changesMatch[1] || changesMatch[2], 10) : 0;

    console.log(`   ✅ Deleted ${changes} row(s)`);
    return changes;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

async function getStats(query, description) {
  const remoteFlag = IS_REMOTE ? '--remote' : '--local';
  const command = `wrangler d1 execute ${DATABASE} ${remoteFlag} --command="${query}"`;

  try {
    const output = execSync(command, { encoding: 'utf8' });
    const match = output.match(/│\s*(\d+)\s*│/);
    const count = match ? parseInt(match[1], 10) : 0;
    console.log(`   ${description}: ${count.toLocaleString()}`);
    return count;
  } catch (error) {
    console.log(`   ${description}: Unable to fetch`);
    return 0;
  }
}

async function cleanup() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        ByteForge Database Cleanup Tool                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Database:     ${DATABASE}`);
  console.log(`Environment:  ${IS_REMOTE ? 'Remote (Production/Staging)' : 'Local (Development)'}`);
  console.log(`Mode:         ${DRY_RUN ? 'Dry Run (No changes)' : 'Live'}`);
  console.log('');

  const startTime = Date.now();
  let totalDeleted = 0;

  try {
    // Get current stats
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 Current Database Statistics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await getStats('SELECT COUNT(*) FROM rate_limits', '   rate_limits');
    await getStats('SELECT COUNT(*) FROM refresh_tokens', '   refresh_tokens');
    await getStats('SELECT COUNT(*) FROM content_events', '   content_events');
    await getStats('SELECT COUNT(*) FROM feedback', '   feedback');

    // Cleanup operations
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧹 Cleanup Operations');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Clean expired rate_limits
    const rateLimitsCutoff = new Date(Date.now() - RATE_LIMITS_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const rateLimitsDeleted = await executeQuery(
      `DELETE FROM rate_limits WHERE expires_at < '${rateLimitsCutoff}'`,
      '1. Cleaning expired rate_limits'
    );
    totalDeleted += rateLimitsDeleted || 0;

    // 2. Clean expired refresh_tokens
    const refreshTokensCutoff = new Date(Date.now() - REFRESH_TOKENS_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const refreshTokensDeleted = await executeQuery(
      `DELETE FROM refresh_tokens WHERE expires_at < '${refreshTokensCutoff}'`,
      '2. Cleaning expired refresh_tokens'
    );
    totalDeleted += refreshTokensDeleted || 0;

    // 3. Clean revoked refresh_tokens (keep for 7 days)
    const revokedCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const revokedDeleted = await executeQuery(
      `DELETE FROM refresh_tokens WHERE revoked = 1 AND created_at < '${revokedCutoff}'`,
      '3. Cleaning old revoked tokens'
    );
    totalDeleted += revokedDeleted || 0;

    // 4. Clean old content_events
    const contentEventsCutoff = new Date(Date.now() - CONTENT_EVENTS_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const contentEventsDeleted = await executeQuery(
      `DELETE FROM content_events WHERE created_at < '${contentEventsCutoff}'`,
      `4. Cleaning content_events older than ${CONTENT_EVENTS_RETENTION_DAYS} days`
    );
    totalDeleted += contentEventsDeleted || 0;

    // Get stats after cleanup
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Database Statistics After Cleanup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await getStats('SELECT COUNT(*) FROM rate_limits', '   rate_limits');
    await getStats('SELECT COUNT(*) FROM refresh_tokens', '   refresh_tokens');
    await getStats('SELECT COUNT(*) FROM content_events', '   content_events');
    await getStats('SELECT COUNT(*) FROM feedback', '   feedback');

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Cleanup Summary                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`   Total rows deleted: ${totalDeleted.toLocaleString()}`);
    console.log(`   Duration: ${duration}s`);
    console.log('');

    if (DRY_RUN) {
      console.log('🔍 This was a dry run. No data was actually deleted.');
      console.log('   Run without --dry-run to perform actual cleanup.');
    } else {
      console.log('✅ Cleanup completed successfully!');
    }

    console.log('');
    console.log('📅 Retention Policies:');
    console.log(`   • rate_limits: ${RATE_LIMITS_RETENTION_DAYS} day(s)`);
    console.log(`   • refresh_tokens: ${REFRESH_TOKENS_RETENTION_DAYS} day(s)`);
    console.log(`   • content_events: ${CONTENT_EVENTS_RETENTION_DAYS} day(s)`);
    console.log(`   • feedback: Never deleted (manual review)`);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║                      Error                                 ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('⚠️  Cleanup failed. Please check the error message above.');
    process.exit(1);
  }
}

// Run cleanup
cleanup().catch(error => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
