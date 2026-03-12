#!/usr/bin/env node
/**
 * Quick test for skillforge-publisher (no deps required)
 */

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing SkillForge Publisher Structure...\n');

const baseDir = path.join(__dirname, '..');

// Test 1: Check CLI exists
const cliPath = path.join(baseDir, 'bin', 'skillforge-publish.js');
if (fs.existsSync(cliPath)) {
  const stats = fs.statSync(cliPath);
  console.log(`✅ CLI script exists (${(stats.size / 1024).toFixed(1)} KB)`);
} else {
  console.log('❌ CLI script not found');
  process.exit(1);
}

// Test 2: Check required files
const requiredFiles = ['package.json', 'README.md', 'index.js'];
requiredFiles.forEach(file => {
  const filePath = path.join(baseDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} exists (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`❌ ${file} missing`);
    process.exit(1);
  }
});

// Test 3: Check lib files
const libFiles = ['gumroad.js', 'lemonsqueezy.js'];
libFiles.forEach(file => {
  const filePath = path.join(baseDir, 'lib', file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ lib/${file} exists (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`❌ lib/${file} missing`);
  }
});

// Test 4: Parse package.json
const pkg = JSON.parse(fs.readFileSync(path.join(baseDir, 'package.json'), 'utf8'));
console.log(`\n📦 Package: ${pkg.name}@${pkg.version}`);
console.log(`   Description: ${pkg.description}`);
console.log(`   Bin: ${Object.keys(pkg.bin || {}).join(', ')}`);
console.log(`   Dependencies: ${Object.keys(pkg.dependencies || {}).length}`);

console.log('\n🎉 Structure test passed!');
console.log('\n📋 Project Stats:');

// Count total lines of code
let totalLines = 0;
function countLines(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && file !== 'node_modules') {
      countLines(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      totalLines += content.split('\n').length;
    }
  });
}
countLines(baseDir);
console.log(`   Total lines: ~${totalLines}`);

console.log('\n🚀 Next steps:');
console.log('   1. cd skillforge-publisher');
console.log('   2. npm install');
console.log('   3. npm link (to use globally)');
console.log('   4. skillforge-publish --help');
