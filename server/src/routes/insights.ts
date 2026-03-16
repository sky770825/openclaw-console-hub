import { Router, json } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INSIGHTS_FILE = path.resolve(__dirname, '../../data/insights.json');

function readInsights(): any[] {
  try {
    return JSON.parse(fs.readFileSync(INSIGHTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeInsights(data: any[]) {
  fs.mkdirSync(path.dirname(INSIGHTS_FILE), { recursive: true });
  fs.writeFileSync(INSIGHTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const router = Router();
router.use(json());

// GET /api/openclaw/insights — 列出所有構想
router.get('/', (_req, res) => {
  res.json(readInsights());
});

// POST /api/openclaw/insights — 新增構想
router.post('/', (req, res) => {
  const { title, category, insight, value } = req.body;
  if (!title || !insight) {
    return res.status(400).json({ error: 'title and insight are required' });
  }
  const list = readInsights();
  const entry = {
    id: `ins-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    title,
    category: category || 'general',
    insight,
    value: value || '',
    sent: false,
  };
  list.push(entry);
  writeInsights(list);
  res.json({ ok: true, entry });
});

// POST /api/openclaw/insights/mark-sent — 標記已發送
router.post('/mark-sent', (req, res) => {
  const list = readInsights();
  const unsent = list.filter((i: any) => !i.sent);
  unsent.forEach((i: any) => { i.sent = true; });
  writeInsights(list);
  res.json({ ok: true, marked: unsent.length });
});

// GET /api/openclaw/insights/unsent — 取得未發送的（給 n8n 用）
router.get('/unsent', (_req, res) => {
  const list = readInsights();
  res.json(list.filter((i: any) => !i.sent));
});

export default router;
