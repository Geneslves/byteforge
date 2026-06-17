#!/usr/bin/env node

/**
 * ByteForge 数据库查看工具
 * 使用方式：node scripts/db/view-db.js [选项]
 */

import { execSync } from 'child_process';

const DB_NAME = 'byteforge';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function executeQuery(query, isLocal = false) {
  try {
    const localFlag = isLocal ? '--local' : '';
    const cmd = `wrangler d1 execute ${DB_NAME} ${localFlag} --command "${query}"`;
    const result = execSync(cmd, { encoding: 'utf-8' });
    return result;
  } catch (error) {
    log(`❌ 查询失败: ${error.message}`, 'red');
    return null;
  }
}

function showHelp() {
  log('\n📊 ByteForge 数据库查看工具\n', 'bright');
  log('使用方式:', 'cyan');
  log('  node scripts/db/view-db.js [选项]\n');

  log('选项:', 'cyan');
  log('  --users         查看所有用户');
  log('  --admins        查看管理员用户');
  log('  --feedback      查看反馈数据');
  log('  --settings      查看系统设置');
  log('  --tables        查看所有表');
  log('  --stats         查看数据统计');
  log('  --local         使用本地数据库（配合其他选项）');
  log('  --help          显示帮助信息\n');

  log('示例:', 'yellow');
  log('  node scripts/db/view-db.js --users');
  log('  node scripts/db/view-db.js --users --local');
  log('  node scripts/db/view-db.js --stats\n');
}

function viewUsers(isLocal = false) {
  log('\n👥 用户列表\n', 'bright');
  const query = 'SELECT id, username, email, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC';
  const result = executeQuery(query, isLocal);
  if (result) {
    console.log(result);
  }
}

function viewAdmins(isLocal = false) {
  log('\n👑 管理员列表\n', 'bright');
  const query = "SELECT id, username, email, created_at FROM users WHERE role='admin' ORDER BY created_at DESC";
  const result = executeQuery(query, isLocal);
  if (result) {
    console.log(result);
  }
}

function viewFeedback(isLocal = false) {
  log('\n💬 反馈数据（最新 20 条）\n', 'bright');
  const query = 'SELECT id, route_path, message, created_at FROM feedback ORDER BY created_at DESC LIMIT 20';
  const result = executeQuery(query, isLocal);
  if (result) {
    console.log(result);
  }
}

function viewSettings(isLocal = false) {
  log('\n⚙️ 系统设置\n', 'bright');
  const query = 'SELECT key, value, updated_at FROM settings';
  const result = executeQuery(query, isLocal);
  if (result) {
    console.log(result);
  }
}

function viewTables(isLocal = false) {
  log('\n📋 数据库表列表\n', 'bright');
  const query = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
  const result = executeQuery(query, isLocal);
  if (result) {
    console.log(result);
  }
}

function viewStats(isLocal = false) {
  log('\n📊 数据统计\n', 'bright');

  log('用户统计:', 'cyan');
  const userCount = executeQuery('SELECT COUNT(*) as total FROM users', isLocal);
  console.log(userCount);

  const adminCount = executeQuery("SELECT COUNT(*) as total FROM users WHERE role='admin'", isLocal);
  console.log(adminCount);

  log('\n反馈统计:', 'cyan');
  const feedbackCount = executeQuery('SELECT COUNT(*) as total FROM feedback', isLocal);
  console.log(feedbackCount);

  const feedbackByRoute = executeQuery('SELECT route_path, COUNT(*) as count FROM feedback GROUP BY route_path ORDER BY count DESC LIMIT 10', isLocal);
  console.log(feedbackByRoute);

  log('\n最近活动:', 'cyan');
  const recentUsers = executeQuery('SELECT COUNT(*) as count FROM users WHERE created_at > datetime(\'now\', \'-7 days\')', isLocal);
  console.log('过去 7 天新用户:');
  console.log(recentUsers);
}

// 解析命令行参数
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  showHelp();
  process.exit(0);
}

const isLocal = args.includes('--local');

// 执行对应的操作
if (args.includes('--users')) {
  viewUsers(isLocal);
} else if (args.includes('--admins')) {
  viewAdmins(isLocal);
} else if (args.includes('--feedback')) {
  viewFeedback(isLocal);
} else if (args.includes('--settings')) {
  viewSettings(isLocal);
} else if (args.includes('--tables')) {
  viewTables(isLocal);
} else if (args.includes('--stats')) {
  viewStats(isLocal);
} else {
  log('❌ 无效的选项', 'red');
  showHelp();
  process.exit(1);
}

log('\n✅ 查询完成\n', 'green');
