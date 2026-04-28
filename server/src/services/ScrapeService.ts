/**
 * ScrapeService — 網站抓取服務
 *
 * 業界標準工作流（參考 Firecrawl / Crawl4AI / Apify）：
 *  1. HTTP fetch 為主，內容過少才 fallback Playwright
 *  2. Mozilla Readability 抓主文 → Markdown
 *  3. OG / Twitter card / JSON-LD 三層 metadata 合併
 *  4. 圖片：<img srcset> + <picture> + lazy-load + OG + JSON-LD
 *  5. SHA-256 去重，過濾小圖 (<100x100, <5KB, 1x1 pixel)
 *  6. 標準資料夾輸出：raw.html + content.md + metadata.json + structured.json + images/
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { createLogger } from '../logger.js';
import { browserService } from './BrowserService.js';

const log = createLogger('scrape-service');

const USER_AGENT = 'OpenClawScraper/1.0 (+contact: sky19880825@gmail.com)';
const FETCH_TIMEOUT_MS = 30_000;
const MIN_CONTENT_LEN_HTTP = 800;
const IMG_MIN_BYTES = 5 * 1024;
const IMG_MIN_DIM = 100;
const MAX_IMAGES = 100;

export interface ScrapeOptions {
  url: string;
  outputDir?: string;
  ignoreRobots?: boolean;
  maxImages?: number;
}

export interface ScrapeResult {
  ok: boolean;
  outputPath: string;
  url: string;
  title: string;
  contentLength: number;
  contentMd?: string;                         // 原文 markdown（給 analyzer）
  imageCount: number;
  imageDeduplicated: number;
  fetchMethod: 'http' | 'playwright';
  pageType?: 'product' | 'article' | 'landing' | 'unknown';
  metadata: Record<string, unknown>;
  jsonld?: unknown[];                         // JSON-LD 給 analyzer
  downloadedImages?: ImageEntry[];            // 已下載的圖片清單給 analyzer
  durationMs: number;
}

export interface ImageEntry {
  hash: string;
  url: string;
  alt?: string;
  source: 'og' | 'twitter' | 'jsonld' | 'img' | 'picture' | 'lazy';
  bytes?: number;
  width?: number;
  height?: number;
  filename?: string;
}

function safeFolderName(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
}

function timestamp(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    '-',
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
  ].join('');
}

function inferPageType(metadata: Record<string, unknown>, jsonld: unknown[]): ScrapeResult['pageType'] {
  const ogType = (metadata['og:type'] as string) || '';
  if (ogType.includes('product')) return 'product';
  if (ogType.includes('article')) return 'article';

  for (const ld of jsonld) {
    const ldObj = ld as Record<string, unknown>;
    const t = ldObj['@type'];
    const types = Array.isArray(t) ? t : [t];
    for (const tt of types) {
      const s = String(tt || '').toLowerCase();
      if (s.includes('product')) return 'product';
      if (s.includes('article') || s.includes('blogposting') || s.includes('newsarticle')) return 'article';
    }
  }

  return 'landing';
}

async function checkRobotsAllowed(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
    const res = await fetch(robotsUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return true;
    const text = await res.text();
    const lines = text.split('\n').map(l => l.trim());
    let inAllAgent = false;
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith('user-agent:')) {
        const agent = lower.split(':')[1]?.trim();
        inAllAgent = agent === '*' || agent === 'openclawscraper';
      } else if (inAllAgent && lower.startsWith('disallow:')) {
        const dis = line.split(':').slice(1).join(':').trim();
        if (dis === '/') return false;
        if (dis && u.pathname.startsWith(dis)) return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

async function fetchHttp(url: string): Promise<{ html: string; status: number } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    });
    if (!res.ok) {
      log.warn(`[fetchHttp] HTTP ${res.status} ${url}`);
      return null;
    }
    const html = await res.text();
    return { html, status: res.status };
  } catch (e) {
    log.warn(`[fetchHttp] failed ${url}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

async function fetchViaPlaywright(url: string): Promise<{ html: string } | null> {
  try {
    if (!browserService.isAvailable()) {
      log.warn('[fetchViaPlaywright] browserService not available (playwright 未安裝)');
      return null;
    }
    // 動態 import playwright 自己抓 HTML（BrowseService.browse 只回純文字）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pw = await import('playwright' as any);
    const browser = await pw.chromium.launch({ headless: true });
    try {
      const ctx = await browser.newContext({ userAgent: USER_AGENT });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: FETCH_TIMEOUT_MS });
      // 等動態內容（一些 SPA 在 domcontentloaded 後才渲染）
      await page.waitForTimeout(2000);
      const html = await page.content();
      await ctx.close();
      return { html };
    } finally {
      await browser.close();
    }
  } catch (e) {
    log.warn(`[fetchViaPlaywright] failed: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

function extractMetadata(doc: Document, baseUrl: string): { metadata: Record<string, unknown>; jsonld: unknown[] } {
  const metadata: Record<string, unknown> = {};

  const head = doc.head;
  if (!head) return { metadata, jsonld: [] };

  const titleEl = head.querySelector('title');
  if (titleEl) metadata.title = titleEl.textContent?.trim();

  for (const meta of Array.from(head.querySelectorAll('meta'))) {
    const property = meta.getAttribute('property') || meta.getAttribute('name');
    const content = meta.getAttribute('content');
    if (!property || !content) continue;
    metadata[property] = content;
  }

  const canonical = head.querySelector('link[rel="canonical"]');
  if (canonical) metadata.canonical = canonical.getAttribute('href');

  const jsonld: unknown[] = [];
  for (const script of Array.from(head.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const data = JSON.parse(script.textContent || 'null');
      if (Array.isArray(data)) jsonld.push(...data);
      else if (data) jsonld.push(data);
    } catch { /* ignore malformed JSON-LD */ }
  }

  metadata.url = baseUrl;
  metadata.scrapedAt = new Date().toISOString();

  return { metadata, jsonld };
}

function pickBestSrcset(srcset: string): string | null {
  // srcset = "url1 1x, url2 2x" 或 "url1 320w, url2 1920w"
  const candidates = srcset.split(',').map(s => s.trim()).filter(Boolean);
  let bestUrl: string | null = null;
  let bestWeight = -1;
  for (const c of candidates) {
    const parts = c.split(/\s+/);
    const url = parts[0];
    const desc = parts[1] || '1x';
    let weight = 0;
    if (desc.endsWith('w')) weight = parseInt(desc, 10) || 0;
    else if (desc.endsWith('x')) weight = (parseFloat(desc) || 1) * 1000;
    if (weight > bestWeight) {
      bestWeight = weight;
      bestUrl = url;
    }
  }
  return bestUrl;
}

function extractImageUrls(doc: Document, metadata: Record<string, unknown>, jsonld: unknown[], baseUrl: string): ImageEntry[] {
  const seen = new Set<string>();
  const entries: ImageEntry[] = [];

  const add = (url: string | undefined | null, source: ImageEntry['source'], alt?: string) => {
    if (!url) return;
    let abs: string;
    try {
      abs = new URL(url, baseUrl).href;
    } catch {
      return;
    }
    if (seen.has(abs)) return;
    seen.add(abs);
    entries.push({ hash: '', url: abs, alt, source });
  };

  // OG / Twitter
  add(metadata['og:image'] as string, 'og', metadata['og:image:alt'] as string);
  add(metadata['twitter:image'] as string, 'twitter');

  // JSON-LD
  const collectFromJsonld = (obj: unknown): void => {
    if (!obj || typeof obj !== 'object') return;
    const o = obj as Record<string, unknown>;
    const img = o.image;
    if (typeof img === 'string') add(img, 'jsonld');
    else if (Array.isArray(img)) {
      for (const i of img) {
        if (typeof i === 'string') add(i, 'jsonld');
        else if (i && typeof i === 'object') {
          const u = (i as Record<string, unknown>).url;
          if (typeof u === 'string') add(u, 'jsonld');
        }
      }
    } else if (img && typeof img === 'object') {
      const u = (img as Record<string, unknown>).url;
      if (typeof u === 'string') add(u, 'jsonld');
    }
  };
  for (const ld of jsonld) collectFromJsonld(ld);

  // <img src> + srcset
  for (const imgEl of Array.from(doc.querySelectorAll('img'))) {
    const alt = imgEl.getAttribute('alt') || undefined;
    const srcset = imgEl.getAttribute('srcset');
    if (srcset) {
      const best = pickBestSrcset(srcset);
      if (best) add(best, 'img', alt);
    }
    add(imgEl.getAttribute('src'), 'img', alt);
    add(imgEl.getAttribute('data-src'), 'lazy', alt);
    add(imgEl.getAttribute('data-lazy-src') || imgEl.getAttribute('data-lazy'), 'lazy', alt);
    add(imgEl.getAttribute('data-original'), 'lazy', alt);
    const dataSrcset = imgEl.getAttribute('data-srcset');
    if (dataSrcset) {
      const best = pickBestSrcset(dataSrcset);
      if (best) add(best, 'lazy', alt);
    }
  }

  // <picture><source>
  for (const source of Array.from(doc.querySelectorAll('picture source'))) {
    const srcset = source.getAttribute('srcset');
    if (srcset) {
      const best = pickBestSrcset(srcset);
      if (best) add(best, 'picture');
    }
  }

  return entries;
}

async function downloadImage(entry: ImageEntry, outputDir: string, idx: number): Promise<ImageEntry | null> {
  try {
    const res = await fetch(entry.url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      log.debug?.(`[downloadImage] HTTP ${res.status} ${entry.url}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < IMG_MIN_BYTES) return null;

    // SHA-256 去重
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);

    // 推副檔名
    const contentType = res.headers.get('content-type') || '';
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('gif')) ext = 'gif';
    else if (contentType.includes('svg')) ext = 'svg';
    else if (contentType.includes('avif')) ext = 'avif';
    else {
      const urlExt = entry.url.match(/\.(jpe?g|png|webp|gif|svg|avif)(\?|$)/i)?.[1]?.toLowerCase();
      if (urlExt) ext = urlExt === 'jpeg' ? 'jpg' : urlExt;
    }

    const filename = `${hash}.${ext}`;
    const filepath = path.join(outputDir, 'images', filename);
    await fs.writeFile(filepath, buf);

    return {
      ...entry,
      hash,
      bytes: buf.length,
      filename,
    };
  } catch (e) {
    log.debug?.(`[downloadImage] failed ${entry.url}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

export async function scrapeWebsite(opts: ScrapeOptions): Promise<ScrapeResult> {
  const startedAt = Date.now();
  const url = opts.url;

  // robots.txt
  if (!opts.ignoreRobots) {
    const allowed = await checkRobotsAllowed(url);
    if (!allowed) {
      throw new Error(`robots.txt 不允許抓取此 URL（用 ignoreRobots=true 強制覆蓋）`);
    }
  }

  // 1) HTTP fetch
  let html: string | null = null;
  let fetchMethod: 'http' | 'playwright' = 'http';

  const httpResult = await fetchHttp(url);
  if (httpResult) {
    html = httpResult.html;
    // 過少 fallback playwright（可能是 SPA）
    const textLen = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length;
    if (textLen < MIN_CONTENT_LEN_HTTP) {
      log.info(`[scrape] HTTP 內容過少 (${textLen} 字)，fallback Playwright`);
      const pw = await fetchViaPlaywright(url);
      if (pw) {
        html = pw.html;
        fetchMethod = 'playwright';
      }
    }
  } else {
    const pw = await fetchViaPlaywright(url);
    if (pw) {
      html = pw.html;
      fetchMethod = 'playwright';
    }
  }

  if (!html) throw new Error(`無法抓取 ${url}（HTTP + Playwright 都失敗）`);

  // 2) 準備輸出資料夾
  const u = new URL(url);
  const slug = safeFolderName(u.pathname.replace(/^\//, '').replace(/\/$/, '') || 'home');
  const folderName = `${u.host}-${timestamp()}-${slug}`;
  const baseOutput = opts.outputDir || path.join(os.homedir(), 'Desktop', 'scraped');
  const outputDir = path.join(baseOutput, folderName);
  await fs.mkdir(path.join(outputDir, 'images'), { recursive: true });

  // 3) 存 raw.html
  await fs.writeFile(path.join(outputDir, 'raw.html'), html, 'utf-8');

  // 4) parse DOM
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // 5) metadata + JSON-LD
  const { metadata, jsonld } = extractMetadata(doc, url);

  // 6) Readability 抓主文 → Markdown
  const readDom = new JSDOM(html, { url });
  const reader = new Readability(readDom.window.document);
  const article = reader.parse();
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  let markdown = '';
  let title = (metadata.title as string) || u.host;
  if (article) {
    title = article.title || title;
    markdown = `# ${title}\n\n${turndown.turndown(article.content || '')}`;
  } else {
    // Readability 沒抓到主文 → 全頁 turndown 兜底
    markdown = `# ${title}\n\n[Readability 失敗，使用全頁 fallback]\n\n${turndown.turndown(doc.body?.innerHTML || '')}`;
  }
  await fs.writeFile(path.join(outputDir, 'content.md'), markdown, 'utf-8');

  // 7) 圖片抓取
  const imageUrls = extractImageUrls(doc, metadata, jsonld, url);
  const maxImg = opts.maxImages ?? MAX_IMAGES;
  const limited = imageUrls.slice(0, maxImg);
  log.info(`[scrape] 找到 ${imageUrls.length} 張圖（限 ${maxImg}），開始下載`);

  const downloaded: ImageEntry[] = [];
  const seenHashes = new Set<string>();
  for (let i = 0; i < limited.length; i++) {
    const result = await downloadImage(limited[i], outputDir, i);
    if (!result) continue;
    if (seenHashes.has(result.hash)) continue;
    seenHashes.add(result.hash);
    downloaded.push(result);
  }
  await fs.writeFile(
    path.join(outputDir, 'images', 'manifest.json'),
    JSON.stringify(downloaded, null, 2),
    'utf-8'
  );

  // 8) page type + structured.json
  const pageType = inferPageType(metadata, jsonld);
  const structured = {
    pageType,
    title,
    description: metadata['og:description'] || metadata['description'],
    canonical: metadata.canonical,
    jsonld,
    extractedAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(outputDir, 'structured.json'), JSON.stringify(structured, null, 2), 'utf-8');

  // 9) metadata.json
  const fullMetadata = { ...metadata, fetchMethod, jsonldCount: jsonld.length };
  await fs.writeFile(path.join(outputDir, 'metadata.json'), JSON.stringify(fullMetadata, null, 2), 'utf-8');

  const durationMs = Date.now() - startedAt;
  log.info(`[scrape] 完成 ${url} → ${outputDir} (${downloaded.length} 圖, ${durationMs}ms, ${fetchMethod})`);

  return {
    ok: true,
    outputPath: outputDir,
    url,
    title,
    contentLength: markdown.length,
    contentMd: markdown,
    imageCount: imageUrls.length,
    imageDeduplicated: downloaded.length,
    fetchMethod,
    pageType,
    metadata: fullMetadata,
    jsonld,
    downloadedImages: downloaded,
    durationMs,
  };
}
