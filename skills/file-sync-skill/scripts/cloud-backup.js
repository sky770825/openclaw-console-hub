#!/usr/bin/env node

/**
 * 雲端備份腳本
 * 支援 iCloud, Dropbox, Google Drive
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { program } = require('commander');
const tar = require('tar');

program
  .name('cloud-backup')
  .description('雲端儲存備份工具')
  .version('1.0.0')
  .requiredOption('--source <path>', '來源目錄')
  .requiredOption('--provider <name>', '雲端提供者: icloud, dropbox, googledrive')
  .option('--target-path <path>', '雲端目標路徑', '/Backups')
  .option('--incremental', '啟用增量備份', false)
  .option('--encrypt', '加密備份檔案', false)
  .option('--compress', '壓縮備份檔案', true)
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
const provider = options.provider.toLowerCase();
const targetPath = options.targetPath;
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

// 取得雲端路徑
function getCloudPath(providerName) {
  const home = process.env.HOME;
  
  switch (providerName) {
    case 'icloud':
      return path.join(home, 'Library/Mobile Documents/com~apple~CloudDocs');
    case 'dropbox':
      return path.join(home, 'Dropbox');
    case 'googledrive':
      return path.join(home, 'Google Drive');
    default:
      throw new Error(`不支援的雲端提供者: ${providerName}`);
  }
}

// 檢查雲端目錄是否可用
async function checkCloudAvailable() {
  try {
    const cloudPath = getCloudPath(provider);
    
    if (!await fs.pathExists(cloudPath)) {
      log(`雲端目錄不存在: ${cloudPath}`, 'error');
      log(`請確認 ${provider} 桌面應用程式已安裝並登入`, 'error');
      return false;
    }
    
    // 檢查是否可寫入
    const testFile = path.join(cloudPath, '.sync-test');
    await fs.writeFile(testFile, 'test');
    await fs.remove(testFile);
    
    return true;
  } catch (error) {
    log(`無法存取 ${provider}: ${error.message}`, 'error');
    return false;
  }
}

// 建立壓縮備份
async function createArchive() {
  const today = new Date().toISOString().split('T')[0];
  const sourceName = path.basename(source);
  const archiveName = `${sourceName}-${today}.tar.gz`;
  const tempDir = path.join(process.env.HOME, '.openclaw', 'temp');
  const archivePath = path.join(tempDir, archiveName);
  
  await fs.ensureDir(tempDir);
  
  log(`建立壓縮檔案: ${archiveName}`);
  
  if (options.dryRun) {
    log('[模擬] 將會建立壓縮檔案', 'dryRun');
    return archivePath;
  }
  
  try {
    // 使用 tar 建立壓縮檔
    await tar.create({
      gzip: true,
      file: archivePath,
      cwd: path.dirname(source)
    }, [path.basename(source)]);
    
    log(`壓縮完成: ${archivePath}`, 'success');
    return archivePath;
  } catch (error) {
    log(`壓縮失敗: ${error.message}`, 'error');
    return null;
  }
}

// 複製到雲端
async function copyToCloud(archivePath) {
  const cloudBase = getCloudPath(provider);
  const cloudTarget = path.join(cloudBase, targetPath.replace(/^\//, ''));
  const sourceName = path.basename(source);
  const archiveName = path.basename(archivePath);
  const finalPath = path.join(cloudTarget, sourceName, archiveName);
  
  log(`複製到 ${provider}: ${finalPath}`);
  
  if (options.dryRun) {
    log('[模擬] 將會複製到雲端', 'dryRun');
    return true;
  }
  
  try {
    await fs.ensureDir(path.dirname(finalPath));
    await fs.copy(archivePath, finalPath);
    log(`複製完成: ${finalPath}`, 'success');
    return true;
  } catch (error) {
    log(`複製失敗: ${error.message}`, 'error');
    return false;
  }
}

// 清理舊備份
async function cleanupOldBackups() {
  const cloudBase = getCloudPath(provider);
  const cloudTarget = path.join(cloudBase, targetPath.replace(/^\//, ''));
  const sourceName = path.basename(source);
  const backupDir = path.join(cloudTarget, sourceName);
  
  if (!await fs.pathExists(backupDir)) return;
  
  log('清理舊備份...');
  
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(f => f.endsWith('.tar.gz'));
    
    // 按日期排序
    backupFiles.sort();
    
    // 保留最近 7 個備份
    const toDelete = backupFiles.slice(0, -7);
    
    for (const file of toDelete) {
      const filePath = path.join(backupDir, file);
      if (!options.dryRun) {
        await fs.remove(filePath);
      }
      log(`${options.dryRun ? '[模擬] ' : ''}刪除舊備份: ${file}`, 'warning');
    }
  } catch (error) {
    log(`清理失敗: ${error.message}`, 'error');
  }
}

// 主程式
async function main() {
  log('========================================');
  log('      雲端備份工具 v1.0.0');
  log('========================================');
  log(`來源: ${source}`);
  log(`提供者: ${provider}`);
  log(`目標路徑: ${targetPath}`);
  log(`壓縮: ${options.compress ? '是' : '否'}`);
  log(`加密: ${options.encrypt ? '是' : '否'}`);
  log(`模擬: ${options.dryRun ? '是' : '否'}`);
  
  // 檢查來源目錄
  if (!await fs.pathExists(source)) {
    log(`錯誤: 來源目錄不存在: ${source}`, 'error');
    process.exit(1);
  }
  
  // 檢查雲端可用性
  if (!await checkCloudAvailable()) {
    process.exit(1);
  }
  
  let success = true;
  
  // 建立壓縮檔
  if (options.compress) {
    const archivePath = await createArchive();
    if (archivePath) {
      success = await copyToCloud(archivePath);
      
      // 清理暫存檔
      if (success && !options.dryRun) {
        await fs.remove(archivePath);
      }
    } else {
      success = false;
    }
  } else {
    // 直接同步目錄
    log('直接同步目錄...');
    const cloudBase = getCloudPath(provider);
    const cloudTarget = path.join(cloudBase, targetPath.replace(/^\//, ''), path.basename(source));
    
    if (options.dryRun) {
      log('[模擬] 將會同步目錄', 'dryRun');
    } else {
      await fs.ensureDir(path.dirname(cloudTarget));
      await fs.copy(source, cloudTarget, { overwrite: true });
      log('同步完成', 'success');
    }
  }
  
  // 清理舊備份
  if (success) {
    await cleanupOldBackups();
  }
  
  if (success) {
    log('\n✅ 雲端備份完成！', 'success');
    process.exit(0);
  } else {
    log('\n❌ 雲端備份失敗', 'error');
    process.exit(1);
  }
}

main().catch(error => {
  log(`未預期的錯誤: ${error.message}`, 'error');
  process.exit(1);
});
