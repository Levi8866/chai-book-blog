// 书籍数据生成器：扫描 books/ 目录，健壮提取元信息
// 执行: node scripts/build-books-data.mjs
import fs from 'node:fs';
import path from 'node:path';

const BOOKS_DIR = path.join(process.env.HOME, '.openclaw/workspace/books');
const OUT = path.join(process.cwd(), 'src/data/books.js');

function extractMeta(md) {
  // 标题：首个 # 行
  const titleMatch = md.split('\n').find(l => l.startsWith('# ')) || '';
  let title = titleMatch.replace(/^#\s+/, '').trim();
  // 作者：多格式（**作者**xxx / - 作者 / > 作者 / 作者：）
  const authorMatch =
    md.match(/\*\*作者\*\*[：:]\s*([^\s|）)\]]+)/) ||
    md.match(/(?:^|\n)\s*[->]\s*作者[：:]\s*([^\n]*)/) ||
    md.match(/作者[：:]\s*([^\n]*)/);
  let author = '';
  if (authorMatch) {
    author = (authorMatch[1] || '').split('（')[0].split('(')[0].trim();
  }
  // 一句话核心：多格式
  const coreMatch =
    md.match(/一句话核心[：:]\s*([^\n]+)/) ||
    md.match(/(?:^|\n)\s*[->]\s*(?:一句话核心|核心)[：:]\s*([^\n]+)/) ||
    md.match(/核心[：:]\s*([^\n]+)/);
  let summary = (coreMatch ? coreMatch[1] : '').trim();
  // 保底：抓不到名词时，取正文第一段非标题文字
  if (!summary) {
    const firstPara = md.split(/\n{2,}/).find(p => p.trim() && !p.trim().startsWith('#') && !p.trim().startsWith('-') && !p.trim().startsWith('>'));
    if (firstPara) summary = firstPara.replace(/[#>*`]/g, '').trim().slice(0, 60);
  }
  return { title, author, summary };
}

const results = [];
if (fs.existsSync(BOOKS_DIR)) {
  for (const slug of fs.readdirSync(BOOKS_DIR)) {
    const dir = path.join(BOOKS_DIR, slug);
    if (!fs.statSync(dir).isDirectory()) continue;
    // 优先读取来源文件列表
    const files = fs.readdirSync(dir);
    // 找不到就跳过
    let mdPath = null;
    // 优先 formatted（通常含最完整 meta）
    mdPath = files.find(f => f.endsWith('formatted.md'));
    // 其次 LIGHT_notes
    if (!mdPath) mdPath = files.find(f => f === 'LIGHT_notes.md');
    // 再其次任意主 md
    if (!mdPath) mdPath = files.find(f => f.endsWith('.md') && f !== 'models.md' && f !== 'LIGHT_notes.md');
    if (!mdPath) continue;

    const md = fs.readFileSync(path.join(dir, mdPath), 'utf-8');
    const { title, author, summary } = extractMeta(md);
    if (!title || title === 'null' || !title.includes('《')) continue;
    results.push({
      slug,
      title: title.replace(/^《|》$/g, ''),
      author,
      summary,
      date: fs.statSync(dir).mtime.toISOString().slice(0, 10)
    });
  }
}

// 去重（按 slug）
const seen = new Set();
const uniq = results.filter(r => (seen.has(r.slug) ? false : (seen.add(r.slug), true)));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `export const all = ${JSON.stringify(uniq, null, 2)};\n`);
console.log(`已生成 ${uniq.length} 本书数据 -> ${OUT}`);
uniq.forEach(b => console.log(` - ${b.title} | 作者:${b.author||'?'} | 核心:${(b.summary||'').slice(0,30)}`));
