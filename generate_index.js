/**
 * 自动生成 ToolkitBox 主页 index.html
 * 从 projects.json 读取所有资产，生成工具卡片网格
 */

const fs = require('fs');
const path = require('path');

const PROJECTS_FILE = path.join(__dirname, '..', '..', 'evolve_agent', 'data', 'projects.json');
const OUTPUT_FILE = path.join(__dirname, 'index.html');
const TOOLKITBOX_DIR = path.join(__dirname, '..', 'toolsite');

// 工具卡片模板
function generateToolCard(toolDir) {
  // 图标和颜色映射
  const iconMap = {
    'json-formatter': { icon: '{ }', bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
    'base64-encoder': { icon: '64', bg: '#e6fff5', color: '#00b894', cat: 'dev' },
    'hash-generator': { icon: '#', bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
    'cron-generator': { icon: '⏰', bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
    'wcag-contrast-checker': { icon: '👁️', bg: '#ffeaea', color: '#ff6b6b', cat: 'design' },
    'color-palette-generator': { icon: '🎨', bg: '#fff8e1', color: '#e17055', cat: 'design' },
    'meta-tag-generator': { icon: '🏷️', bg: '#e6fff5', color: '#00b894', cat: 'seo' },
    'word-counter': { icon: '📝', bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
    'case-converter': { icon: '🔤', bg: '#e8eaf6', color: '#5c6bc0', cat: 'dev' },
    'http-status': { icon: '🌐', bg: '#e8f5e9', color: '#2e7d32', cat: 'dev' },
    'qrcode-generator': { icon: '📱', bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
    'password-generator': { icon: '🔐', bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
    'unit-converter': { icon: '📐', bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
    'ip-lookup': { icon: '🌐', bg: '#e8f5e9', color: '#2e7d32', cat: 'dev' },
    'email-validator': { icon: '✉️', bg: '#e6fff5', color: '#00b894', cat: 'dev' },
    'code-minifier': { icon: '📦', bg: '#f0edff', color: '#6c5ce7', cat: 'dev' },
    'carbon-calculator': { icon: '🌿', bg: '#e8f5e9', color: '#2e7d32', cat: 'life' },
    'prompt-library': { icon: '🤖', bg: '#f0edff', color: '#6c5ce7', cat: 'ai' },
    'llm-compare': { icon: '🆚', bg: '#fff8e1', color: '#e17055', cat: 'ai' },
    'token-calculator': { icon: '🔢', bg: '#e8eaf6', color: '#5c6bc0', cat: 'ai' },
    'ai-tools-directory': { icon: '🧠', bg: '#f0edff', color: '#6c5ce7', cat: 'ai' },
    'quiz-generator': { icon: '❓', bg: '#fff8e1', color: '#e17055', cat: 'edu' },
    'fba-calculator': { icon: '📦', bg: '#e6fff5', color: '#00b894', cat: 'ecom' },
    'profit-calculator': { icon: '💰', bg: '#fff8e1', color: '#e17055', cat: 'ecom' },
    'freelance-calculator': { icon: '💼', bg: '#e8eaf6', color: '#5c6bc0', cat: 'freelance' }
  }; 
  
  const sub = asset.sub || asset.dir.split('-')[0];
  const iconInfo = iconMap[sub] || { icon: '🔧', bg: '#f0edff', color: '#6c5ce7' };
  
  // 读取工具目录中的 index.html 来获取标题和描述
  let title = asset.id;
  let desc = '工具描述';
  try {
    const toolHtmlPath = path.join(TOOLKITBOX_DIR, asset.dir, 'index.html');
    if (fs.existsSync(toolHtmlPath)) {
      const toolHtml = fs.readFileSync(toolHtmlPath, 'utf8');
      const titleMatch = toolHtml.match(/<title>(.+?)<\/title>/);
      if (titleMatch) title = titleMatch[1];
      const descMatch = toolHtml.match(/<meta name="description" content="(.+?)"/);
      if (descMatch) desc = descMatch[1];
    }
  } catch(e) {
    console.log('读取工具 HTML 失败:', asset.id, e.message);
  }
  
  // 生成标签
  const tags = [sub];
  if (asset.cat) tags.push(catMap[asset.cat] || asset.cat);
  
  return `
    <a href="/${sub}/" class="tool-card" data-cat="${asset.cat || 'dev'}">
      <div class="card-icon" style="background:${iconInfo.bg};color:${iconInfo.color}">${iconInfo.icon}</div>
      <h3>${title}</h3>
      <p class="desc">${desc}</p>
      <div class="tags">
        ${tags.map(t => `<span class="tag">${t}</span>`).join('')}
      </div>
    </a>`;
}

// 主函数
function main() {
  console.log('开始生成 ToolkitBox 主页...');
  
  // 从目录读取所有工具
  const toolsDir = TOOLKITBOX_DIR;
  const tools = fs.readdirSync(toolsDir).filter(f => {
    const fullPath = path.join(toolsDir, f);
    return fs.statSync(fullPath).isDirectory() && 
           fs.existsSync(path.join(fullPath, 'index.html')) &&
           !f.startsWith('{') && 
           f !== 'affiliate-niches';
  });
  
  console.log(`从目录找到 ${tools.length} 个工具`);
  
  // 生成工具卡片 HTML
  const toolCards = assets.map(a => generateToolCard(a)).join('\n');
  
  // 生成完整的 HTML
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>ToolkitBox - 开发者工具集</title>
  <meta name="description" content="免费在线开发者工具集，${assets.length}款工具，数据本地处理，安全不上传">
  <link rel="canonical" href="https://toolkitbox.cn/">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3563043653255879" crossorigin="anonymous"></script>
  <style>
    :root { --bg: #fff; --t: #1a1a2e; --t2: #636e72; --p: #6c5ce7; --b: #e9ecef; --s: 0 2px 12px rgba(0,0,0,.06) }
    * { margin: 0; padding: 0; box-sizing: border-box }
    body { font-family: -apple-system, "PingFang SC", "Microsoft Yahei", sans-serif; background: linear-gradient(135deg, #f5f7fa, #e8ecf1); color: var(--t); min-height: 100vh }
    .hero { text-align: center; padding: 50px 20px 20px }
    .hero h1 { font-size: 2.2rem; font-weight: 800; background: linear-gradient(135deg, #6c5ce7, #e17055); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px }
    .hero p { color: var(--t2); font-size: .95rem }
    .stats { display: flex; justify-content: center; gap: 16px; margin: 16px 0 }
    .stat { background: #fff; padding: 10px 20px; border-radius: 10px; box-shadow: var(--s); text-align: center }
    .stat-num { font-size: 1.3rem; font-weight: 800; color: var(--p) }
    .stat-label { font-size: .72rem; color: var(--t2) }
    .cats { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin: 12px 0 20px; padding: 0 20px }
    .cat-btn { padding: 7px 16px; border-radius: 20px; border: 1.5px solid var(--b); background: var(--bg); cursor: pointer; font-size: .82rem; transition: .2s; color: var(--t) }
    .cat-btn:hover, .cat-btn.active { background: var(--p); color: #fff; border-color: var(--p) }
    .tools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; max-width: 1100px; margin: 0 auto; padding: 0 20px 40px }
    .tool-card { background: var(--bg); border-radius: 14px; padding: 28px; box-shadow: var(--s); border: 1px solid var(--b); transition: .25s; text-decoration: none; color: var(--t); display: block }
    .tool-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(108,92,231,.15); border-color: #a29bfe }
    .tool-card.hidden { display: none }
    .card-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 14px }
    .tool-card h3 { font-size: 1.1rem; margin-bottom: 6px }
    .tool-card .desc { font-size: .83rem; color: var(--t2); line-height: 1.6; margin-bottom: 12px }
    .tags { display: flex; gap: 6px; flex-wrap: wrap }
    .tag { font-size: .7rem; padding: 3px 10px; border-radius: 20px; font-weight: 500; background: #f0edff; color: var(--p) }
    .tag-orange { background: #fff8e1; color: #e17055 }
    .tag-green { background: #e6fff5; color: #00b894 }
    .tag-red { background: #ffeaea; color: #ff6b6b }
    .footer { text-align: center; padding: 30px; color: var(--t2); font-size: .78rem }
    @media (max-width: 700px) { .hero h1 { font-size: 1.6rem } .tools-grid { grid-template-columns: 1fr } }
  </style>
</head>
<body>
  <div class="hero">
    <h1>ToolkitBox</h1>
    <p>免费在线开发者工具集 · 数据本地处理 · 安全不上传</p>
    <div class="stats">
      <div class="stat"><div class="stat-num">${assets.length}</div><div class="stat-label">在线工具</div></div>
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
  <div class="tools-grid">
    ${toolCards}
  </div>
  <footer class="footer">
    <p>toolkitbox.cn · 免费开发者工具 | &copy; 2026</p>
  </footer>
  <script>
    document.querySelectorAll(".cat-btn").forEach(b => b.addEventListener("click", function() {
      var c = this.getAttribute("data-cat");
      document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b === this));
      document.querySelectorAll(".tool-card").forEach(card => card.classList.toggle("hidden", c !== "all" && card.getAttribute("data-cat") !== c));
    }));
  </script>
</body>
</html>`;
  
  // 写入文件
  fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
  console.log(`✅ 主页生成完成: ${OUTPUT_FILE}`);
  console.log(`   包含 ${assets.length} 个工具卡片`);
}

main();
