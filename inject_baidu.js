const fs = require('fs');
const path = require('path');

const baidu = '<script>var _hmt=_hmt||[];(function(){var hm=document.createElement("script");hm.src="https://hm.baidu.com/hm.js?c5a1030cb241158e01e441524cb07216";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm,s)})();</script>';

let count = 0;
function walk(dir) {
  const items = fs.readdirSync(dir);
  items.forEach(f => {
    const fp = path.join(dir, f);
    if (f.startsWith('.git') || f === 'assets' || f === 'node_modules') return;
    if (fs.statSync(fp).isDirectory()) return walk(fp);
    if (!f.endsWith('.html')) return;

    let html = fs.readFileSync(fp, 'utf8');
    if (html.includes('hm.baidu.com')) return;

    html = html.replace('</head>', baidu + '\n</head>');
    fs.writeFileSync(fp, html);
    count++;
    console.log('OK', fp);
  });
}

walk('.');
console.log('\nDone:', count, 'files');
