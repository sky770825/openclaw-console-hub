const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: true,
  rotateStringArray: true,
  selfDefending: true,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 1,
  transformObjectKeys: true,
  unicodeEscapeSequence: true
};

function obfuscateFile(inputPath, outputPath) {
  const code = fs.readFileSync(inputPath, 'utf8');
  const obfuscated = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
  fs.writeFileSync(outputPath, obfuscated.getObfuscatedCode());
  console.log(`✅ Obfuscated: ${path.basename(inputPath)}`);
}

// Create dist directory
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Obfuscate main files
console.log('🔒 Obfuscating source code...\n');

obfuscateFile(
  path.join(__dirname, 'index.js'),
  path.join(distDir, 'index.js')
);

obfuscateFile(
  path.join(__dirname, 'config.js'),
  path.join(distDir, 'config.js')
);

obfuscateFile(
  path.join(__dirname, 'license', 'verify.js'),
  path.join(distDir, 'verify.js')
);

obfuscateFile(
  path.join(__dirname, 'actions', 'issue.js'),
  path.join(distDir, 'issue.js')
);

obfuscateFile(
  path.join(__dirname, 'actions', 'pr.js'),
  path.join(distDir, 'pr.js')
);

obfuscateFile(
  path.join(__dirname, 'actions', 'release.js'),
  path.join(distDir, 'release.js')
);

obfuscateFile(
  path.join(__dirname, 'license', 'machine.js'),
  path.join(distDir, 'machine.js')
);

obfuscateFile(
  path.join(__dirname, 'license', 'cloud-verify.js'),
  path.join(distDir, 'cloud-verify.js')
);

obfuscateFile(
  path.join(__dirname, 'license', 'verify.js'),
  path.join(distDir, 'verify.js')
);

// Copy package.json
fs.copyFileSync(
  path.join(__dirname, 'package.json'),
  path.join(distDir, 'package.json')
);

console.log('\n📦 Creating distribution package...\n');

// Create tar.gz
const { execSync } = require('child_process');
const packageName = 'skillforge-github-automation-1.0.0';
const outputDir = path.join(__dirname, '..');

process.chdir(distDir);
execSync(`tar -czf ${path.join(outputDir, packageName + '.tgz')} .`, { stdio: 'inherit' });

console.log(`\n🎉 Package created: ${packageName}.tgz`);
console.log(`📍 Location: ${path.join(outputDir, packageName + '.tgz')}`);
