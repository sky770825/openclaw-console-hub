import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { SkillCompiler } from '../core/engine.mjs';

const router = express.Router();
const compiler = new SkillCompiler();

// 確保 skills 目錄存在 (根據 AGENTS.md, workspace 在 /Users/sky770825/.openclaw/workspace)
const SKILLS_DIR = path.resolve(process.cwd(), 'skills');

/**
 * POST /api/studio/compile
 * 接收 UI 的 JSON 並呼叫 Core 的轉換邏輯，寫入 SKILL.md
 */
router.post('/compile', async (req, res) => {
  try {
    const graph = req.body;
    
    if (!graph || !graph.nodes) {
      return res.status(400).json({ error: 'Invalid graph data' });
    }

    // 1. 執行編譯
    const markdown = compiler.compile(graph);
    
    // 2. 決定檔名 (預設為 studio-generated-skill.md)
    const skillName = graph.name || 'studio-generated-skill';
    const fileName = `${skillName}.md`;
    const filePath = path.join(SKILLS_DIR, fileName);

    // 3. 確保目錄存在並寫入
    await fs.mkdir(SKILLS_DIR, { recursive: true });
    await fs.writeFile(filePath, markdown, 'utf8');

    res.status(200).json({
      message: 'Skill compiled successfully',
      path: filePath,
      skillName: skillName
    });
  } catch (error) {
    console.error('Compilation Error:', error);
    res.status(500).json({ error: 'Failed to compile skill', details: error.message });
  }
});

export default router;
