import { spawn } from 'node:child_process';
import { root } from './lib.mjs';
const scripts = ['tools/validate-database.mjs','portfolio-2-query-optimisation/run.mjs',
  'portfolio-3-transactions-concurrency/run.mjs','portfolio-4-nosql/run.mjs','portfolio-5-distributed-cloud/run.mjs',
  'tools/verify-evidence.mjs'];
for (const script of scripts) {
  console.log(`\nRUN ${script}`);
  const child = spawn(process.execPath,[script],{cwd:root,windowsHide:true,stdio:'inherit'});
  const code = await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  if(code!==0) {process.exitCode=1; break;}
}
