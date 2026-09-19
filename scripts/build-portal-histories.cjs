/* Reuse verified history content; never execute the legacy page scripts in the app. */
const fs = require('node:fs');
const vm = require('node:vm');
const read = key => fs.readFileSync(`insurance/${key}/index.html`, 'utf8');
function literal(source, name) {
  const match = source.match(new RegExp('const '+name+'\\s*=\\s*(\\[[\\s\\S]*?\\n\\]);'));
  if (!match) throw Error('Missing history data: '+name);
  return vm.runInNewContext('('+match[1]+')', Object.create(null), {timeout:1000});
}
function facts(cols, rows, i, care) {
  return '<dl class="iph-facts">'+rows.map(r=>'<div><dt>'+r.label+'</dt><dd>'+(care?r[cols[i].key][0]+(r[cols[i].key][1]?'<small>'+r[cols[i].key][1]+'</small>':''):(typeof r.cells[i]==='string'?r.cells[i]:r.cells[i].html))+'</dd></div>').join('')+'</dl>';
}
const result = {};
for (const key of ['silson-history','cancer-treatment-history','caregiver-history']) {
  const source = read(key);
  let body = source.match(/<div class="doc-body">([\s\S]*?)<\/div><!-- \/\.doc-body -->/)[1];
  const care = key==='caregiver-history', cancer = key==='cancer-treatment-history';
  const cols=literal(source,care?'COLS':cancer?'CT_COLS':'SL_COLS'), rows=literal(source,care?'ROWS':cancer?'CT_ROWS':'SL_ROWS');
  body = body.replace('<div id="cmpCards"></div>','').replace('<div id="cmpTable"></div>',care?'<div class="iph-products">'+cols.map((c,i)=>'<section class="iph-product"><header><span>0'+(i+1)+'</span><h3>'+c.label+'</h3><p>'+c.sub+'</p></header>'+facts(cols,rows,i,true)+'</section>').join('')+'</div>':'');
  if (cancer) {
    const generations = literal(source,'GENS');
    body = body.replace('<div class="gens" id="gens"></div>', '<nav class="iph-eras" aria-label="세대별 본문">'+generations.map((g,i)=>'<a href="#era-'+(i+1)+'"><strong>'+g.no+'</strong><span>'+g.yr+'</span><b>'+g.hl+'</b></a>').join('')+'</nav>');
    body = body.replace('<div id="deep"></div>', generations.map((g,i)=>'<section class="iph-era" id="era-'+(i+1)+'"><header><span>'+g.yr+'</span><h2>'+g.no+' · '+g.hl+'</h2></header><p class="lead">'+g.sum+'</p>'+facts(cols,rows,i,false)+'<div class="d-grid">'+g.cards.map(c=>'<div class="d-card"><h3>'+c.t+'</h3><p>'+c.b+'</p></div>').join('')+'</div></section>').join(''));
  } else if (care) {
    body = body.replace('<div class="chk" id="chk"></div>', '<dl class="iph-checks">'+literal(source,'CHK').map((c,i)=>'<div><dt><span>'+String(i+1).padStart(2,'0')+'</span>'+c[0]+'</dt><dd>'+c[1]+'</dd></div>').join('')+'</dl>');
  } else {
    body = body.replace(/<div class="gen (g\d)" data-g="(\d)" onclick="sel\(\d\)">([\s\S]*?)<div class="arw">클릭 ▾<\/div><\/div>/g,'<a href="#pan$2" class="iph-era-link">$3</a>');
    body = body.replace('아래 세대 카드를 눌러 각 세대의 자기부담·보장 특징을 확인하세요.','아래 세대별 목차에서 자기부담·보장 특징을 이어 읽으세요.');
  }
  if (!care && !cancer) body = body.replace(/(<div class="panel p(\d)" id="pan\d">[\s\S]*?<p class="lead">[\s\S]*?<\/p>)/g,(m,all,n)=>all+facts(cols,rows,Number(n)-1,false));
  body = body.replace('아래 세대 카드를 눌러 각 세대의 구조와 확인 포인트를 보세요.','아래 세대별 목차에서 구조와 확인 포인트를 이어 읽으세요.');
  body = body.replace(/<table>([\s\S]*?)<\/table>/g,(_,table)=>{
    const headers=[...table.match(/<thead>([\s\S]*?)<\/thead>/)[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m=>m[1]);
    const data=[...table.match(/<tbody>([\s\S]*?)<\/tbody>/)[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>[...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(c=>c[1]));
    return '<div class="iph-products">'+headers.slice(1).map((h,i)=>'<section class="iph-product"><h3>'+h+'</h3><dl class="iph-facts">'+data.map(r=>'<div><dt>'+r[0]+'</dt><dd>'+r[i+1]+'</dd></div>').join('')+'</dl></section>').join('')+'</div>';
  });
  body = body.replace(/<div class="hint">[\s\S]*?<\/div>/g,'').replace(/<!--[^]*?-->/g,'').replace(/\s(?:style|onclick)="[^"]*"/g,'');
  body = body.replace(/id="([^"]+)"/g,`id="iph-${key}-$1"`).replace(/href="#([^"]+)"/g,`href="#iph-${key}-$1"`);
  if (/<script|onclick=|<iframe/.test(body)) throw Error('Unexpected executable content');
  result[key] = body.trim();
}
fs.writeFileSync('insuwork/portal-histories.js', '/* Generated from verified source histories by scripts/build-portal-histories.cjs. */\nwindow.OSPortalHistories = '+JSON.stringify(result,null,2)+';\n');
console.log('Built three native history articles with complete comparison and detail content');
