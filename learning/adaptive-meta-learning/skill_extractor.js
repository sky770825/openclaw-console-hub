#!/usr/bin/env node

/**
 * Skill Extractor
 * 從任務錨點中識別並提取可遷移技能
 */

import fs from 'fs';
import path from 'path';

const ANCHORS_DIR = './memory/anchors';
const SKILLS_DIR = './learning/adaptive-meta-learning/skills';

if (!fs.existsSync(SKILLS_DIR)) {
  fs.mkdirSync(SKILLS_DIR, { recursive: true });
}

async function extractSkillFromAnchor(anchorFile) {
  const content = fs.readFileSync(path.join(ANCHORS_DIR, anchorFile), 'utf-8');
  
  console.log(`Analyzing anchor: ${anchorFile}...`);
  
  // 識別「架構設計/記憶系統」模式
  if (content.includes('架構') || (content.includes('memory') && content.includes('system'))) {
    const skill = {
      skill_id: `skill-arch-design-${Date.now()}`,
      name: "系統架構模組化設計",
      description: "設計多層級（如三層記憶體）的系統架構，並定義各層職責與互動流程",
      procedure: {
        steps: [
          { action: "define_layers", params: { layers: ["hot", "cold", "anchor"] } },
          { action: "map_responsibilities", params: { layer_mapping: "dict" } },
          { action: "establish_flow", params: { trigger: "event", target: "layer" } }
        ]
      },
      metadata: {
        source_task: anchorFile,
        extracted_at: new Date().toISOString()
      }
    };
    
    fs.writeFileSync(
      path.join(SKILLS_DIR, `${skill.skill_id}.json`),
      JSON.stringify(skill, null, 2)
    );
    console.log(`Extracted new skill: ${skill.name}`);
  }
}

// 掃描最近的錨點
const files = fs.readdirSync(ANCHORS_DIR).filter(f => f.endsWith('.md'));
files.forEach(extractSkillFromAnchor);
