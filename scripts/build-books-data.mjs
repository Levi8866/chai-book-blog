// 书籍数据生成器：扫描 ~/.openclaw/workspace/books/ 目录
// 执行: node scripts/build-books-data.mjs
import fs from 'node:fs';
import path from 'node:path';

const BOOKS_DIR = path.join(process.env.HOME, '.openclaw/workspace/books');
const OUT = path.join(process.cwd(), 'src/data/books.js');

function extractMeta(md) {
  const line1 = md.split('\n').find(l => l.startsWith('# ')) || '';
  const title = line1.replace(/^#\s+/, '').trim() || '未命名';
  const author = (md.match(/\*\*作者\*\*[：:]\s*([^\|]+)/) || [])[1]?.trim() || '';
  const core = (md.match(/一句话核心[：:]\s*([^\n>]+)/) || [])[1]?.trim() || '';
  return { title, author, summary: core };
}

const results = [];
if (fs.existsSync(BOOKS_DIR)) {
  for (const slug of fs.readdirSync(BOOKS_DIR)) {
    const dir = path.join(BOOKS_DIR, slug);
    if (!fs.statSync(dir).isDirectory()) continue;
    // 优先 LIGHT_notes.md，其次任意 formatted/md
    let mdPath = path.join(dir, 'LIGHT_notes.md');
    if (!fs.existsSync(mdPath)) {
      const cand = fs.readdirSync(dir).find(f => f.endsWith('formatted.md') || (f.endsWith('.md') && f !== 'models.md' && f !== 'LIGHT_notes.md'));
      if (cand) mdPath = path.join(dir, cand);
      else continue;
    }
    const md = fs.readFileSync(mdPath, 'utf-8');
    const { title, author, summary } = extractMeta(md);
    results.push({ slug, title, author, summary, date: fs.statSync(dir).mtime.toISOString().slice(0,10) });
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `export const all = ${JSON.stringify(results, null, 2)};\n`);
console.log(`已生成 ${results.length} 本书数据 -> ${OUT}`);
