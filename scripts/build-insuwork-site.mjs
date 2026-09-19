import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

// The existing site remains the only product source. Never copy local/untracked files.
const source = resolve(process.argv[2] || '.');
const output = resolve(process.argv[3] || 'dist/insuwork-site');
if (source === output || source.startsWith(output + '/')) throw Error('Invalid output directory');
const folders = new Set(['assets', 'css', 'data', 'downloads', 'insu', 'insubriefing', 'insurance', 'insuwork', 'js', 'pages']);
const files = execFileSync('git', ['ls-files', '-z'], { cwd: source, encoding: 'utf8' }).split('\0').filter(Boolean);
await mkdir(output, { recursive: true });
for (const file of files) {
  const parts = file.split('/');
  if (!(folders.has(parts[0]) || (parts.length === 1 && /\.(html|ico|js|json)$/.test(file)))) continue;
  await mkdir(resolve(output, ...parts.slice(0, -1)), { recursive: true });
  await cp(resolve(source, file), resolve(output, file));
}
let html = await readFile(join(source, 'insuwork/index.html'), 'utf8');
html = html.replace(/\b(src|href)="\.\//g, '$1="/insuwork/');
await writeFile(join(output, 'index.html'), html);
const manifest = JSON.parse(await readFile(join(source, 'insuwork/manifest.json'), 'utf8'));
manifest.start_url = '/';
manifest.scope = '/';
await writeFile(join(output, 'insuwork/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(join(output, '.nojekyll'), '');
await writeFile(join(output, 'CNAME'), 'insuwork.onesecond.solutions\n');
await writeFile(join(output, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
await writeFile(join(output, 'deployment.json'), JSON.stringify({ source: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: source, encoding: 'utf8'}).trim() }) + '\n');
console.log('Built insurancework static site:', output);
