import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

/**
 * Database Backup Script
 *
 * Creates a backup of the D1 database and saves it to the backups/ directory
 *
 * Usage:
 *   node scripts/db/backup.js [database] [--remote]
 *
 * Examples:
 *   node scripts/db/backup.js byteforge-dev          # Local dev database
 *   node scripts/db/backup.js byteforge --remote     # Production database
 */

const DATABASE = process.argv[2] || 'byteforge';
const IS_REMOTE = process.argv.includes('--remote');

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `backup-${DATABASE}-${timestamp}.sql`;
  const filepath = `backups/${filename}`;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        ByteForge Database Backup Tool                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Database:     ${DATABASE}`);
  console.log(`Environment:  ${IS_REMOTE ? 'Remote (Production/Staging)' : 'Local (Development)'}`);
  console.log(`Backup file:  ${filepath}`);
  console.log('');

  try {
    // Create backups directory if it doesn't exist
    try {
      execSync('mkdir backups', { stdio: 'ignore' });
    } catch {
      // Directory already exists, ignore
    }

    console.log('📦 Creating backup...');

    const remoteFlag = IS_REMOTE ? '--remote' : '--local';
    const command = `wrangler d1 export ${DATABASE} ${remoteFlag}`;

    const output = execSync(command, { encoding: 'utf8' });

    writeFileSync(filepath, output);

    // Get file size
    const stats = execSync(`powershell -Command "(Get-Item '${filepath}').Length"`, { encoding: 'utf8' }).trim();
    const sizeKB = (parseInt(stats, 10) / 1024).toFixed(2);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                  Backup Complete                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`   ✅ Backup saved: ${filepath}`);
    console.log(`   📊 File size: ${sizeKB} KB`);
    console.log('');
    console.log('💡 To restore from this backup:');
    console.log(`   wrangler d1 execute ${DATABASE} ${remoteFlag} --file=${filepath}`);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║                      Error                                 ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('⚠️  Backup failed. Please check the error message above.');
    process.exit(1);
  }
}

backup().catch(error => {
  console.error('Backup failed:', error);
  process.exit(1);
});
