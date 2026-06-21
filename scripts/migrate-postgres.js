/**
 * PostgreSQL Database Migration Script
 * Initializes the PostgreSQL database schema for ByteForge
 */

import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createPostgresConfig, describePostgresConfig } from '../server/postgres-config.js'

const { Pool } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function migrate() {
  const startTime = Date.now()

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
  log('🚀 PostgreSQL Database Migration', 'cyan')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan')

  // 获取数据库连接字符串
  const poolConfig = createPostgresConfig(process.env, {
    max: 1,
    connectionTimeoutMillis: 5000,
  })

  if (!poolConfig.connectionString && !poolConfig.host) {
    log('❌ Error: PostgreSQL connection settings are not configured', 'red')
    log('\nUsage:', 'yellow')
    log('  DATABASE_URL=postgresql://user:pass@localhost:5432/byteforge node scripts/migrate-postgres.js', 'yellow')
    log('  PGHOST=localhost PGUSER=user PGPASSWORD=pass PGDATABASE=byteforge node scripts/migrate-postgres.js', 'yellow')
    log('\nExample:', 'yellow')
    log('  DATABASE_URL=postgresql://postgres:password@localhost:5432/byteforge node scripts/migrate-postgres.js', 'yellow')
    process.exit(1)
  }

  log('📡 Connecting to database...', 'blue')
  log(`   ${describePostgresConfig(poolConfig)}\n`, 'blue')

  const pool = new Pool(poolConfig)

  let client

  try {
    // 测试连接
    client = await pool.connect()
    log('✓ Connected to PostgreSQL', 'green')

    // 检查数据库版本
    const versionResult = await client.query('SELECT version()')
    const version = versionResult.rows[0].version
    log(`   PostgreSQL version: ${version.split(',')[0]}\n`, 'green')

    // 读取 SQL 文件
    log('📄 Reading schema file...', 'blue')
    const schemaPath = join(__dirname, '../schema/postgres.sql')
    const sql = readFileSync(schemaPath, 'utf8')
    log(`   File: ${schemaPath}`, 'blue')
    log(`   Size: ${(sql.length / 1024).toFixed(2)} KB\n`, 'blue')

    // 开始事务
    log('🔄 Starting migration transaction...', 'blue')
    await client.query('BEGIN')

    try {
      // 执行 SQL
      log('⚙️  Executing schema migration...', 'blue')
      await client.query(sql)

      // 验证表是否创建成功
      log('\n📊 Verifying tables...', 'blue')
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)

      const tables = tablesResult.rows.map(row => row.table_name)
      log(`   Found ${tables.length} tables:`, 'green')
      tables.forEach(table => {
        log(`   - ${table}`, 'green')
      })

      // 验证索引
      log('\n📑 Verifying indexes...', 'blue')
      const indexesResult = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY indexname
      `)

      const indexes = indexesResult.rows.map(row => row.indexname)
      log(`   Found ${indexes.length} indexes`, 'green')

      // 验证函数
      log('\n⚡ Verifying functions...', 'blue')
      const functionsResult = await client.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        ORDER BY routine_name
      `)

      const functions = functionsResult.rows.map(row => row.routine_name)
      log(`   Found ${functions.length} functions:`, 'green')
      functions.forEach(func => {
        log(`   - ${func}()`, 'green')
      })

      // 验证视图
      log('\n👁️  Verifying views...', 'blue')
      const viewsResult = await client.query(`
        SELECT table_name
        FROM information_schema.views
        WHERE table_schema = 'public'
        ORDER BY table_name
      `)

      const views = viewsResult.rows.map(row => row.table_name)
      log(`   Found ${views.length} views:`, 'green')
      views.forEach(view => {
        log(`   - ${view}`, 'green')
      })

      // 检查初始数据
      log('\n💾 Verifying initial data...', 'blue')
      const settingsResult = await client.query('SELECT COUNT(*) as count FROM settings')
      log(`   Settings: ${settingsResult.rows[0].count} entries`, 'green')

      // 提交事务
      await client.query('COMMIT')
      log('\n✓ Migration transaction committed', 'green')

    } catch (error) {
      // 回滚事务
      await client.query('ROLLBACK')
      log('\n❌ Migration failed, transaction rolled back', 'red')
      throw error
    }

    // 成功
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
    log(`✅ Migration completed successfully in ${duration}s`, 'green')
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan')

    log('📝 Next steps:', 'yellow')
    log('   1. Start the Node.js server: node server/index.js', 'yellow')
    log('   2. Test the API endpoints', 'yellow')
    log('   3. Create your first admin user', 'yellow')
    log('')

  } catch (error) {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red')
    log('❌ Migration Error', 'red')
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'red')
    log(`Error: ${error.message}`, 'red')

    if (error.code) {
      log(`Code: ${error.code}`, 'red')
    }

    if (error.detail) {
      log(`Detail: ${error.detail}`, 'red')
    }

    if (error.position) {
      log(`Position: ${error.position}`, 'red')
    }

    log('\n💡 Troubleshooting tips:', 'yellow')
    log('   - Check if PostgreSQL is running', 'yellow')
    log('   - Verify DATABASE_URL is correct', 'yellow')
    log('   - Ensure the database exists', 'yellow')
    log('   - Check user permissions', 'yellow')
    log('')

    process.exit(1)

  } finally {
    // 释放连接
    if (client) {
      client.release()
    }

    // 关闭连接池
    await pool.end()
  }
}

// 运行迁移
migrate()
