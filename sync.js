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
    sourceDir: 'json-formatter', targetSubdir: 'json'
  },
  base64enc01: {
    icon: '64', iconBg: '#e6fff5', iconColor: '#00b894',
    title: 'Base64 编解码',
    desc: '文本/图片 Base64 互转，支持 URL 安全编码，文件拖拽上传，实时编解码。',
    tags: [{ text: 'Base64', cls: 'tag' }, { text: '编码', cls: 'tag-green' }, { text: '解码', cls: 'tag' }],
    sourceDir: 'base64-encoder', targetSubdir: 'base64'
  },
  contrast01: {
    icon: '👁️', iconBg: '#ffeaea', iconColor: '#ff6b6b',
    title: 'WCAG 对比度检测',
    desc: '实时检测文字/背景色彩对比度，WCAG 2.1 AA/AAA 等级判定，无障碍合规必备。',
    tags: [{ text: 'WCAG', cls: 'tag' }, { text: '无障碍', cls: 'tag-red' }, { text: '合规', cls: 'tag' }],
    sourceDir: 'wcag-contrast-checker', targetSubdir: 'contrast'
  },
  palette01: {
    icon: '🎨', iconBg: '#fff8e1', iconColor: '#e17055',
    title: '配色方案生成器',
    desc: '互补色、类似色、三角色等6种配色模式。一键复制HEX，导出CSS变量。',
    tags: [{ text: '配色', cls: 'tag' }, { text: '设计', cls: 'tag-orange' }, { text: 'CSS', cls: 'tag' }],
    sourceDir: 'color-palette-generator', targetSubdir: 'palette'
  },
  meta01: {
    icon: '🏷️', iconBg: '#e6fff5', iconColor: '#00b894',
    title: 'Meta 标签生成器',
    desc: 'HTML Meta / Open Graph / Twitter Card 三合一标签生成。实时预览搜索结果。',
    tags: [{ text: 'SEO', cls: 'tag' }, { text: 'Meta', cls: 'tag-green' }, { text: 'OG', cls: 'tag' }],
    sourceDir: 'meta-tag-generator', targetSubdir: 'meta'
  },
  hash01: {
    icon: '#', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: '哈希生成器',
    desc: 'MD5 / SHA-1 / SHA-256 / SHA-384 / SHA-512 五合一哈希。支持文本和文件哈希校验。',
    tags: [{ text: 'MD5', cls: 'tag' }, { text: 'SHA256', cls: 'tag' }, { text: '安全', cls: 'tag-red' }],
    sourceDir: 'hash-generator', targetSubdir: 'hash'
  },
  cron01: {
    icon: '⏰', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: 'Cron 表达式生成器',
    desc: '可视化构建Crontab定时任务，实时预览执行时间，内置常用模板。DevOps/SRE必备。',
    tags: [{ text: 'Cron', cls: 'tag' }, { text: 'Crontab', cls: 'tag' }, { text: 'DevOps', cls: 'tag-green' }],
    sourceDir: 'cron-generator', targetSubdir: 'cron'
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

  // 5. 确保 CNAME 和 ads.txt 存在
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
      <a href="${t.url}" class="tool-card">
        <div class="card-icon" style="background:${t.iconBg};color:${t.iconColor};">${t.icon}</div>
        <h3>${t.name}</h3>
        <p class="desc">${t.desc}</p>
        <div class="tags">
          ${t.tags.map(tag => `<span class="${tag.cls}">${tag.text}</span>`).join('\n          ')}
        </div>
      </a>`).join('');

  const count = toolList.length;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ToolkitBox - 免费在线开发者工具集 | ${toolList.map(t => t.name).join('、')}</title>
<meta name="description" content="ToolkitBox 提供${count}款免费在线开发者工具，全部本地处理，数据安全。">
<meta name="keywords" content="在线工具,开发者工具,${toolList.map(t => t.name.replace(/\s/g, '')).join(',')}">
<meta property="og:title" content="ToolkitBox - 免费在线开发者工具集">
<meta property="og:description" content="${count}款免费在线开发者工具，数据本地处理，安全可靠">
<meta property="og:type" content="website">
<link rel="canonical" href="https://${CONFIG.domain}/">
${CONFIG.adsScript}
<style>
:root { --bg: #ffffff; --bg-card: #f8f9fc; --text: #1a1a2e; --text-secondary: #636e72; --primary: #6c5ce7; --primary-light: #a29bfe; --accent-green: #00b894; --accent-orange: #fdcb6e; --accent-red: #ff6b6b; --border: #e9ecef; --shadow: 0 2px 16px rgba(0,0,0,0.06); --radius: 16px; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%); color: var(--text); min-height: 100vh; }
.hero { text-align: center; padding: 60px 20px 40px; }
.hero h1 { font-size: 2.6rem; font-weight: 800; background: linear-gradient(135deg, #6c5ce7, #e17055); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 12px; }
.hero p { color: var(--text-secondary); font-size: 1.1rem; max-width: 500px; margin: 0 auto; line-height: 1.7; }
.stats-row { display: flex; justify-content: center; gap: 30px; margin: 20px 0 40px; flex-wrap: wrap; }
.stat { background: #fff; padding: 16px 28px; border-radius: 12px; box-shadow: var(--shadow); text-align: center; }
.stat-num { font-size: 1.6rem; font-weight: 800; color: var(--primary); }
.stat-label { font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; }
.tools-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; max-width: 1100px; margin: 0 auto; padding: 0 20px 40px; }
.tool-card { background: #fff; border-radius: var(--radius); padding: 28px; box-shadow: var(--shadow); border: 1px solid var(--border); transition: all 0.25s ease; text-decoration: none; color: var(--text); display: block; position: relative; overflow: hidden; }
.tool-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(108, 92, 231, 0.15); border-color: var(--primary-light); }
.tool-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px; }
.card-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 16px; }
.tool-card h3 { font-size: 1.15rem; margin-bottom: 6px; }
.tool-card .desc { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 0.72rem; padding: 3px 10px; border-radius: 20px; font-weight: 500; background: #f0edff; color: var(--primary); }
.tag-orange { background: #fff8e1; color: #e17055; }
.tag-green { background: #e6fff5; color: #00b894; }
.tag-red { background: #ffeaea; color: #ff6b6b; }
.ad-banner { max-width: 1100px; margin: 0 auto; padding: 0 20px; }
.footer { text-align: center; padding: 30px; color: var(--text-secondary); font-size: 0.8rem; }
@media (max-width: 700px) { .hero h1 { font-size: 1.8rem; } .tools-grid { grid-template-columns: 1fr; padding: 0 12px; } }
</style>
</head>
<body>
<div class="hero">
  <h1>🧰 ToolkitBox</h1>
  <p>免费在线开发者工具集 — 所有数据在浏览器本地处理，安全不上传</p>
  <div class="stats-row">
    <div class="stat"><div class="stat-num">${count}</div><div class="stat-label">实用工具</div></div>
    <div class="stat"><div class="stat-num">100%</div><div class="stat-label">免费使用</div></div>
    <div class="stat"><div class="stat-num">🔒</div><div class="stat-label">本地处理</div></div>
  </div>
</div>

<div class="ad-banner">
  ${CONFIG.adUnit}
</div>

<div class="tools-grid">
  ${cards}
</div>

<footer class="footer">
  <p>ToolkitBox.cn — 免费在线开发者工具 | 数据在浏览器本地处理，不会上传到服务器</p>
  <p style="margin-top:6px;">&copy; 2026 ToolkitBox. 保留所有权利。 | 由 MoneyMaker 自动生成</p>
</footer>

<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebSite","name":"ToolkitBox","url":"https://${CONFIG.domain}","description":"免费在线开发者工具集"}
</script>
</body>
</html>`;
}

// ─── 执行 ──────────────────────────────────────────────
main().catch(err => { console.error(err); process.exit(1); });
