#!/usr/bin/env node

/**
 * 批次同步腳本
 * 根據設定檔批量執行多個同步任務
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { program } = require('commander');
const { spawn } = require('child_process');

program
  .name('batch-sync')
  .description('批次同步工具')
  .version('1.0.0')
  .requiredOption('--config <path>', '設定檔路徑')
  .option('--dry-run', '模擬執行', false)
  .option('--parallel', '平行執行', false)
  .parse();

const options = program.opts();

function expandPath(inputPath) {
  if (inputPath.startsWith('~/')) {
    return path.join(process.env.HOME, inputPath.slice(2));
  }
  return path.resolve(inputPath);
}

const configPath = expandPath(options.config);

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

// 執行腳本
function runScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, `${scriptName}.js`);
    
    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`腳本不存在: ${scriptPath}`));
      return;
    }
    
    const allArgs = [scriptPath, ...args];
    if (options.dryRun) {
      allArgs.push('--dry-run');
    }
    
    log(`執行: node ${allArgs.join(' ')}`);
    
    const child = spawn('node', allArgs, {
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`腳本退出碼: ${code}\n${stderr}`));
      }
    });
    
    child.on('error', reject);
  });
}

// 執行單一設定檔任務
async function runProfile(profile) {
  log(`\n執行設定檔: ${profile.name}`);
  log(`類型: ${profile.type}`);
  
  try {
    if (profile.type === 'local') {
      const args = [
        '--source', profile.source,
        '--target', profile.target
      ];
      
      if (profile.options?.delete) args.push('--delete');
      if (profile.options?.bidirectional) args.push('--bidirectional');
      
      if (profile.options?.exclude) {
        profile.options.exclude.forEach(pattern => {
          args.push('--exclude', pattern);
        });
      }
      
      await runScript('local-sync', args);
    } else if (profile.type === 'cloud') {
      const args = [
        '--source', profile.source,
        '--provider', profile.provider
      ];
      
      if (profile.target) args.push('--target-path', profile.target);
      if (profile.options?.incremental) args.push('--incremental');
      if (profile.options?.encrypt) args.push('--encrypt');
      
      await runScript('cloud-backup', args);
    } else if (profile.type === 'incremental') {
      const args = [
        '--source', profile.source,
        '--target', profile.target
      ];
      
      if (profile.options?.retention) {
        args.push('--retention', profile.options.retention.toString());
      }
      
      await runScript('incremental-backup', args);
    }
    
    log(`設定檔完成: ${profile.name}`, 'success');
    return true;
  } catch (error) {
    log(`設定檔失敗: ${profile.name} - ${error.message}`, 'error');
    return false;
  }
}

// 主程式
async function main() {
  log('========================================');
  log('      批次同步工具 v1.0.0');
  log('========================================');
  log(`設定檔: ${configPath}`);
  log(`模擬模式: ${options.dryRun ? '是' : '否'}`);
  log(`平行執行: ${options.parallel ? '是' : '否'}`);
  
  if (!await fs.pathExists(configPath)) {
    log(`設定檔不存在: ${configPath}`, 'error');
    process.exit(1);
  }
  
  let config;
  try {
    config = await fs.readJson(configPath);
  } catch (error) {
    log(`無法解析設定檔: ${error.message}`, 'error');
    process.exit(1);
  }
  
  if (!config.profiles || config.profiles.length === 0) {
    log('設定檔中沒有定義任何設定檔');
    process.exit(0);
  }
  
  log(`\n找到 ${config.profiles.length} 個設定檔`);
  
  const results = [];
  
  if (options.parallel) {
    // 平行執行
    log('平行執行所有設定檔...');
    const promises = config.profiles.map(async (profile) => {
      const success = await runProfile(profile);
      results.push({ name: profile.name, success });
    });
    await Promise.all(promises);
  } else {
    // 循序執行
    for (const profile of config.profiles) {
      const success = await runProfile(profile);
      results.push({ name: profile.name, success });
    }
  }
  
  // 輸出摘要
  log('\n' + '='.repeat(40));
  log('執行摘要:');
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  results.forEach(r => {
    const status = r.success ? chalk.green('✓') : chalk.red('✗');
    log(`  ${status} ${r.name}`);
  });
  
  log(`\n成功: ${successCount} / 失敗: ${failCount}`);
  
  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  log(`未預期的錯誤: ${error.message}`, 'error');
  process.exit(1);
});
