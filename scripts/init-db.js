#!/usr/bin/env node

/**
 * 数据库初始化和迁移工具
 * 用于在 Wrangler 运行时初始化数据库
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

async function initDatabase() {
  console.log('🔄 正在初始化数据库...\n');

  try {
    // 读取 schema 文件
    const schema = await fs.readFile('./schema/d1.sql', 'utf-8');

    // 执行初始化
    const { stdout, stderr } = await execAsync(
      `pnpm exec wrangler d1 execute byteforge --local --file=./schema/d1.sql`
    );

    if (stderr && !stderr.includes('Successfully')) {
      console.error('❌ 初始化失败:', stderr);
      process.exit(1);
    }

    console.log('✅ 数据库初始化成功！\n');
    console.log('已创建以下表:');
    console.log('  • users');
    console.log('  • sessions');
    console.log('  • refresh_tokens');
    console.log('  • settings');
    console.log('  • rate_limits');
    console.log('  • feedback');
    console.log('  • content_events\n');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

initDatabase();
