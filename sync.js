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
  wordcounter01: {
    icon: '📝', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: '字数统计器',
    desc: '实时统计中英文字数/字符/行数/段落。微信/微博/小红书字数限制检测。',
    tags: [{text:'文本',cls:'tag'},{text:'统计',cls:'tag-green'},{text:'新',cls:'tag-orange'}],
    sourceDir: 'word-counter', targetSubdir: 'word-counter', cat:'dev'
  },
  caseconv01: {
    icon: '🔤', iconBg: '#e8eaf6', iconColor: '#5c6bc0',
    title: '大小写转换器',
    desc: '全大写/全小写/驼峰/下划线/常量六种格式一键互转。程序员命名规范工具。',
    tags: [{text:'文本',cls:'tag'},{text:'命名',cls:'tag'},{text:'新',cls:'tag-orange'}],
    sourceDir: 'case-converter', targetSubdir: 'case-converter', cat:'dev'
  },
  httpstatus01: {
    icon: '🌐', iconBg: '#e8f5e9', iconColor: '#2e7d32',
    title: 'HTTP状态码参考',
    desc: '1xx-5xx完整标准状态码，中英文说明+使用场景。开发调试必备速查表。',
    tags: [{text:'HTTP',cls:'tag'},{text:'参考',cls:'tag-green'},{text:'新',cls:'tag-orange'}],
    sourceDir: 'http-status', targetSubdir: 'http-status', cat:'dev'
  },
  qrcode01: {
    icon: '📱', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: 'QR码生成器',
    desc: '免费在线生成二维码。支持网址/文本/电话/WiFi/邮件/短信，自定义颜色，一键下载。',
    tags: [{text:'二维码',cls:'tag'},{text:'QR',cls:'tag-green'},{text:'新',cls:'tag-orange'}],
    sourceDir: 'qrcode-generator', targetSubdir: 'qrcode', cat:'dev'
  },
  iplookup01: {
    icon: '🌐', iconBg: '#e8f5e9', iconColor: '#2e7d32',
    title: 'IP查询工具',
    desc: '公网IP查询+归属地+运营商。手动查询任意IP地址。',
    tags: [{text:"IP",cls:"tag"},{text:"查询",cls:"tag-green"},{text:"新",cls:"tag-orange"}],
    sourceDir: 'ip-lookup', targetSubdir: 'ip-lookup', cat:'dev'
  },
  unitconv01: {
    icon: '📐', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: '单位换算器',
    desc: '长度/重量/温度/面积/体积/速度实时换算。',
    tags: [{text:"换算",cls:"tag"},{text:"单位",cls:"tag-green"},{text:"新",cls:"tag-orange"}],
    sourceDir: 'unit-converter', targetSubdir: 'unit-converter', cat:'dev'
  },
  pwdgen01: {
    icon: '🔐', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: '密码生成器',
    desc: '随机强密码生成。8-64位，大小写+数字+符号组合。',
    tags: [{text:"安全",cls:"tag-red"},{text:"密码",cls:"tag"},{text:"新",cls:"tag-orange"}],
    sourceDir: 'password-generator', targetSubdir: 'password', cat:'dev'
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
  llmcompare01: {
    icon: '📊', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: 'LLM 大模型对比',
    desc: '24款大模型综合对比排行榜。价格/速度/上下文/MMLU/HumanEval多维排序筛选，辅助AI选型决策。',
    tags: [{text:'AI',cls:'tag'},{text:'LLM',cls:'tag-orange'},{text:'Benchmark',cls:'tag-green'}],
    sourceDir: 'llm-compare', targetSubdir: 'llm-compare', cat:'ai'
  },
  urlenc01: {
    icon: '🔗', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: 'URL 编解码工具',
    desc: 'URL Encode/Decode 在线转码。支持encodeURIComponent和encodeURI四种模式，纯本地处理。',
    tags: [{text:'URL',cls:'tag'},{text:'编码',cls:'tag-green'},{text:'解码',cls:'tag'}],
    sourceDir: 'url-encoder', targetSubdir: 'url-encoder', cat:'dev'
  },
  uuid01: {
    icon: '🆔', iconBg: '#e8f5e9', iconColor: '#2e7d32',
    title: 'UUID 生成器',
    desc: '免费在线UUID/GUID生成，v1/v4/NIL三版本，批量1-100个，7种格式输出。',
    tags: [{text:'UUID',cls:'tag'},{text:'GUID',cls:'tag-green'},{text:'唯一ID',cls:'tag'}],
    sourceDir: 'uuid-generator', targetSubdir: 'uuid-generator', cat:'dev'
  },
  regex01: {
    icon: '⚡', iconBg: '#e8eaf6', iconColor: '#5c6bc0',
    title: '正则表达式测试器',
    desc: '实时正则匹配调试，支持分组提取/高亮显示/批量替换。内置20+常用正则模板，g/i/m/s/u标志。',
    tags: [{text:'Regex',cls:'tag'},{text:'正则',cls:'tag-green'},{text:'调试',cls:'tag'}],
    sourceDir: 'regex-tester', targetSubdir: 'regex', cat:'dev'
  },
  unixts01: {
    icon: '⏱️', iconBg: '#e8eaf6', iconColor: '#5c6bc0',
    title: 'Unix 时间戳转换器',
    desc: '时间戳与日期双向转换，支持秒/毫秒/微秒格式，实时当前时间戳，批量转换。开发者/运维必备。',
    tags: [{text:'Unix',cls:'tag'},{text:'时间戳',cls:'tag-green'},{text:'Epoch',cls:'tag'}],
    sourceDir: 'unix-timestamp-converter', targetSubdir: 'unix-timestamp', cat:'dev'
  },
  jwt01: {
    icon: '🔐', iconBg: '#e8f5e9', iconColor: '#2e7d32',
    title: 'JWT 解码器',
    desc: '在线解析JWT Header/Payload/签名，时间戳转换，过期检测。纯浏览器本地解析，数据不上传。',
    tags: [{text:'JWT',cls:'tag'},{text:'安全',cls:'tag-red'},{text:'解码',cls:'tag-green'}],
    sourceDir: 'jwt-decoder', targetSubdir: 'jwt-decoder', cat:'dev'
  },
  formbuilder01: {
    icon: '📋', iconBg: '#f0edff', iconColor: '#6c5ce7',
    title: '在线表单生成器',
    desc: '可视化拖拽构建HTML表单。12种字段类型，一键导出完整HTML/CSS代码。SEO友好，响应式。',
    tags: [{text:'表单',cls:'tag'},{text:'HTML',cls:'tag-green'},{text:'可视化',cls:'tag-orange'}],
    sourceDir: 'form-builder', targetSubdir: 'form-builder', cat:'dev'
  },
  sshkey01: {
    icon: '🔑', iconBg: '#e8f5e9', iconColor: '#2e7d32',
    title: 'SSH 密钥生成器',
    desc: '纯浏览器端生成RSA/ECDSA/ED25519 SSH密钥对。Web Crypto API本地生成，安全可靠。',
    tags: [{text:'SSH',cls:'tag'},{text:'安全',cls:'tag-red'},{text:'加密',cls:'tag-green'}],
    sourceDir: 'ssh-key-generator', targetSubdir: 'ssh-key-generator', cat:'dev'
  },
  dns01: {
    icon: '🌐', iconBg: '#e8eaf6', iconColor: '#5c6bc0',
    title: 'DNS 传播检测器',
    desc: '全球多节点DNS解析查询对比。Google/Cloudflare/Quad9/AliDNS四节点，7种记录类型实时检测。',
    tags: [{text:'DNS',cls:'tag'},{text:'DevOps',cls:'tag-green'},{text:'网络',cls:'tag'}],
    sourceDir: 'dns-checker', targetSubdir: 'dns-checker', cat:'dev'
  },
  imgcompressor01: {
    icon: '🖼️', iconBg: '#e8f5e9', iconColor: '#27ae60',
    title: '图片压缩工具',
    desc: '纯浏览器Canvas API处理，支持批量压缩/WebP优化/质量可调。拖拽上传，隐私安全。',
    tags: [{text:'图片',cls:'tag'},{text:'压缩',cls:'tag-green'},{text:'WebP',cls:'tag'}],
    sourceDir: 'image-compressor', targetSubdir: 'image-compressor', cat:'dev'
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
  log('Sync ToolkitBox (v4)');
  if (DRY_RUN) log('DRY RUN');

  const projPath = path.join(PROJECT_ROOT, 'evolve_agent', 'data', 'projects.json');
  const projects = JSON.parse(fs.readFileSync(projPath, 'utf8'));
  const tk = projects.projects.toolkitbox;
  if (!tk) { warn('toolkitbox not found'); return; }
  log('toolkitbox: ' + tk.assets.length + ' assets');

  const toolList = [];
  for (const a of tk.assets) {
    const d = TOOL_DISPLAY[a.id] || { ...DEFAULT_DISPLAY, title: a.id, desc: '' };
    const src = path.join(CONFIG.toolsiteDir, d.sourceDir || a.dir, 'index.html');
    const tgtDir = path.join(CONFIG.targetDir, d.targetSubdir || a.sub);
    const tgt = path.join(tgtDir, 'index.html');
    if (!fs.existsSync(src)) { warn('missing: ' + src); continue; }
    if (!DRY_RUN) {
      fs.mkdirSync(tgtDir, { recursive: true });
      let html = fs.readFileSync(src, 'utf8');
      html = html.replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="https://' + CONFIG.domain + '/' + (d.targetSubdir || a.sub) + '/">');
      html = injectAds(html);
      fs.writeFileSync(tgt, html);
    }
    toolList.push({ id: a.id, name: d.title, desc: d.desc, icon: d.icon, iconBg: d.iconBg, iconColor: d.iconColor, tags: d.tags, url: '/' + (d.targetSubdir || a.sub) + '/', cat: d.cat || 'other' });
    log('  ' + d.title + ' -> ' + (d.targetSubdir || a.sub));
  }

  if (!DRY_RUN) {
    fs.writeFileSync(path.join(CONFIG.targetDir, 'tools.json'), JSON.stringify(toolList, null, 2));
    fs.writeFileSync(path.join(CONFIG.targetDir, 'index.html'), generateIndex(toolList));
    fs.writeFileSync(path.join(CONFIG.targetDir, 'CNAME'), CONFIG.domain);
    fs.writeFileSync(path.join(CONFIG.targetDir, 'ads.txt'), 'google.com, ' + CONFIG.adsClient.replace('ca-', 'pub-') + ', DIRECT, f08c47fec0942fa0');
  }

  if (!DRY_RUN && !NO_PUSH) {
    try {
      execSync('git add -A', { cwd: CONFIG.targetDir, stdio: 'ignore' });
      execSync('git commit -m "sync: ToolkitBox ' + toolList.length + ' tools (v4)"', { cwd: CONFIG.targetDir, stdio: 'ignore' });
      execSync('git push', { cwd: CONFIG.targetDir, stdio: 'inherit', timeout: 30000 });
      log('GitHub OK');
    } catch(e) { warn('Git: ' + e.message.substring(0,50)); }
  }

  log('ToolkitBox: ' + toolList.length + ' tools -> ' + CONFIG.domain);
}

main().catch(err => { console.error(err); process.exit(1); });

function generateIndex(toolList) {
  const cards = toolList.map(t => '<a href="' + t.url + '" class="tool-card" data-cat="' + (t.cat||'other') + '"><div class="card-icon" style="background:' + t.iconBg + ';color:' + t.iconColor + '">' + t.icon + '</div><h3>' + t.name + '</h3><p class="desc">' + t.desc + '</p><div class="tags">' + t.tags.map(tg => '<span class="' + tg.cls + '">' + tg.text + '</span>').join('') + '</div></a>').join('');
  const cats = {all:'全部',dev:'开发者工具',design:'设计工具',seo:'SEO/营销'};
  const catBtns = Object.entries(cats).map(([k,v]) => '<button class="cat-btn'+(k==='all'?' active':'')+'" data-cat="'+k+'">'+v+'</button>').join('');
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>ToolkitBox - 开发者工具集</title><meta name="description" content="免费在线开发者工具集"><link rel="canonical" href="https://'+CONFIG.domain+'/">'+CONFIG.adsScript+'<style>:root{--bg:#fff;--t:#1a1a2e;--t2:#636e72;--p:#6c5ce7;--b:#e9ecef;--s:0 2px 12px rgba(0,0,0,.06)}*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:linear-gradient(135deg,#f5f7fa,#e8ecf1);color:var(--t);min-height:100vh}.hero{text-align:center;padding:50px 20px 20px}.hero h1{font-size:2.2rem;font-weight:800;background:linear-gradient(135deg,#6c5ce7,#e17055);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}.hero p{color:var(--t2);font-size:.95rem}.cats{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:12px 0 20px;padding:0 20px}.cat-btn{padding:7px 16px;border-radius:20px;border:1.5px solid var(--b);background:var(--bg);cursor:pointer;font-size:.82rem;transition:.2s;color:var(--t)}.cat-btn:hover,.cat-btn.active{background:var(--p);color:#fff;border-color:var(--p)}.tools-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;max-width:1100px;margin:0 auto;padding:0 20px 40px}.tool-card{background:var(--bg);border-radius:14px;padding:28px;box-shadow:var(--s);border:1px solid var(--b);transition:.25s;text-decoration:none;color:var(--t);display:block}.tool-card:hover{transform:translateY(-4px);box-shadow:0 8px 30px rgba(108,92,231,.15);border-color:#a29bfe}.tool-card.hidden{display:none}.card-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:14px}.tool-card h3{font-size:1.1rem;margin-bottom:6px}.tool-card .desc{font-size:.83rem;color:var(--t2);line-height:1.6;margin-bottom:12px}.tags{display:flex;gap:6px;flex-wrap:wrap}.tag{font-size:.7rem;padding:3px 10px;border-radius:20px;font-weight:500;background:#f0edff;color:var(--p)}.tag-orange{background:#fff8e1;color:#e17055}.tag-green{background:#e6fff5;color:#00b894}.tag-red{background:#ffeaea;color:#ff6b6b}.footer{text-align:center;padding:30px;color:var(--t2);font-size:.78rem}@media(max-width:700px){.hero h1{font-size:1.6rem}.tools-grid{grid-template-columns:1fr}}</style></head><body><div class="hero"><h1>ToolkitBox</h1><p>免费在线开发者工具集 · 数据本地处理 · 安全不上传</p><div style="display:flex;justify-content:center;gap:16px;margin:16px 0"><div style="background:#fff;padding:10px 20px;border-radius:10px;box-shadow:var(--s);text-align:center"><div style="font-size:1.3rem;font-weight:800;color:var(--p)">'+toolList.length+'</div><div style="font-size:.72rem;color:var(--t2)">开发者工具</div></div></div></div><div class="cats">'+catBtns+'</div><div class="tools-grid">'+cards+'</div><footer class="footer"><p>toolkitbox.cn · 免费开发者工具 | &copy; 2026</p></footer><script>document.querySelectorAll(".cat-btn").forEach(b=>b.addEventListener("click",function(){var c=this.getAttribute("data-cat");document.querySelectorAll(".cat-btn").forEach(b=>b.classList.toggle("active",b===this));document.querySelectorAll(".tool-card").forEach(card=>card.classList.toggle("hidden",c!=="all"&&card.getAttribute("data-cat")!==c))}))</script></body></html>';
}
