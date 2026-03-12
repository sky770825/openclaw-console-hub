#!/usr/bin/env node

/**
 * 排程管理腳本
 * 使用 node-cron 實現定時任務
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { program } = require('commander');
const cron = require('node-cron');
const { spawn } = require('child_process');

program
  .name('schedule')
  .description('排程管理工具')
  .version('1.0.0')
  .option('--task <name>', '任務名稱')
  .option('--cron <expression>', 'Cron 表達式')
  .option('--script <name>', '要執行的腳本')
  .option('--action <action>', '動作: add, remove, list, run', 'list')
  .option('--config <path>', '設定檔路徑')
  .option('--daemon', '以守護程序模式執行', false)
  .parse();

const options = program.opts();

function expandPath(inputPath) {
  if (!inputPath) return null;
  if (inputPath.startsWith('~/')) {
    return path.join(process.env.HOME, inputPath.slice(2));
  }
  return path.resolve(inputPath);
}

const configPath = expandPath(options.config) || path.join(process.env.HOME, '.openclaw', 'config', 'file-sync-schedule.json');
const scriptsDir = path.join(__dirname);

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const levels = {
    info: chalk.blue('INFO'),
    success: chalk.green('SUCCESS'),
    warning: chalk.yellow('WARNING'),
    error: chalk.red('ERROR')
  };
  
  const levelStr = levels[level] || levels.info;
  console.log(`[${timestamp}] ${levelStr}: ${message}`);
}

// 載入設定
async function loadConfig() {
  if (await fs.pathExists(configPath)) {
    return await fs.readJson(configPath);
  }
  return { tasks: [] };
}

// 儲存設定
async function saveConfig(config) {
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJson(configPath, config, { spaces: 2 });
}

// 驗證 cron 表達式
function validateCron(expression) {
  return cron.validate(expression);
}

// 新增任務
async function addTask() {
  if (!options.task || !options.cron || !options.script) {
    log('錯誤: 新增任務需要 --task, --cron 和 --script 參數', 'error');
    return false;
  }
  
  if (!validateCron(options.cron)) {
    log(`錯誤: 無效的 Cron 表達式: ${options.cron}`, 'error');
    log('格式: 分 時 日 月 星期', 'info');
    log('範例: "0 2 * * *" = 每日凌晨 2 點', 'info');
    return false;
  }
  
  const config = await loadConfig();
  
  const existingIndex = config.tasks.findIndex(t => t.name === options.task);
  
  const task = {
    name: options.task,
    cron: options.cron,
    script: options.script,
    enabled: true,
    createdAt: new Date().toISOString()
  };
  
  if (existingIndex >= 0) {
    config.tasks[existingIndex] = task;
    log(`更新任務: ${options.task}`, 'success');
  } else {
    config.tasks.push(task);
    log(`新增任務: ${options.task}`, 'success');
  }
  
  await saveConfig(config);
  log(`執行時間: ${options.cron}`);
  log(`腳本: ${options.script}`);
  
  return true;
}

// 移除任務
async function removeTask() {
  if (!options.task) {
    log('錯誤: 移除任務需要 --task 參數', 'error');
    return false;
  }
  
  const config = await loadConfig();
  const initialLength = config.tasks.length;
  
  config.tasks = config.tasks.filter(t => t.name !== options.task);
  
  if (config.tasks.length === initialLength) {
    log(`任務不存在: ${options.task}`, 'warning');
    return false;
  }
  
  await saveConfig(config);
  log(`移除任務: ${options.task}`, 'success');
  return true;
}

// 列出任務
async function listTasks() {
  const config = await loadConfig();
  
  if (config.tasks.length === 0) {
    log('沒有設定任何排程任務');
    return;
  }
  
  log('已設定的排程任務:');
  log('='.repeat(60));
  
  config.tasks.forEach((task, index) => {
    const status = task.enabled ? chalk.green('啟用') : chalk.red('停用');
    log(`\n[${index + 1}] ${task.name}`);
    log(`    狀態: ${status}`);
    log(`    時間: ${task.cron}`);
    log(`    腳本: ${task.script}`);
    log(`    建立: ${task.createdAt}`);
  });
  
  log('\n' + '='.repeat(60));
  log(`共 ${config.tasks.length} 個任務`);
}

// 執行腳本
function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(scriptsDir, `${scriptName}.js`);
    
    log(`執行腳本: ${scriptPath}`);
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`腳本退出碼: ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

// 執行特定任務
async function runTask() {
  if (!options.task) {
    log('錯誤: 執行任務需要 --task 參數', 'error');
    return false;
  }
  
  const config = await loadConfig();
  const task = config.tasks.find(t => t.name === options.task);
  
  if (!task) {
    log(`任務不存在: ${options.task}`, 'error');
    return false;
  }
  
  log(`執行任務: ${options.task}`);
  
  try {
    await runScript(task.script);
    log(`任務完成: ${options.task}`, 'success');
    return true;
  } catch (error) {
    log(`任務失敗: ${error.message}`, 'error');
    return false;
  }
}

// 守護程序模式
async function runDaemon() {
  log('啟動排程守護程序...');
  
  const config = await loadConfig();
  
  if (config.tasks.length === 0) {
    log('沒有設定任何排程任務');
    return;
  }
  
  log(`載入 ${config.tasks.length} 個排程任務`);
  
  // 為每個啟用的任務建立 cron job
  config.tasks.forEach(task => {
    if (!task.enabled) {
      log(`跳過停用任務: ${task.name}`, 'warning');
      return;
    }
    
    if (!validateCron(task.cron)) {
      log(`無效的 Cron 表達式: ${task.name} - ${task.cron}`, 'error');
      return;
    }
    
    log(`排程任務: ${task.name} (${task.cron})`);
    
    cron.schedule(task.cron, async () => {
      log(`執行排程任務: ${task.name}`);
      try {
        await runScript(task.script);
        log(`排程任務完成: ${task.name}`, 'success');
      } catch (error) {
        log(`排程任務失敗: ${task.name} - ${error.message}`, 'error');
      }
    });
  });
  
  log('守護程序已啟動，按 Ctrl+C 停止');
  
  // 保持程序運行
  process.stdin.resume();
}

// 主程式
async function main() {
  log('========================================');
  log('      排程管理工具 v1.0.0');
  log('========================================');
  
  switch (options.action) {
    case 'add':
      const addSuccess = await addTask();
      process.exit(addSuccess ? 0 : 1);
      break;
      
    case 'remove':
      const removeSuccess = await removeTask();
      process.exit(removeSuccess ? 0 : 1);
      break;
      
    case 'list':
      await listTasks();
      process.exit(0);
      break;
      
    case 'run':
      const runSuccess = await runTask();
      process.exit(runSuccess ? 0 : 1);
      break;
      
    default:
      log(`未知的動作: ${options.action}`, 'error');
      process.exit(1);
  }
}

// 如果是守護程序模式
if (options.daemon) {
  runDaemon().catch(error => {
    log(`守護程序錯誤: ${error.message}`, 'error');
    process.exit(1);
  });
} else {
  main().catch(error => {
    log(`未預期的錯誤: ${error.message}`, 'error');
    process.exit(1);
  });
}
