#!/usr/bin/env node

/**
 * 增量備份腳本
 * 支援時間戳版本控制、保留策略、完整/增量備份
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const { program } = require('commander');
const tar = require('tar');

program
  .name('incremental-backup')
  .description('增量備份工具')
  .version('1.0.0')
  .requiredOption('--source <path>', '來源目錄')
  .requiredOption('--target <path>', '目標目錄')
  .option('--retention <days>', '保留天數', '30')
  .option('--full-backup-day <day>', '每週完整備份日 (0-6, 0=週日)', '0')
  .option('--compress', '壓縮備份檔案', false)
  .option('--encrypt', '加密備份檔案', false)
  .option('--exclude <pattern>', '排除檔案模式', [])
  .option('--dry-run', '模擬執行', false)
  .option('--log <path>', '日誌檔案路徑')
  .parse();

const options = program.opts();

function expandPath(inputPath) {
  if (inputPath.startsWith('~/')) {
    return path.join(process.env.HOME, inputPath.slice(2));
  }
  return path.resolve(inputPath);
}

const source = expandPath(options.source);
const target = expandPath(options.target);
const retentionDays = parseInt(options.retention);
const fullBackupDay = parseInt(options.fullBackupDay);
const logPath = options.log ? expandPath(options.log) : null;

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
  const logMessage = `[${timestamp}] ${levelStr}: ${message}`;
  
  console.log(logMessage);
  
  if (logPath) {
    fs.ensureFileSync(logPath);
    fs.appendFileSync(logPath, logMessage.replace(/\u001b\[\d+m/g, '') + '\n');
  }
}

// 取得今天日期
function getToday() {
  return new Date().toISOString().split('T')[0];
}

// 取得今天是星期幾
function getDayOfWeek() {
  return new Date().getDay();
}

// 檢查是否為完整備份日
function isFullBackupDay() {
  return getDayOfWeek() === fullBackupDay;
}

// 取得最新的完整備份日期
async function getLatestFullBackup() {
  const backupDir = path.join(target, 'full');
  if (!await fs.pathExists(backupDir)) {
    return null;
  }
  
  const dirs = await fs.readdir(backupDir);
  const dates = dirs
    .map(d => d.match(/^(\d{4}-\d{2}-\d{2})$/))
    .filter(m => m)
    .map(m => m[1])
    .sort()
    .reverse();
  
  return dates[0] || null;
}

// 執行完整備份
async function fullBackup() {
  const today = getToday();
  const backupDir = path.join(target, 'full', today);
  
  log(`執行完整備份到: ${backupDir}`);
  
  if (options.dryRun) {
    log('[模擬] 將會執行完整備份', 'dryRun');
    return true;
  }
  
  await fs.ensureDir(backupDir);
  
  const excludeArgs = [];
  const excludePatterns = Array.isArray(options.exclude) 
    ? options.exclude 
    : [options.exclude];
  
  excludePatterns.forEach(pattern => {
    excludeArgs.push('--exclude', pattern);
  });
  
  try {
    // 使用 rsync 進行完整備份
    const rsyncCmd = `rsync -av --delete ${excludeArgs.join(' ')} "${source}/" "${backupDir}/"`;
    log(`執行: ${rsyncCmd}`);
    execSync(rsyncCmd, { stdio: 'inherit' });
    
    // 建立備份資訊檔案
    const backupInfo = {
      type: 'full',
      date: today,
      source: source,
      timestamp: new Date().toISOString()
    };
    await fs.writeJson(path.join(backupDir, '.backup-info.json'), backupInfo, { spaces: 2 });
    
    // 壓縮備份
    if (options.compress) {
      const tarPath = `${backupDir}.tar.gz`;
      log(`壓縮備份到: ${tarPath}`);
      await tar.create({
        gzip: true,
        file: tarPath,
        cwd: target
      }, [`full/${today}`]);
      
      // 刪除未壓縮的目錄
      await fs.remove(backupDir);
    }
    
    log('完整備份完成', 'success');
    return true;
  } catch (error) {
    log(`完整備份失敗: ${error.message}`, 'error');
    return false;
  }
}

// 執行增量備份
async function incrementalBackup() {
  const today = getToday();
  const latestFull = await getLatestFullBackup();
  
  if (!latestFull) {
    log('沒有找到先前的完整備份，執行完整備份...', 'warning');
    return fullBackup();
  }
  
  const backupDir = path.join(target, 'incremental', today);
  const referenceDir = path.join(target, 'full', latestFull);
  
  log(`執行增量備份到: ${backupDir}`);
  log(`參考完整備份: ${latestFull}`);
  
  if (options.dryRun) {
    log('[模擬] 將會執行增量備份', 'dryRun');
    return true;
  }
  
  await fs.ensureDir(backupDir);
  
  const excludeArgs = [];
  const excludePatterns = Array.isArray(options.exclude) 
    ? options.exclude 
    : [options.exclude];
  
  excludePatterns.forEach(pattern => {
    excludeArgs.push('--exclude', pattern);
  });
  
  try {
    // 使用 rsync 的 --compare-dest 進行增量備份
    const rsyncCmd = `rsync -av --delete --compare-dest="${referenceDir}" ${excludeArgs.join(' ')} "${source}/" "${backupDir}/"`;
    log(`執行: ${rsyncCmd}`);
    execSync(rsyncCmd, { stdio: 'inherit' });
    
    // 建立備份資訊檔案
    const backupInfo = {
      type: 'incremental',
      date: today,
      source: source,
      reference: latestFull,
      timestamp: new Date().toISOString()
    };
    await fs.writeJson(path.join(backupDir, '.backup-info.json'), backupInfo, { spaces: 2 });
    
    log('增量備份完成', 'success');
    return true;
  } catch (error) {
    log(`增量備份失敗: ${error.message}`, 'error');
    return false;
  }
}

// 清理舊備份
async function cleanupOldBackups() {
  log(`清理 ${retentionDays} 天前的舊備份...`);
  
  if (options.dryRun) {
    log('[模擬] 將會清理舊備份', 'dryRun');
    return;
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  async function cleanupDir(dirPath) {
    if (!await fs.pathExists(dirPath)) return;
    
    const items = await fs.readdir(dirPath);
    let deletedCount = 0;
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const itemDate = new Date(item);
      
      if (itemDate < cutoffDate) {
        try {
          await fs.remove(itemPath);
          log(`刪除舊備份: ${item}`, 'warning');
          deletedCount++;
        } catch (error) {
          log(`無法刪除 ${item}: ${error.message}`, 'error');
        }
      }
    }
    
    log(`清理完成，刪除 ${deletedCount} 個舊備份`);
  }
  
  await cleanupDir(path.join(target, 'full'));
  await cleanupDir(path.join(target, 'incremental'));
}

// 主程式
async function main() {
  log('========================================');
  log('      增量備份工具 v1.0.0');
  log('========================================');
  log(`來源: ${source}`);
  log(`目標: ${target}`);
  log(`保留天數: ${retentionDays}`);
  log(`完整備份日: 星期${fullBackupDay}`);
  log(`今天是: 星期${getDayOfWeek()}`);
  log(`壓縮: ${options.compress ? '是' : '否'}`);
  log(`模擬: ${options.dryRun ? '是' : '否'}`);
  
  // 檢查來源目錄
  if (!await fs.pathExists(source)) {
    log(`錯誤: 來源目錄不存在: ${source}`, 'error');
    process.exit(1);
  }
  
  // 確保目標目錄存在
  if (!options.dryRun) {
    await fs.ensureDir(target);
  }
  
  let success;
  
  // 決定執行完整或增量備份
  if (isFullBackupDay()) {
    log('\n今天是完整備份日', 'info');
    success = await fullBackup();
  } else {
    log('\n執行增量備份', 'info');
    success = await incrementalBackup();
  }
  
  // 清理舊備份
  if (success && !options.dryRun) {
    await cleanupOldBackups();
  }
  
  if (success) {
    log('\n✅ 備份完成！', 'success');
    process.exit(0);
  } else {
    log('\n❌ 備份失敗', 'error');
    process.exit(1);
  }
}

main().catch(error => {
  log(`未預期的錯誤: ${error.message}`, 'error');
  process.exit(1);
});
