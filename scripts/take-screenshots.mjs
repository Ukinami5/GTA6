import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url))),port=4173,base='http://127.0.0.1:'+port;
const shots=JSON.parse(readFileSync(join(root,'shots.json'),'utf8'));
function findBrowser(dir,depth=0){if(depth>4)return '';try{for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isFile()&&['headless_shell','chrome'].includes(e.name))return p;if(e.isDirectory()){const found=findBrowser(p,depth+1);if(found)return found}}}catch{}return ''}
const chrome=process.env.SHOT_CHROME||findBrowser(join(process.env.HOME||'/root','.cache/ms-playwright'))||'/tmp/neontide-browser/chrome-headless-shell-linux64/chrome-headless-shell';
if(!existsSync(chrome)){console.log('No Chromium headless shell found. Set SHOT_CHROME to its executable path; screenshots were skipped.');process.exit(0)}
mkdirSync(join(root,'screenshots'),{recursive:true});
const server=spawn(process.execPath,[join(root,'serve.ts'),'--port',String(port)],{cwd:root,stdio:'ignore'});
let browser;
try{
  for(let i=0;i<50;i++){try{if((await fetch(base)).ok)break}catch{}await delay(100)}
  browser=spawn(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--use-gl=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port=9222','--remote-allow-origins=*','--user-data-dir=/tmp/neontide-chrome-profile','about:blank'],{stdio:'ignore'});
  let wsUrl;
  for(let i=0;i<100;i++){try{const p=await fetch('http://127.0.0.1:9222/json/version');if(p.ok){wsUrl=(await p.json()).webSocketDebuggerUrl;break}}catch{}await delay(100)}
  if(!wsUrl)throw new Error('Chromium did not expose its DevTools endpoint.');
  const targets=await (await fetch('http://127.0.0.1:9222/json/list')).json(),target=targets.find(x=>x.type==='page');
  if(!target||!target.webSocketDebuggerUrl)throw new Error('Chromium page target was unavailable.');
  const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',no,{once:true})});
  let id=0;const pending=new Map(),errors=[];
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description||'').join(' '));if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
  await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  for(const shot of shots){await call('Page.navigate',{url:base+'/'+shot.query});await delay(2800);const result=await call('Page.captureScreenshot',{format:'jpeg',quality:82,fromSurface:true});const dest=join(root,'screenshots',shot.name);await writeFile(dest,Buffer.from(result.data,'base64'));const size=statSync(dest).size;console.log(shot.name+': '+size+' bytes'+(size<262144?'':' (over 256 KiB)'));if(size>=262144)throw new Error(shot.name+' exceeds 256 KiB')}
  if(errors.length){console.error('Page errors:',errors.join('; '));process.exitCode=1}else console.log('Browser page console: no errors.');ws.close();
}catch(e){console.error('Screenshot capture failed:',e.message);process.exitCode=1}
finally{browser?.kill('SIGTERM');server.kill('SIGTERM')}

