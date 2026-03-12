import fs from 'fs/promises';
import path from 'path';
import { SkillCompiler } from '../core/engine.mjs';

const compiler = new SkillCompiler();
const SKILLS_DIR = path.resolve(process.cwd(), 'skills');

export async function handleCompile(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const graph = JSON.parse(body);
      
      if (!graph || !graph.nodes) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid graph data' }));
        return;
      }

      const markdown = compiler.compile(graph);
      const skillName = graph.name || 'studio-generated-skill';
      const fileName = `${skillName}.md`;
      const filePath = path.join(SKILLS_DIR, fileName);

      await fs.mkdir(SKILLS_DIR, { recursive: true });
      await fs.writeFile(filePath, markdown, 'utf8');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Skill compiled successfully',
        path: filePath,
        skillName: skillName
      }));
    } catch (error) {
      console.error('Compilation Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to compile skill', details: error.message }));
    }
  });
}
