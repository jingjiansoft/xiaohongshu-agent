#!/usr/bin/env node
/**
 * 数据迁移工具
 * 将 config/*.json 文件数据迁移到 SQLite 统一存储
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { UnifiedStorage } from './data/unified-storage.js';
import { logger } from './utils/logger.js';

interface MigrationResult {
  success: boolean;
  migrated: string[];
  skipped: string[];
  errors: string[];
}

/**
 * 迁移配置文件到 SQLite
 */
function migrate(): MigrationResult {
  const result: MigrationResult = {
    success: true,
    migrated: [],
    skipped: [],
    errors: [],
  };

  console.log('🔄 开始数据迁移...\n');

  try {
    // 初始化 SQLite
    const storage = UnifiedStorage.getInstance();
    console.log('✅ SQLite 数据库初始化成功\n');

    // 1. 迁移用户配置
    console.log('1️⃣  迁移用户配置...');
    const userProfilePath = resolve(process.cwd(), 'config/user-profile.json');
    if (existsSync(userProfilePath)) {
      try {
        const content = readFileSync(userProfilePath, 'utf-8');
        const profile = JSON.parse(content);

        // 检查是否已存在
        const existing = storage.getSetting('user_profile');
        if (existing) {
          console.log('   ⚠️  SQLite 中已存在用户配置，跳过');
          result.skipped.push('user_profile');
        } else {
          storage.saveSetting('user_profile', profile, 'user_profile');
          console.log('   ✅ 用户配置迁移成功');
          result.migrated.push('user_profile');
        }
      } catch (error) {
        console.log('   ❌ 用户配置迁移失败:', (error as Error).message);
        result.errors.push('user_profile: ' + (error as Error).message);
        result.success = false;
      }
    } else {
      console.log('   ⏭️  用户配置文件不存在，跳过');
      result.skipped.push('user_profile');
    }

    // 2. 迁移模型配置
    console.log('\n2️⃣  迁移模型配置...');
    const modelConfigPath = resolve(process.cwd(), 'config/model-config.json');
    if (existsSync(modelConfigPath)) {
      try {
        const content = readFileSync(modelConfigPath, 'utf-8');
        const config = JSON.parse(content);

        // 检查是否已存在
        const existing = storage.getSetting('model_config');
        if (existing) {
          console.log('   ⚠️  SQLite 中已存在模型配置，跳过');
          result.skipped.push('model_config');
        } else {
          storage.saveSetting('model_config', config, 'model_config');
          console.log('   ✅ 模型配置迁移成功');
          result.migrated.push('model_config');
        }
      } catch (error) {
        console.log('   ❌ 模型配置迁移失败:', (error as Error).message);
        result.errors.push('model_config: ' + (error as Error).message);
        result.success = false;
      }
    } else {
      console.log('   ⏭️  模型配置文件不存在，跳过');
      result.skipped.push('model_config');
    }

    // 3. 迁移 Cookie
    console.log('\n3️⃣  迁移 Cookie...');
    const cookiesPath = resolve(process.cwd(), 'config/cookies.json');
    if (existsSync(cookiesPath)) {
      try {
        const content = readFileSync(cookiesPath, 'utf-8');
        const cookies = JSON.parse(content);

        // 检查是否已存在
        const existing = storage.getCookies();
        if (existing) {
          console.log('   ⚠️  SQLite 中已存在 Cookie，跳过');
          result.skipped.push('cookies');
        } else {
          storage.saveCookies(cookies);
          console.log('   ✅ Cookie 迁移成功');
          result.migrated.push('cookies');
        }
      } catch (error) {
        console.log('   ❌ Cookie 迁移失败:', (error as Error).message);
        result.errors.push('cookies: ' + (error as Error).message);
        result.success = false;
      }
    } else {
      console.log('   ⏭️  Cookie 文件不存在，跳过');
      result.skipped.push('cookies');
    }

    // 总结
    console.log('\n' + '='.repeat(50));
    console.log('📊 迁移结果：');
    console.log(`   ✅ 成功迁移：${result.migrated.length} 项`);
    console.log(`   ⏭️  跳过：${result.skipped.length} 项`);
    console.log(`   ❌ 失败：${result.errors.length} 项`);

    if (result.migrated.length > 0) {
      console.log('\n📁 迁移的数据：');
      result.migrated.forEach(item => console.log(`   - ${item}`));
    }

    if (result.skipped.length > 0) {
      console.log('\n⏭️  跳过的数据：');
      result.skipped.forEach(item => console.log(`   - ${item}`));
    }

    if (result.errors.length > 0) {
      console.log('\n❌ 错误：');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n' + '='.repeat(50));

    if (result.success) {
      console.log('\n✅ 数据迁移完成！\n');
      console.log('📝 后续步骤：');
      console.log('   1. 验证数据是否正确迁移：访问 Web 界面检查配置');
      console.log('   2. 备份原配置文件（可选）：config/*.json');
      console.log('   3. 删除原配置文件（可选）：rm config/*.json（保留 *.example.json）');
    } else {
      console.log('\n⚠️  部分数据迁移失败，请检查错误信息');
    }

  } catch (error) {
    console.error('❌ 迁移过程出错:', (error as Error).message);
    logger.error('迁移失败', { error: (error as Error).message });
    result.success = false;
    result.errors.push('Migration: ' + (error as Error).message);
  }

  return result;
}

// 运行迁移
const result = migrate();
process.exit(result.success ? 0 : 1);
