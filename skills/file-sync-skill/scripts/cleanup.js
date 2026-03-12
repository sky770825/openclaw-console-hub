#!/usr/bin/env node

/**
 * 清理舊備份腳本
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { program } = require('commander');

program
  .name('cleanup')
  .description('清理舊備份工具')
  .version('1.0.0')
  .requiredOption('--path <path>', '備份目錄路徑')
  .option('--older-than <days>', '刪除超過 N 天的備份', '30')
  .option('--keep-latest <count>', '保留最近的 N 個備份', '7')
  .option('--dry-run', '模擬執行', false)
  .parse();

const options = program.opts();

function expandPath(inputPath) {
  if (inputPath.startsWith('~/')) {
    return path.join(process.env.HOME, inputPath.slice(2));
  }
  return path.resolve(inputPath);
}

const backupPath = expandPath(options.path);
const olderThanDays = parseInt(options.olderThan);
const keepLatest = parseInt(options.keepLatest);

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const levels = {
    info: chalk.blue('INFO'),
    success: chalk.green('SUCCESS'),
    warning: chalk.yellow('WARNING'),
    error: chalk.red('ERROR'),
    dryRun: chalk.cyan('DRY-RUN')
  };
  
  const levelStr = levels[level] || levels.info;
  console.log(`[${timestamp}] ${levelStr}: ${message}`);
}

async function cleanup() {
  log('========================================');
  log('      清理舊備份工具 v1.0.0');
  log('========================================');
  log(`備份路徑: ${backupPath}`);
  log(`刪除超過: ${olderThanDays} 天`);
  log(`保留最新: ${keepLatest} 個`);
  log(`模擬模式: ${options.dryRun ? '是' : '否'}`);
  
  if (!await fs.pathExists(backupPath)) {
    log(`備份目錄不存在: ${backupPath}`, 'error');
    process.exit(1);
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  let deletedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  async function processDir(dirPath, depth = 0) {
    if (!await fs.pathExists(dirPath)) return;
    
    const items = await fs.readdir(dirPath);
    const itemStats = [];
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = await fs.stat(itemPath);
      itemStats.push({ name: item, path: itemPath, stat, isDir: stat.isDirectory() });
    }
    
    // 按修改時間排序
    itemStats.sort((a, b) => b.stat.mtime - a.stat.mtime);
    
    // 保留最新的 N 個
    const toKeep = itemStats.slice(0, keepLatest);
    const toProcess = itemStats.slice(keepLatest);
    
    for (const item of toProcess) {
      // 如果是目錄且包含日期格式，檢查日期
      if (item.isDir && /^\d{4}-\d{2}-\d{2}$/.test(item.name)) {
        const itemDate = new Date(item.name);
        
        if (itemDate < cutoffDate) {
          try {
            if (!options.dryRun) {
              await fs.remove(item.path);
            }
            log(`${options.dryRun ? '[模擬] ' : ''}刪除: ${item.path}`, options.dryRun ? 'dryRun' : 'warning');
            deletedCount++;
          } catch (error) {
            log(`無法刪除 ${item.path}: ${error.message}`, 'error');
            errorCount++;
          }
        } else {
          skippedCount++;
        }
      } else if (item.stat.mtime < cutoffDate) {
        // 非日期目錄，根據修改時間判斷
        try {
          if (!options.dryRun) {
            await fs.remove(item.path);
          }
          log(`${options.dryRun ? '[模擬] ' : ''}刪除: ${item.path}`, options.dryRun ? 'dryRun' : 'warning');
          deletedCount++;
        } catch (error) {
          log(`無法刪除 ${item.path}: ${error.message}`, 'error');
          errorCount++;
        }
      } else {
        skippedCount++;
      }
    }
    
    // 遞迴處理子目錄
    for (const item of toKeep) {
      if (item.isDir) {
        await processDir(item.path, depth + 1);
      }
    }
  }
  
  await processDir(backupPath);
  
  log('\n' + '='.repeat(40));
  log(`清理完成!`);
  log(`  刪除: ${deletedCount}`);
  log(`  跳過: ${skippedCount}`);
  log(`  錯誤: ${errorCount}`);
}

cleanup().catch(error => {
  log(`未預期的錯誤: ${error.message}`, 'error');
  process.exit(1);
});
