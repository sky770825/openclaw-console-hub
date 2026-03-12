#!/usr/bin/env node

/**
 * 備份統計資訊腳本
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { program } = require('commander');

program
  .name('stats')
  .description('備份統計資訊工具')
  .version('1.0.0')
  .option('--config <path>', '設定檔路徑')
  .option('--json', '輸出 JSON 格式', false)
  .parse();

const options = program.opts();

function expandPath(inputPath) {
  if (!inputPath) return null;
  if (inputPath.startsWith('~/')) {
    return path.join(process.env.HOME, inputPath.slice(2));
  }
  return path.resolve(inputPath);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getDirectoryStats(dirPath) {
  let totalSize = 0;
  let fileCount = 0;
  let dirCount = 0;
  
  async function traverse(currentPath) {
    if (!await fs.pathExists(currentPath)) return;
    
    try {
      const items = await fs.readdir(currentPath);
      
      for (const item of items) {
        if (item.startsWith('.')) continue;
        
        const itemPath = path.join(currentPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          dirCount++;
          await traverse(itemPath);
        } else {
          fileCount++;
          totalSize += stat.size;
        }
      }
    } catch (error) {
      // 忽略權限錯誤
    }
  }
  
  await traverse(dirPath);
  
  return { totalSize, fileCount, dirCount };
}

async function main() {
  if (!options.json) {
    console.log(chalk.blue('========================================'));
    console.log(chalk.blue('      備份統計資訊 v1.0.0'));
    console.log(chalk.blue('========================================'));
  }
  
  const stats = {
    timestamp: new Date().toISOString(),
    backups: []
  };
  
  // 預設備份位置
  const defaultBackupPaths = [
    path.join(process.env.HOME, 'Backups'),
    path.join(process.env.HOME, '.openclaw', 'backups')
  ];
  
  // 如果有設定檔，從設定檔讀取
  if (options.config) {
    const configPath = expandPath(options.config);
    if (await fs.pathExists(configPath)) {
      try {
        const config = await fs.readJson(configPath);
        if (config.profiles) {
          for (const profile of config.profiles) {
            if (profile.target) {
              defaultBackupPaths.push(expandPath(profile.target));
            }
          }
        }
      } catch (error) {
        console.error(chalk.red(`無法讀取設定檔: ${error.message}`));
      }
    }
  }
  
  // 去重
  const uniquePaths = [...new Set(defaultBackupPaths)];
  
  for (const backupPath of uniquePaths) {
    if (!await fs.pathExists(backupPath)) continue;
    
    const dirStats = await getDirectoryStats(backupPath);
    
    // 取得最新備份日期
    let latestBackup = null;
    try {
      const items = await fs.readdir(backupPath);
      const dates = items
        .filter(i => /^\d{4}-\d{2}-\d{2}$/.test(i))
        .sort()
        .reverse();
      if (dates.length > 0) {
        latestBackup = dates[0];
      }
    } catch (error) {
      // 忽略
    }
    
    const backupStat = {
      path: backupPath,
      size: dirStats.totalSize,
      formattedSize: formatBytes(dirStats.totalSize),
      files: dirStats.fileCount,
      directories: dirStats.dirCount,
      latestBackup: latestBackup
    };
    
    stats.backups.push(backupStat);
    
    if (!options.json) {
      console.log(chalk.green(`\n📁 ${backupPath}`));
      console.log(`   大小: ${formatBytes(dirStats.totalSize)}`);
      console.log(`   檔案: ${dirStats.fileCount}`);
      console.log(`   目錄: ${dirStats.dirCount}`);
      if (latestBackup) {
        console.log(`   最新備份: ${latestBackup}`);
      }
    }
  }
  
  if (options.json) {
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log(chalk.blue('\n========================================'));
    console.log(`總計: ${stats.backups.length} 個備份位置`);
  }
}

main().catch(error => {
  console.error(chalk.red(`錯誤: ${error.message}`));
  process.exit(1);
});
