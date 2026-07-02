const fs = require('fs');
const path = require('path');

const TB_CN = __dirname;
const OUTPUT_HTML = path.join(TB_CN, 'index.html');

// 从 toolkitbox.cn 自身扫描目录 — 保证链接和目录名一致
const exclude = ['assets', 'index.html', 'index.html.bak', '.git', 'garden', '.workbuddy',
  'node_modules', 'regenerate_index.js', 'generate_index.js'];

const tools = fs.readdirSync(TB_CN).filter(f => {
  const fullPath = path.join(TB_CN, f);
  if (exclude.includes(f)) return false;
  try {
    return fs.statSync(fullPath).isDirectory() &&
           fs.existsSync(path.join(fullPath, 'index.html'));
  } catch (e) { return false; }
});

console.log(`扫描到 ${tools.length} 个工具/页面目录`);

// 图标映射（短名称 → 图标信息）
const iconMap = {
  'json':           { icon: '{ }', bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
  'base64':         { icon: '64',  bg: '#e6fff5', color: '#00b894', cat: 'dev' },
  'hash':           { icon: '#',   bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
  'cron':           { icon: '⏰',  bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
  'contrast':       { icon: '👁️', bg: '#ffeaea', color: '#ff6b6b', cat: 'design' },
  'palette':        { icon: '🎨',  bg: '#fff8e1', color: '#e17055', cat: 'design' },
  'meta':           { icon: '🏷️', bg: '#e6fff5', color: '#00b894', cat: 'seo' },
  'qrcode':         { icon: '📱',  bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
  'password':       { icon: '🔐',  bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
  'email':          { icon: '✉️',  bg: '#e6fff5', color: '#00b894', cat: 'dev' },
  'fba':            { icon: '📦',  bg: '#e6fff5', color: '#00b894', cat: 'ecom' },
  'profit':         { icon: '💰',  bg: '#fff8e1', color: '#e17055', cat: 'ecom' },
  'freelance':      { icon: '💼',  bg: '#e8eaf6', color: '#5c6bc0', cat: 'freelance' },
  'prompts':        { icon: '🤖',  bg: '#f0edff', color: '#6c5ce7', cat: 'ai' },
  'quiz':           { icon: '❓',  bg: '#fff8e1', color: '#e17055', cat: 'edu' },
  'carbon':         { icon: '🌿',  bg: '#e8f5e9', color: '#2e7d32', cat: 'life' },
  'ai':             { icon: '🧠',  bg: '#f0edff', color: '#6c5ce7', cat: 'ai' },
  'ai-tools':       { icon: '🛠',  bg: '#f0edff', color: '#6c5ce7', cat: 'ai' },
  'affiliate':      { icon: '📊',  bg: '#e6fff5', color: '#00b894', cat: 'ecom' },
  'ecom':           { icon: '🛒',  bg: '#e6fff5', color: '#00b894', cat: 'ecom' },
  'life':           { icon: '🏠',  bg: '#e8f5e9', color: '#2e7d32', cat: 'life' },
  'seo-checker':    { icon: '🔍',  bg: '#e6fff5', color: '#00b894', cat: 'seo' },
  'keyword-density':{ icon: '📈',  bg: '#e6fff5', color: '#00b894', cat: 'seo' },
  'title-generator':{ icon: '✏️',  bg: '#fff8e1', color: '#e17055', cat: 'seo' },
  'seo-guide':      { icon: '📖',  bg: '#e6fff5', color: '#00b894', cat: 'seo' },
  'ai-guide':       { icon: '🤖',  bg: '#f0edff', color: '#6c5ce7', cat: 'ai' },
  'guide':          { icon: '📚',  bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
  'ai-tools-review':{ icon: '⭐',  bg: '#fff8e1', color: '#e17055', cat: 'ai' },
  'custom-service': { icon: '🎯',  bg: '#ffeaea', color: '#ff6b6b', cat: 'freelance' },
};

// 排除纯内容页（不在工具卡片中展示）
const contentPages = ['seo-guide', 'ai-guide', 'guide'];

function generateToolCard(toolDir) {
  const info = iconMap[toolDir] || { icon: '🔧', bg: '#f0edff', color: '#6c5ce7', cat: 'dev' };

  // 读取工具 HTML 获取标题和描述
  let title = toolDir;
  let desc = '工具描述';
  try {
    const toolHtmlPath = path.join(TB_CN, toolDir, 'index.html');
    const toolHtml = fs.readFileSync(toolHtmlPath, 'utf8');
    const titleMatch = toolHtml.match(/<title>(.+?)<\/title>/);
    if (titleMatch) title = titleMatch[1];
    const descMatch = toolHtml.match(/<meta name="description" content="(.+?)"/);
    if (descMatch) desc = descMatch[1];
  } catch (e) {
    // 使用默认值
  }

  // 简短标题
  const shortTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;

  return `<a href="/${toolDir}/" class="tool-card" data-cat="${info.cat}"><div class="card-icon" style="background:${info.bg};color:${info.color}">${info.icon}</div><h3>${shortTitle}</h3><p class="desc">${desc}</p><div class="tags"><span class="tag">${toolDir}</span></div></a>`;
}

// 生成工具卡片（排除内容页）
const toolDirs = tools.filter(t => !contentPages.includes(t));
const toolCards = toolDirs.map(generateToolCard).join('');

// 生成完整 HTML
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>ToolkitBox - 开发者工具集 | 免费在线工具</title>
  <meta name="description" content="免费在线开发者工具集，${toolDirs.length}款工具，数据本地处理，安全不上传。JSON格式化、Base64编码、哈希生成、二维码制作、密码生成等。">
  <link rel="canonical" href="https://toolkitbox.cn/">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3563043653255879" crossorigin="anonymous"></script>
  <style>:root{--bg:#fff;--t:#1a1a2e;--t2:#636e72;--p:#6c5ce7;--b:#e9ecef;--s:0 2px 12px rgba(0,0,0,.06)}*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,"PingFang SC","Microsoft Yahei",sans-serif;background:linear-gradient(135deg,#f5f7fa,#e8ecf1);color:var(--t);min-height:100vh}.hero{text-align:center;padding:50px 20px 20px}.hero h1{font-size:2.2rem;font-weight:800;background:linear-gradient(135deg,#6c5ce7,#e17055);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}.hero p{color:var(--t2);font-size:.95rem}.stats{display:flex;justify-content:center;gap:16px;margin:16px 0}.stat{background:#fff;padding:10px 20px;border-radius:10px;box-shadow:var(--s);text-align:center}.stat-num{font-size:1.3rem;font-weight:800;color:var(--p)}.stat-label{font-size:.72rem;color:var(--t2)}.cats{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:12px 0 20px;padding:0 20px}.cat-btn{padding:7px 16px;border-radius:20px;border:1.5px solid var(--b);background:var(--bg);cursor:pointer;font-size:.82rem;transition:.2s;color:var(--t)}.cat-btn:hover,.cat-btn.active{background:var(--p);color:#fff;border-color:var(--p)}.tools-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;max-width:1100px;margin:0 auto;padding:0 20px 40px}.tool-card{background:var(--bg);border-radius:14px;padding:28px;box-shadow:var(--s);border:1px solid var(--b);transition:.25s;text-decoration:none;color:var(--t);display:block}.tool-card:hover{transform:translateY(-4px);box-shadow:0 8px 30px rgba(108,92,231,.15);border-color:#a29bfe}.tool-card.hidden{display:none}.card-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:14px}.tool-card h3{font-size:1.1rem;margin-bottom:6px}.tool-card .desc{font-size:.83rem;color:var(--t2);line-height:1.6;margin-bottom:12px}.tags{display:flex;gap:6px;flex-wrap:wrap}.tag{font-size:.7rem;padding:3px 10px;border-radius:6px;background:#f0edff;color:var(--p)}.footer{text-align:center;padding:30px 20px;color:var(--t2);font-size:.8rem;border-top:1px solid var(--b);margin-top:20px}
    @media(max-width:720px){.tools-grid{grid-template-columns:1fr;padding:0 12px 30px}.hero h1{font-size:1.6rem}.hero{padding:30px 14px 12px}}
  </style>
</head>
<body>
  <div class="hero">
    <h1>ToolkitBox</h1>
    <p>免费在线开发者工具集 · 数据本地处理 · 安全不上传</p>
    <div class="stats">
      <div class="stat"><div class="stat-num">${toolDirs.length}</div><div class="stat-label">在线工具</div></div>
      <div class="stat"><div class="stat-num">100%</div><div class="stat-label">免费使用</div></div>
      <div class="stat"><div class="stat-num">0</div><div class="stat-label">数据上传</div></div>
    </div>
  </div>
  <div class="cats">
    <button class="cat-btn active" data-cat="all">全部</button>
    <button class="cat-btn" data-cat="dev">开发者工具</button>
    <button class="cat-btn" data-cat="design">设计工具</button>
    <button class="cat-btn" data-cat="seo">SEO/营销</button>
    <button class="cat-btn" data-cat="ai">AI工具</button>
  </div>
  <div class="tools-grid">${toolCards}</div>
  <footer class="footer"><p>toolkitbox.cn · 免费开发者工具 | &copy; 2026</p></footer>
  <script>document.querySelectorAll(".cat-btn").forEach(b=>b.addEventListener("click",function(){var c=this.getAttribute("data-cat");document.querySelectorAll(".cat-btn").forEach(b=>b.classList.toggle("active",b===this));document.querySelectorAll(".tool-card").forEach(card=>card.classList.toggle("hidden",c!=="all"&&card.getAttribute("data-cat")!==c))}))</script>
</body>
</html>`;

fs.writeFileSync(OUTPUT_HTML, html, 'utf8');
console.log(`✅ 主页生成完成: ${toolDirs.length} 个工具卡片`);
console.log(`   内容页(未列入卡片): ${contentPages.filter(c=>tools.includes(c)).join(', ')}`);
