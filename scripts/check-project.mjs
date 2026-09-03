import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const exts=['.ts','.tsx','.js','.jsx','.json'];
const sourceExts=new Set(['.ts','.tsx','.js','.jsx']);
const missing=[];

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    if(entry.name==='node_modules'||entry.name==='.next'||entry.name==='src/generated')return [];
    return entry.isDirectory()?walk(full):[full];
  });
}

function existsImport(base){
  if(fs.existsSync(base))return true;
  if(exts.some(ext=>fs.existsSync(base+ext)))return true;
  if(exts.some(ext=>fs.existsSync(path.join(base,'index'+ext))))return true;
  return false;
}

for(const file of walk(root)){
  if(!sourceExts.has(path.extname(file)))continue;
  const text=fs.readFileSync(file,'utf8');
  const re=/(?:from\s+|import\s*)['"]([^'"]+)['"]/g;
  for(const match of text.matchAll(re)){
    const spec=match[1];
    let base=null;
    if(spec.startsWith('@/'))base=path.join(root,'src',spec.slice(2));
    else if(spec.startsWith('.'))base=path.resolve(path.dirname(file),spec);
    if(!base)continue;
    if(spec.includes('generated/prisma'))continue;
    if(!existsImport(base))missing.push(`${path.relative(root,file)} -> ${spec}`);
  }
}

const required=[
  'src/app/(marketing)/page.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/app/(app)/dashboard/page.tsx',
  'src/app/(admin)/admin/dashboard/page.tsx',
  'src/lib/ai/router.ts',
  'prisma/schema.prisma',
  '.env.example'
];
for(const rel of required){if(!fs.existsSync(path.join(root,rel)))missing.push(`required file missing: ${rel}`);}

if(missing.length){
  console.error('Project check failed:\n'+missing.map(x=>`- ${x}`).join('\n'));
  process.exit(1);
}
const pageCount=walk(path.join(root,'src','app')).filter(f=>f.endsWith('page.tsx')).length;
console.log(`Project check passed. ${pageCount} page routes found; no missing local imports.`);
