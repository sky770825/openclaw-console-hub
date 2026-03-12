import fs from 'fs';
import path from 'path';
import { SkillCompiler } from '../core/engine.mjs';

/**
 * 模擬 Bridge 的測試腳本 (不依賴 express)
 */
async function testCompilation() {
  const SKILLS_DIR = path.resolve(process.cwd(), 'skills');
  const compiler = new SkillCompiler();
  
  const testGraphPath = path.resolve('projects/openclaw-studio/cells/bridge/test-graph.json');
  const graph = JSON.parse(fs.readFileSync(testGraphPath, 'utf8'));
  
  console.log('--- Compiling Graph ---');
  const markdown = compiler.compile(graph);
  console.log(markdown);
  
  const skillName = graph.name || 'studio-generated-skill';
  const filePath = path.join(SKILLS_DIR, `${skillName}.md`);
  
  if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
  }
  
  fs.writeFileSync(filePath, markdown, 'utf8');
  console.log(`--- File written to: ${filePath} ---`);
}

testCompilation().catch(console.error);
