#!/usr/bin/env node
// 拆书发布工作流：从拆书产物生成多平台草稿
// 用法: node scripts/publish-drafts.mjs <book-slug>
// 输出: dist/publish/<slug>/<平台>.md 草稿文件
import fs from 'node:fs';
import path from 'node:path';

const BOOKS_DIR = path.join(process.env.HOME, '.openclaw/workspace/books');
const OUT_BASE = path.join(process.cwd(), 'dist/publish');

const slug = process.argv[2];
if (!slug) {
  console.error('用法: node scripts/publish-drafts.mjs <book-slug>');
  process.exit(1);
}

const dir = path.join(BOOKS_DIR, slug);
if (!fs.existsSync(dir)) {
  console.error(`目录不存在: ${dir}`);
  process.exit(1);
}

const files = fs.readdirSync(dir);
const srcFile = files.find(f => f.endsWith('formatted.md'))
  || files.find(f => f === 'LIGHT_notes.md')
  || files.find(f => f.endsWith('.md') && f !== 'models.md');
if (!srcFile) {
  console.error('未找到可发布的拆书笔记文件');
  process.exit(1);
}

const md = fs.readFileSync(path.join(dir, srcFile), 'utf-8');

// 提取书名（首个 # ）
const titleMatch = md.split('\n').find(l => l.startsWith('# ')) || '';
const title = titleMatch.replace(/^#\s+/, '').trim();

// 去掉顶部元信息和第一个标题，正文从"一、"或"## 一、"开始
const body = md.split('\n').filter(l => !l.startsWith('>') && !l.startsWith('# 《')).join('\n').trim();

function buildDraft(ptype) {
  const header = {
    'wechat': `> 本文为《${title}》拆书笔记（公众号版）\n> 原创 · Levi\n\n`,
    'zhihu': `# 关于《${title}》，这几点值得细读\n\n（本文由拆书笔记改编）\n\n`,
    'toutiao': `# 《${title}》拆书：把书装进脑子\n\n`,
    'xhs': `📚《${title}》| 3分钟读懂精髓\n\n`,
  }[ptype] || '';
  return header + body;
}

const platforms = ['wechat', 'zhihu', 'toutiao', 'xhs'];
const outDir = path.join(OUT_BASE, slug);
fs.mkdirSync(outDir, { recursive: true });

for (const p of platforms) {
  const content = buildDraft(p);
  fs.writeFileSync(path.join(outDir, `${p}.md`), content);
  console.log(`✓ ${p}.md (${(content.length/1024).toFixed(1)}KB) 已生成`);
}
console.log(`\n《${title}》已生成 4 平台草稿 -> dist/publish/${slug}/`);
