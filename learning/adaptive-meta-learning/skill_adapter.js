#!/usr/bin/env node

/**
 * Skill Adapter
 * 根據新任務情境，判斷並適應現有技能
 */

import fs from 'fs';
import path from 'path';

const SKILLS_DIR = './learning/adaptive-meta-learning/skills';

async function matchSkills(taskDescription) {
  const skills = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.json'));
  const matches = [];

  for (const file of skills) {
    const skill = JSON.parse(fs.readFileSync(path.join(SKILLS_DIR, file), 'utf-8'));
    
    // 簡單的關鍵字匹配
    const keywords = skill.description.split(/[\s（），、]/).filter(Boolean);
    const isMatch = keywords.some(kw => taskDescription.toLowerCase().includes(kw.toLowerCase())) ||
                    taskDescription.includes("架構") || taskDescription.includes("設計");
    
    if (isMatch) {
      matches.push(skill);
    }
  }

  return matches;
}

const task = process.argv[2] || "幫我分析一下 n8n 的日誌，如果有錯誤就修復它";
console.log(`Current Task: ${task}`);

matchSkills(task).then(matches => {
  if (matches.length > 0) {
    console.log(`Found ${matches.length} relevant skills:`);
    matches.forEach(s => {
      console.log(`- [${s.name}]: ${s.description}`);
      console.log(`  Adaptive Action: 載入此技能並準備執行步驟 ${s.procedure.steps[0].action}`);
    });
  } else {
    console.log("No existing skills match this task. Learning mode activated.");
  }
});
