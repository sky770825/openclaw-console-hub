#!/usr/bin/env node

/**
 * 本地目錄同步腳本
 * 支援單向/雙向同步、排除模式、模擬執行
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const { program } = require('commander');

program
  .name('local-sync')
  .description('本地目錄同步工具')
  .version('1.0.0')
  .requiredOption('--source <path>', '來源目錄')
  .requiredOption('--target <path>', '目標目錄')
  .option('--bidirectional', '啟用雙向同步', false)
  .option('--delete', '刪除目標中多餘的檔案', false)
  .option('--dry-run', '模擬執行，不實際變更', false)
  .option('--exclude <pattern>', '排除檔案模式', [])
  .option('--log <path>', '日誌檔案路徑')
  .parse();

const options = program.opts();

// 展開家目錄
function expandPath(inputPath) {
  if (inputPath.startsWith('~/')) {
    return path.join(process.env.HOME, inputPath.slice(2));
  }
  return path.resolve(inputPath);
}

const source = expandPath(options.source);
const target = expandPath(options.target);
const logPath = options.log ? expandPath(options.log) : null;

// 日誌函數
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

// 檢查 rsync 是否可用
function checkRsync() {
  try {
    execSync('which rsync', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// 使用 rsync 同步
function rsyncSync(src, dst, opts = {}) {
  const args = ['-av', '--progress'];
  
  if (opts.delete) args.push('--delete');
  if (opts.dryRun) args.push('-n');
  
  // 排除模式
  opts.exclude = opts.exclude || [];
  if (!Array.isArray(opts.exclude)) {
    opts.exclude = [opts.exclude];
  }
  opts.exclude.forEach(pattern => {
    args.push('--exclude', pattern);
  });
  
  args.push(src.endsWith('/') ? src : src + '/', dst);
  
  log(`執行: rsync ${args.join(' ')}`);
  
  if (opts.dryRun) {
    log('模擬模式 - 不會實際變更檔案', 'dryRun');
  }
  
  try {
    const result = execSync(`rsync ${args.join(' ')}`, { 
      encoding: 'utf8',
      stdio: opts.dryRun ? 'pipe' : 'inherit'
    });
    
    if (opts.dryRun && result) {
      log('預計變更:\n' + result, 'dryRun');
    }
    
    return true;
  } catch (error) {
    log(`rsync 失敗: ${error.message}`, 'error');
    return false;
  }
}

// 使用 Node.js 同步（rsync 不可用時的後備方案）
async function nodeSync(src, dst, opts = {}) {
  log('使用 Node.js 內建同步...');
  
  const stats = {
    copied: 0,
    updated: 0,
    deleted: 0,
    errors: 0
  };
  
  const excludePatterns = opts.exclude || [];
  
  function shouldExclude(filePath) {
    const basename = path.basename(filePath);
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(basename);
      }
      return basename === pattern;
    });
  }
  
  async function syncDir(srcDir, dstDir) {
    if (!await fs.pathExists(srcDir)) {
      log(`來源目錄不存在: ${srcDir}`, 'error');
      return;
    }
    
    await fs.ensureDir(dstDir);
    
    const items = await fs.readdir(srcDir);
    
    for (const item of items) {
      const srcPath = path.join(srcDir, item);
      const dstPath = path.join(dstDir, item);
      
      if (shouldExclude(srcPath)) {
        log(`排除: ${srcPath}`, 'info');
        continue;
      }
      
      const srcStat = await fs.stat(srcPath);
      
      if (srcStat.isDirectory()) {
        await syncDir(srcPath, dstPath);
      } else {
        try {
          const dstExists = await fs.pathExists(dstPath);
          
          if (!dstExists) {
            if (!opts.dryRun) {
              await fs.copy(srcPath, dstPath, { preserveTimestamps: true });
            }
            log(`${opts.dryRun ? '[預計] ' : ''}複製: ${srcPath} -> ${dstPath}`, 
                opts.dryRun ? 'dryRun' : 'success');
            stats.copied++;
          } else {
            const dstStat = await fs.stat(dstPath);
            if (srcStat.mtime > dstStat.mtime || srcStat.size !== dstStat.size) {
              if (!opts.dryRun) {
                await fs.copy(srcPath, dstPath, { preserveTimestamps: true });
              }
              log(`${opts.dryRun ? '[預計] ' : ''}更新: ${srcPath} -> ${dstPath}`,
                  opts.dryRun ? 'dryRun' : 'success');
              stats.updated++;
            }
          }
        } catch (error) {
          log(`錯誤處理 ${srcPath}: ${error.message}`, 'error');
          stats.errors++;
        }
      }
    }
    
    // 處理刪除
    if (opts.delete) {
      const dstItems = await fs.readdir(dstDir);
      for (const item of dstItems) {
        const srcPath = path.join(srcDir, item);
        const dstPath = path.join(dstDir, item);
        
        if (!await fs.pathExists(srcPath)) {
          if (!opts.dryRun) {
            await fs.remove(dstPath);
          }
          log(`${opts.dryRun ? '[預計] ' : ''}刪除: ${dstPath}`,
              opts.dryRun ? 'dryRun' : 'warning');
          stats.deleted++;
        }
      }
    }
  }
  
  await syncDir(src, dst);
  
  log(`\n同步統計:`);
  log(`  複製: ${stats.copied}`);
  log(`  更新: ${stats.updated}`);
  log(`  刪除: ${stats.deleted}`);
  log(`  錯誤: ${stats.errors}`);
  
  return stats.errors === 0;
}

// 主程式
async function main() {
  log('========================================');
  log('      本地目錄同步工具 v1.0.0');
  log('========================================');
  log(`來源: ${source}`);
  log(`目標: ${target}`);
  log(`模式: ${options.bidirectional ? '雙向' : '單向'}同步`);
  log(`刪除: ${options.delete ? '是' : '否'}`);
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
  
  const useRsync = checkRsync();
  let success = true;
  
  // 第一次同步：來源 -> 目標
  if (useRsync) {
    success = rsyncSync(source, target, options);
  } else {
    success = await nodeSync(source, target, options);
  }
  
  // 雙向同步
  if (options.bidirectional && success && !options.dryRun) {
    log('\n執行反向同步...', 'info');
    if (useRsync) {
      success = rsyncSync(target, source, { ...options, delete: false });
    } else {
      success = await nodeSync(target, source, { ...options, delete: false });
    }
  }
  
  if (success) {
    log('\n✅ 同步完成！', 'success');
    process.exit(0);
  } else {
    log('\n❌ 同步失敗', 'error');
    process.exit(1);
  }
}

main().catch(error => {
  log(`未預期的錯誤: ${error.message}`, 'error');
  process.exit(1);
});
