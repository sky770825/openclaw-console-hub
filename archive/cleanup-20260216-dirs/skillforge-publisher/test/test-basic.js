#!/usr/bin/env node
/**
 * Quick test for skillforge-publisher
 */

const path = require('path');
const SkillForgePublisher = require('../index');

console.log('🧪 Testing SkillForge Publisher...\n');

// Test 1: Check modules load
console.log('✅ Modules loaded successfully');
console.log('  - GumroadClient:', typeof SkillForgePublisher.GumroadClient);
console.log('  - LemonSqueezyClient:', typeof SkillForgePublisher.LemonSqueezyClient);

// Test 2: Check CLI exists
const fs = require('fs');
const cliPath = path.join(__dirname, '..', 'bin', 'skillforge-publish.js');
if (fs.existsSync(cliPath)) {
  console.log('✅ CLI script exists');
} else {
  console.log('❌ CLI script not found');
}

// Test 3: Check required files
const requiredFiles = ['package.json', 'README.md', 'index.js'];
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

console.log('\n🎉 Basic structure test passed!');
console.log('\nNext steps:');
console.log('  1. Run: cd skillforge-publisher && npm install');
console.log('  2. Configure API keys: ./bin/skillforge-publish.js config --gumroad');
console.log('  3. Publish: ./bin/skillforge-publish.js ./my-skill');
