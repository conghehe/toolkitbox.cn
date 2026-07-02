#!/usr/bin/env node
/**
 * sync.js — MoneyMaker 全量同步脚本
 * 
 * 从 portfolio.json（唯一真相源）→ 全量生成 toolkitbox.cn
 * 
 * 用法: node sync.js [--dry-run] [--no-push]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── 配置 ──────────────────────────────────────────────
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const CONFIG = {
  adsClient: 'ca-pub-3563043653255879',
  domain: 'toolkitbox.cn',
  portfolioPath: path.join(PROJECT_ROOT, 'evolve_agent', 'data', 'portfolio.json'),
  toolsiteDir: path.join(PROJECT_ROOT, 'outputs', 'toolsite'),
  targetDir: __dirname, // outputs/toolkitbox.cn
  adsScript: '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3563043653255879" crossorigin="anonymous"></script>',
  // 审核中不显示广告内容：min-height:0 让审核通过前不占空间
  adUnit: '<ins class="adsbygoogle" style="display:block;min-height:0;max-height:0;overflow:hidden" data-ad-client="ca-pub-3563043653255879" data-ad-slot="auto" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>',
};

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_PUSH = args.includes('--no-push');

// ─── 工具元数据映射 ────────────────────────────────────
// 定义每个资产在网站上的显示信息
const TOOL_DISPLAY = {
  jsonfmt01: { 
    icon: '{ }', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: 'JSON 格式化工具',
    desc: 'JSON 美化、校验、压缩、转CSV。支持语法高亮和错误定位，开发者高频工具。',
    tags: [{ text: 'JSON', cls: 'tag' }, { text: '格式化', cls: 'tag' }, { text: '50万月搜', cls: 'tag-orange' }],
    sourceDir: 'json-formatter', targetSubdir: 'json', cat:'dev'
  },
  base64enc01: {
    icon: '64', iconBg: '#e6fff5', iconColor: '#00b894',
    title: 'Base64 编解码',
    desc: '文本/图片 Base64 互转，支持 URL 安全编码，文件拖拽上传，实时编解码。',
    tags: [{ text: 'Base64', cls: 'tag' }, { text: '编码', cls: 'tag-green' }, { text: '解码', cls: 'tag' }],
    sourceDir: 'base64-encoder', targetSubdir: 'base64', cat:'dev'
  },
  contrast01: {
    icon: '👁️', iconBg: '#ffeaea', iconColor: '#ff6b6b',
    title: 'WCAG 对比度检测',
    desc: '实时检测文字/背景色彩对比度，WCAG 2.1 AA/AAA 等级判定，无障碍合规必备。',
    tags: [{ text: 'WCAG', cls: 'tag' }, { text: '无障碍', cls: 'tag-red' }, { text: '合规', cls: 'tag' }],
    sourceDir: 'wcag-contrast-checker', targetSubdir: 'contrast', cat:'design'
  },
  palette01: {
    icon: '🎨', iconBg: '#fff8e1', iconColor: '#e17055',
    title: '配色方案生成器',
    desc: '互补色、类似色、三角色等6种配色模式。一键复制HEX，导出CSS变量。',
    tags: [{ text: '配色', cls: 'tag' }, { text: '设计', cls: 'tag-orange' }, { text: 'CSS', cls: 'tag' }],
    sourceDir: 'color-palette-generator', targetSubdir: 'palette', cat:'design'
  },
  meta01: {
    icon: '🏷️', iconBg: '#e6fff5', iconColor: '#00b894',
    title: 'Meta 标签生成器',
    desc: 'HTML Meta / Open Graph / Twitter Card 三合一标签生成。实时预览搜索结果。',
    tags: [{ text: 'SEO', cls: 'tag' }, { text: 'Meta', cls: 'tag-green' }, { text: 'OG', cls: 'tag' }],
    sourceDir: 'meta-tag-generator', targetSubdir: 'meta', cat:'seo'
  },
  hash01: {
    icon: '#', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: '哈希生成器',
    desc: 'MD5 / SHA-1 / SHA-256 / SHA-384 / SHA-512 五合一哈希。支持文本和文件哈希校验。',
    tags: [{ text: 'MD5', cls: 'tag' }, { text: 'SHA256', cls: 'tag' }, { text: '安全', cls: 'tag-red' }],
    sourceDir: 'hash-generator', targetSubdir: 'hash', cat:'dev'
  },
  cron01: {
    icon: '⏰', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: 'Cron 表达式生成器',
    desc: '可视化构建Crontab定时任务，实时预览执行时间，内置常用模板。DevOps/SRE必备。',
    tags: [{ text: 'Cron', cls: 'tag' }, { text: 'Crontab', cls: 'tag' }, { text: 'DevOps', cls: 'tag-green' }],
    sourceDir: 'cron-generator', targetSubdir: 'cron', cat:'dev'
  },
  aitools01: {
    icon: '🤖', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: 'AI 工具导航',
    desc: '收录32款实用AI工具，覆盖对话/写作/图像/视频/编程/办公7大分类。搜索筛选，每日更新。',
    tags: [{ text: 'AI', cls: 'tag' }, { text: '导航', cls: 'tag' }, { text: '32款', cls: 'tag-green' }],
    sourceDir: 'ai-tools-directory', targetSubdir: 'ai-tools', cat:'ai'
  },
  tokencalc01: {
    icon: '💰', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: 'AI Token 计算器',
    desc: '支持12款大模型API费用实时计算。输入文本自动估算Token，对比模型成本，预算规划。',
    tags: [{text:'AI',cls:'tag'},{text:'成本',cls:'tag-orange'},{text:'新赛道',cls:'tag-green'}],
    sourceDir: 'token-calculator', targetSubdir: 'token-calculator', cat:'ai'
  },
  carbon01: {
    icon: '🌱', iconBg: '#e8f5e9', iconColor: '#2e7d32',
    title: '碳足迹计算器',
    desc: '出行/用电/饮食/消费四维碳排放计算。对比全球人均，获取减排建议，ESG合规参考。',
    tags: [{text:'ESG',cls:'tag-green'},{text:'碳中和',cls:'tag'},{text:'新赛道',cls:'tag-orange'}],
    sourceDir: 'carbon-calculator', targetSubdir: 'carbon', cat:'lifestyle'
  },
  email01: {
    icon: '✉️', iconBg: '#e8eaf6', iconColor: '#5c6bc0',
    title: '邮件验证工具',
    desc: '批量邮箱格式校验+一次性域名检测。50+临时邮箱域名库，营销/开发必备。',
    tags: [{text:'邮件',cls:'tag'},{text:'验证',cls:'tag'},{text:'营销',cls:'tag-orange'}],
    sourceDir: 'email-validator', targetSubdir: 'email', cat:'dev'
  },
  quiz01: {
    icon: '📝', iconBg: '#f3e5f5', iconColor: '#7b1fa2',
    title: '测验生成器',
    desc: '快速创建选择题/判断题，实时预览，JSON导出。教师/培训/HR必备。',
    tags: [{text:'教育',cls:'tag-green'},{text:'测验',cls:'tag'},{text:'EdTech',cls:'tag-orange'}],
    sourceDir: 'quiz-generator', targetSubdir: 'quiz', cat:'business'
  },
  profit01: {
    icon: '💰', iconBg: '#fff3e0', iconColor: '#e65100',
    title: '电商利润计算器',
    desc: '淘宝/拼多多/抖音/京东/亚马逊五平台利润核算。自动计算佣金+运费+推广，ROI一目了然。',
    tags: [{text:'电商',cls:'tag-orange'},{text:'利润',cls:'tag'},{text:'5平台',cls:'tag-green'}],
    sourceDir: 'profit-calculator', targetSubdir: 'profit', cat:'business'
  },
  affiliate01: {
    icon: '💰', iconBg: '#fff8e1', iconColor: '#e65100',
    title: '联盟营销选品指南',
    desc: '2026年15个低竞争高佣金细分赛道。AI软件佣金20-50%、宠物智能设备、绿色能源。附佣金率和入门难度。',
    tags: [{text:'联盟营销',cls:'tag-orange'},{text:'选品',cls:'tag'},{text:'电商',cls:'tag-green'}],
    sourceDir: 'affiliate-niches', targetSubdir: 'affiliate', cat:'business'
  },
  fbacalc01: {
    icon: '📦', iconBg: '#fff3e0', iconColor: '#ff9900',
    title: '亚马逊FBA费用计算器',
    desc: '基于官方费率表实时计算FBA配送费+仓储费+佣金。含费率表、选品指南，跨境卖家必备。',
    tags: [{text:'FBA',cls:'tag-orange'},{text:'亚马逊',cls:'tag'},{text:'选品',cls:'tag-green'}],
    sourceDir: 'fba-calculator', targetSubdir: 'fba', cat:'business'
  },
  prompt01: {
    icon: '📋', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: 'AI Prompt 模板库',
    desc: '100+精选AI提示词模板，覆盖写作/编程/设计/营销/教育等8大场景。支持ChatGPT/Claude/Midjourney/DALL-E。',
    tags: [{text:'AI',cls:'tag'},{text:'Prompt',cls:'tag-orange'},{text:'新赛道',cls:'tag-green'}],
    sourceDir: 'prompt-library', targetSubdir: 'prompts', cat:'ai'
  },
};

// 新增工具时的默认模板
const DEFAULT_DISPLAY = {
  icon: '🔧', iconBg: '#f0edff', iconColor: '#6c5ce7',
  tags: [{ text: 'NEW', cls: 'tag-green' }],
};

// ─── 辅助函数 ──────────────────────────────────────────
function log(msg) { console.log(`[sync] ${msg}`); }
function warn(msg) { console.warn(`[sync] ⚠️ ${msg}`); }

function fixJSON(filepath) {
  if (!fs.existsSync(filepath)) return;
  try {
    let t = fs.readFileSync(filepath, 'utf8');
    // Auto-fix common JSON issues
    t = t.replace(/,\s*\n\s*\]/g, '\n    ]');        // trailing comma before ]
    t = t.replace(/,\s*\n\s*\}/g, '\n    }');         // trailing comma before }
    t = t.replace(/: (\d+\.\d+-\d+\.\d+)/g, ': "$1"'); // unquoted ranges like 0.30-0.32
    try {
      JSON.parse(t);
      fs.writeFileSync(filepath, t);
    } catch(e) {
      warn(`JSON修复失败: ${path.basename(filepath)} - ${e.message.substring(0,60)}`);
    }
  } catch(e) {}
}

function injectAds(html) {
  // Add AdSense script after canonical link
  if (!html.includes('adsbygoogle.js')) {
    html = html.replace(/(<link rel="canonical"[^>]*>)/, '$1\n' + CONFIG.adsScript);
  }
  // Add ad unit before closing body
  if (html.match(/adsbygoogle/g)?.length < 3) {
    html = html.replace('</body>', CONFIG.adUnit + '</body>');
  }
  return html;
}

// ─── 主流程 ────────────────────────────────────────────
async function main() {
  log('开始同步...');
  if (DRY_RUN) log('DRY RUN 模式 - 不会写入文件');

  // 0. 自动修复JSON
  const knowledgePath = path.join(PROJECT_ROOT, 'evolve_agent', 'data', 'money_knowledge.json');
  const portfolioPath2 = path.join(PROJECT_ROOT, 'evolve_agent', 'data', 'portfolio.json');
  fixJSON(knowledgePath);
  fixJSON(portfolioPath2);

  // 1. 读取 portfolio.json
  log('读取 portfolio.json...');
  const portfolio = JSON.parse(fs.readFileSync(CONFIG.portfolioPath, 'utf8'));
  const assets = portfolio.assets || {};
  const deployedAssets = Object.entries(assets).filter(([id, a]) => a.status === 'deployed');
  log(`发现 ${deployedAssets.length} 个已部署资产`);

  // 2. 复制工具文件 + 注入广告
  const toolList = []; // 用于生成 tools.json 和首页
  let copied = 0, skipped = 0;

  for (const [assetId, asset] of deployedAssets) {
    const display = TOOL_DISPLAY[assetId] || { ...DEFAULT_DISPLAY, title: asset.name || assetId, desc: asset.description || '' };
    const sourceDir = path.join(CONFIG.toolsiteDir, display.sourceDir || assetId);
    const targetSubdir = display.targetSubdir || assetId;
    const targetDir = path.join(CONFIG.targetDir, targetSubdir);
    const sourceFile = path.join(sourceDir, 'index.html');
    const targetFile = path.join(targetDir, 'index.html');

    if (!fs.existsSync(sourceFile)) {
      warn(`源文件不存在: ${sourceFile}`);
      continue;
    }

    // 读取源HTML
    let html = fs.readFileSync(sourceFile, 'utf8');
    
    // 更新 canonical URL
    html = html.replace(/<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="https://${CONFIG.domain}/${targetSubdir}/">`);
    
    // 注入广告
    html = injectAds(html);

    if (!DRY_RUN) {
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(targetFile, html);
    }

    // 添加到工具列表
    toolList.push({
      id: assetId,
      name: display.title,
      desc: display.desc,
      icon: display.icon,
      iconBg: display.iconBg,
      iconColor: display.iconColor,
      tags: display.tags,
      url: `/${targetSubdir}/`,
      niche: asset.niche || '',
      keywords: asset.keywords || [],
      cat: display.cat || 'other',
    });

    copied++;
    log(`  ${display.title} → ${targetSubdir}/`);
  }

  // 3. 生成 tools.json
  const toolsJsonPath = path.join(CONFIG.targetDir, 'tools.json');
  if (!DRY_RUN) {
    fs.writeFileSync(toolsJsonPath, JSON.stringify(toolList, null, 2));
    log('生成 tools.json');
  }

  // 4. 生成首页
  const indexHtml = generateIndex(toolList);
  const indexPath = path.join(CONFIG.targetDir, 'index.html');
  if (!DRY_RUN) {
    fs.writeFileSync(indexPath, indexHtml);
    log('生成首页');
  }

  // 5. 生成 sitemap.xml
  const sitemap = generateSitemap(toolList);
  const sitemapPath = path.join(CONFIG.targetDir, 'sitemap.xml');
  if (!DRY_RUN) {
    fs.writeFileSync(sitemapPath, sitemap);
    log('生成 sitemap.xml');
  }

  // 6. 确保 CNAME 和 ads.txt 存在
  if (!DRY_RUN) {
    fs.writeFileSync(path.join(CONFIG.targetDir, 'CNAME'), CONFIG.domain + '\n');
    fs.writeFileSync(path.join(CONFIG.targetDir, 'ads.txt'), `google.com, ${CONFIG.adsClient.replace('ca-', 'pub-')}, DIRECT, f08c47fec0942fa0\n`);
  }

  // 6. Git 操作
  if (!DRY_RUN && !NO_PUSH) {
    try {
      log('Git add + commit...');
      execSync('git add -A', { cwd: CONFIG.targetDir, stdio: 'ignore' });
      
      const added = toolList.length;
      const msg = added > 1 
        ? `sync: 同步${added}个工具站 (自动)` 
        : `sync: 新增 ${toolList[0]?.name || '工具'} (自动)`;
      
      execSync(`git commit -m "${msg}"`, { cwd: CONFIG.targetDir, stdio: 'ignore' });
      
      log('Git push...');
      execSync('git push', { cwd: CONFIG.targetDir, stdio: 'inherit', timeout: 30000 });
      log('GitHub 推送完成');
    } catch (e) {
      warn(`Git 操作失败: ${e.message}`);
      warn('文件已本地更新，稍后手动 git push');
    }
  }

  // 7. 总结
  log('═══════════════════════════════════');
  log(`同步完成: 处理 ${deployedAssets.length} 个资产, 复制 ${copied} 个, ${toolList.length} 个工具已上线`);
  log(`域名: ${CONFIG.domain}`);
  if (DRY_RUN) log('DRY RUN - 未实际修改文件');
}

// ─── 首页生成 ──────────────────────────────────────────
function generateIndex(toolList) {
  const cards = toolList.map(t => `
      <a href="${t.url}" class="tool-card" data-cat="${t.cat || 'other'}">
        <div class="card-icon" style="background:${t.iconBg};color:${t.iconColor};">${t.icon}</div>
        <h3>${t.name}</h3>
        <p class="desc">${t.desc}</p>
        <div class="tags">
          ${t.tags.map(tag => `<span class="${tag.cls}">${tag.text}</span>`).join('\n          ')}
        </div>
      </a>`).join('');

  // Category definitions
  const cats = {all:'全部',dev:'💻 开发者工具',design:'🎨 设计工具',ai:'🤖 AI 工具',business:'💼 商业工具',lifestyle:'🌱 生活工具',seo:'📈 SEO/营销'};
  const catTabs = Object.entries(cats).map(([k,v])=>`<button class="cat-btn${k==='all'?' active':''}" onclick="filterCat('${k}')">${v}</button>`).join('\n          ');

  const count = toolList.length;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ToolkitBox - 免费在线工具集 | ${count}款实用工具</title>
<meta name="description" content="ToolkitBox 提供${count}款免费在线工具，覆盖开发者/AI/设计/商业/生活/SEO六大分类。全部本地处理，数据安全。">
<meta name="keywords" content="在线工具,开发者工具,AI工具,设计工具,免费工具,toolkitbox">
<meta property="og:title" content="ToolkitBox - 免费在线工具集">
<meta property="og:description" content="${count}款免费在线工具">
<meta property="og:type" content="website">
<link rel="canonical" href="https://${CONFIG.domain}/">
${CONFIG.adsScript}
<style>
:root { --bg: #ffffff; --bg2: #f8f9fc; --text: #1a1a2e; --t2: #636e72; --p: #6c5ce7; --pl: #a29bfe; --b: #e9ecef; --shadow: 0 2px 16px rgba(0,0,0,0.06); --radius: 16px; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%); color: var(--text); min-height: 100vh; }
.hero { text-align: center; padding: 50px 20px 20px; }
.hero h1 { font-size: 2.4rem; font-weight: 800; background: linear-gradient(135deg, #6c5ce7, #e17055); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px; }
.hero p { color: var(--t2); font-size: 1rem; max-width: 500px; margin: 0 auto; line-height: 1.6; }
.stats-row { display: flex; justify-content: center; gap: 20px; margin: 16px 0 10px; flex-wrap: wrap; }
.stat { background: #fff; padding: 12px 24px; border-radius: 12px; box-shadow: var(--shadow); text-align: center; }
.stat-num { font-size: 1.4rem; font-weight: 800; color: var(--p); }
.stat-label { font-size: 0.75rem; color: var(--t2); }
.cats { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin: 12px 0 20px; padding: 0 20px; }
.cat-btn { padding: 7px 16px; border-radius: 20px; border: 1.5px solid var(--b); background: var(--bg); cursor: pointer; font-size: 0.82rem; transition: 0.2s; color: var(--text); white-space: nowrap; }
.cat-btn:hover, .cat-btn.active { background: var(--p); color: #fff; border-color: var(--p); }
.tools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; max-width: 1100px; margin: 0 auto; padding: 0 20px 40px; }
.tool-card { background: #fff; border-radius: var(--radius); padding: 28px; box-shadow: var(--shadow); border: 1px solid var(--b); transition: all 0.25s ease; text-decoration: none; color: var(--text); display: block; }
.tool-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(108, 92, 231, 0.15); border-color: var(--pl); }
.tool-card.hidden { display: none; }
.card-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 14px; }
.tool-card h3 { font-size: 1.1rem; margin-bottom: 6px; }
.tool-card .desc { font-size: 0.83rem; color: var(--t2); line-height: 1.6; margin-bottom: 12px; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 0.7rem; padding: 3px 10px; border-radius: 20px; font-weight: 500; background: #f0edff; color: var(--p); }
.tag-orange { background: #fff8e1; color: #e17055; }
.tag-green { background: #e6fff5; color: #00b894; }
.tag-red { background: #ffeaea; color: #ff6b6b; }
.footer { text-align: center; padding: 30px; color: var(--t2); font-size: 0.78rem; }
@media (max-width: 700px) { .hero h1 { font-size: 1.7rem; } .tools-grid { grid-template-columns: 1fr; padding: 0 12px; } .cats { gap: 4px; } .cat-btn { padding: 6px 12px; font-size: 0.75rem; } }
</style>
</head>
<body>
<div class="hero">
  <h1>🧰 ToolkitBox</h1>
  <p>免费在线工具集 · 数据本地处理 · 安全不上传 · 每日更新</p>
  <div class="stats-row">
    <div class="stat"><div class="stat-num">${count}</div><div class="stat-label">实用工具</div></div>
    <div class="stat"><div class="stat-num">6</div><div class="stat-label">分类</div></div>
    <div class="stat"><div class="stat-num">100%</div><div class="stat-label">免费</div></div>
  </div>
</div>

<div class="cats">
  ${catTabs}
</div>

<div class="tools-grid">
  ${cards}
</div>

<footer class="footer">
  <p>ToolkitBox.cn · 免费在线工具集 | 数据在浏览器本地处理，不会上传到服务器</p>
  <p style="margin-top:4px">&copy; 2026 ToolkitBox · 由 MoneyMaker 自动生成</p>
</footer>

<script>
function filterCat(cat) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.textContent.includes(cat==='all'?'全部':b.getAttribute('data-cat'))));
  // Update active via delegate click on cat buttons
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.remove('active');
    if ((cat==='all' && b.textContent.includes('全部')) || b.textContent.includes(cat)) b.classList.add('active');
  });
  document.querySelectorAll('.tool-card').forEach(card => {
    card.classList.toggle('hidden', cat !== 'all' && card.getAttribute('data-cat') !== cat);
  });
}
// Make cat buttons work
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const cat = this.getAttribute('data-cat') || 
      (this.textContent.includes('全部') ? 'all' :
       this.textContent.includes('开发者') ? 'dev' :
       this.textContent.includes('设计') ? 'design' :
       this.textContent.includes('AI') ? 'ai' :
       this.textContent.includes('商业') ? 'business' :
       this.textContent.includes('生活') ? 'lifestyle' :
       this.textContent.includes('SEO') ? 'seo' : 'other');
    filterCat(cat);
  });
});

// Add data attributes for filtering
document.querySelectorAll('.cat-btn').forEach((btn, i) => {
  const cats = ['all','dev','design','ai','business','lifestyle','seo'];
  btn.setAttribute('data-cat', cats[i] || 'other');
});
</script>

<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebSite","name":"ToolkitBox","url":"https://${CONFIG.domain}","description":"免费在线工具集"}
</script>
</body>
</html>`;
}

// ─── Sitemap 生成 ──────────────────────────────────────
function generateSitemap(toolList) {
  const domain = CONFIG.domain;
  const now = new Date().toISOString().split('T')[0];
  
  const urls = [
    { loc: `https://${domain}/`, priority: '1.0', changefreq: 'daily' },
    ...toolList.map(t => ({
      loc: `https://${domain}${t.url}`,
      priority: '0.8',
      changefreq: 'weekly'
    }))
  ];

  const urlElements = urls.map(u => 
    `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlElements}\n</urlset>\n`;
}

// ─── 执行 ──────────────────────────────────────────────
main().catch(err => { console.error(err); process.exit(1); });
