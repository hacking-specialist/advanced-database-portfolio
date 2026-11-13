import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './lib.mjs';
const skip = new Set(['.git','.cache','.runs','node_modules','tmp']);
async function walk(dir) {
  const all=[];
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    if(skip.has(entry.name)) continue;
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()) all.push(...await walk(file)); else all.push(file);
  }
  return all;
}
const files=await walk(root);
let links=0,scripts=0;
for(const file of files) {
  if(file.endsWith('.mjs')) {
    const check=spawnSync(process.execPath,['--check',file],{windowsHide:true,encoding:'utf8'});
    if(check.status!==0) throw new Error(check.stderr); scripts++;
  }
  if(file.endsWith('.md')) {
    const content=await readFile(file,'utf8');
    for(const match of content.matchAll(/\]\(([^)]+)\)/g)) {
      const target=match[1].replace(/^<|>$/g,'').split('#')[0];
      if(!target || /^[a-z]+:/i.test(target)) continue;
      await access(path.resolve(path.dirname(file),decodeURIComponent(target))); links++;
    }
  }
}
console.log(`PASS: ${scripts} JavaScript modules parse; ${links} local Markdown links resolve; ${files.length} deliverable files inspected`);
