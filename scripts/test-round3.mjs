// Browser smoke test. Advances mission actors between reachable road stops to test
// every objective transition deterministically; it is not a driving-route test.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const chrome=process.env.SHOT_CHROME||'/tmp/neontide-browser/chrome-headless-shell-linux64/chrome-headless-shell';
const server=spawn(process.execPath,['serve.ts','--port','4174'],{stdio:'ignore'});
const browser=spawn(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--use-gl=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port=9333','--remote-allow-origins=*','--user-data-dir=/tmp/neontide-test-round3','about:blank'],{stdio:'ignore'});
let ws;
try{
  let target;
  for(let i=0;i<100;i++){try{target=(await (await fetch('http://127.0.0.1:9333/json/list')).json()).find(p=>p.type==='page');if(target)break;}catch{}await delay(100);}
  assert(target,'Chrome available');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  let id=0;const pending=new Map(),errors=[];
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(JSON.stringify(m.params.args));const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression:expression.includes('await import')?`(async()=>{${expression}})()`:expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const key=async key=>{await call('Input.dispatchKeyEvent',{type:'keyDown',key});await call('Input.dispatchKeyEvent',{type:'keyUp',key});};
  const click=id=>evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
  await call('Runtime.enable');await call('Page.enable');await call('Page.navigate',{url:'http://127.0.0.1:4174/'});await delay(2000);
  await evaluate("localStorage.clear()");await click('new-game');
  await evaluate("window.g=await import('./src/main.js');window.e=await import('./src/systems/economy.js');g.game.player.position.copy(g.missions.veraCar.position)");await key('e');
  assert(await evaluate('!!g.game.car'),'E enters car');
  await key('Escape');assert(await evaluate("!document.getElementById('pause').classList.contains('hidden')"),'pause overlay');
  await click('controls-toggle');assert(await evaluate("!document.getElementById('controls-list').classList.contains('hidden')"));
  const results=await evaluate(`(()=>{
    const {missions:m,game,wanted}=g,log=[];
    const move=(at)=>{game.player.position.set(at[0],0,at[1]);if(game.car){game.car.position.copy(game.player.position);game.drive.speed=0;}};
    for(let i=0;i<5;i++){
      move([0,180]);m.update(.1);move([0,236]);m.update(.1);
      if(!m.active)throw Error('Mission did not start '+i);
      const name=m.active.name;
      while(m.active){const o=m.active.objectives[m.step];
        if(o.type==='vehicle'&&game.car!==m.veraCar){
          game.exit();
          // Use the actual controller constructor, retaining the correct car reference.
          const Controller=game.world.cars.find(c=>c.userData.controller)?.userData.controller?.constructor;
          if(!Controller)throw Error('No driving controller');
          m.veraCar.userData.controller=new Controller(m.veraCar,game.camera,game.world.colliders);
          game.player.position.copy(m.veraCar.position);game.enterNearest(()=>{});
        }
        move(o.at);m.update(1.31);
        if(o.heat&&wanted.level<o.heat)throw Error('Heat missing');
      }
      if(!m.result?.success)throw Error('Mission failed '+name);
      log.push({name,cash:e.getCash(),completed:[...m.completed],heat:wanted.level});
      document.getElementById('result-continue').click();
      // Freeze the normal loop while deterministic objective checks run.
      dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
    }return log;
  })()`);
  assert.equal(results.length,5);assert.equal(results.at(-1).cash,5750);console.log('All five story payouts:',JSON.stringify(results));
  await click('save-game');
  const before=await evaluate("JSON.parse(localStorage.getItem('neontide-save-v1'))");assert.equal(before.completed.length,5);assert(before.car);
  await call('Page.reload');await delay(1800);
  assert(await evaluate("!document.getElementById('continue-game').classList.contains('hidden')"));await click('continue-game');
  await evaluate("window.g=await import('./src/main.js');window.e=await import('./src/systems/economy.js')");
  const restored=await evaluate('({cash:e.getCash(),count:g.missions.completed.length,car:g.game.car?.userData.style,wanted:g.wanted.level,units:g.police.units.length,position:g.game.player.position.toArray(),audio:g.audio.ctx.state})');
  assert.equal(restored.cash,5750);assert.equal(restored.count,5);assert.equal(restored.car,before.car.style);assert.equal(restored.wanted,0);assert.equal(restored.units,0);assert.equal(restored.audio,'running');console.log('Reload/Continue:',restored);
  await key('Escape');
  const fares=await evaluate(`(()=>{const {missions:m,game}=g;const log=[];
    for(let i=0;i<2;i++){m.taxiCooldown=0;const h=m.hails[i];game.car.position.copy(h.model.position);game.player.position.copy(game.car.position);game.drive.speed=0;m.update(.1);if(!m.taxi)throw Error('No taxi pickup');
      const base=m.taxi.fare;if(i)game.drive.collisions++;game.car.position.set(...[m.taxi.destination[0],0,m.taxi.destination[1]]);game.player.position.copy(game.car.position);const before=e.getCash();m.update(.1);log.push({paid:e.getCash()-before,expected:base+(i?0:40)});}
    return log;})()`);
  for(const fare of fares)assert.equal(fare.paid,fare.expected);console.log('Taxi clean/collision fares:',fares);
  const timeout=await evaluate(`(()=>{const m=g.missions;m.restore(['first-errand']);g.game.player.position.set(0,0,236);g.game.car.position.copy(g.game.player.position);m.update(.1);g.game.player.position.set(-90,0,278);g.game.car.position.copy(g.game.player.position);m.update(1.4);m.update(111);return m.result;})()`);
  assert.equal(timeout.success,false);assert.match(timeout.reason,/window/);console.log('Timer failure:',timeout.reason);
  await click('result-continue');await key('Escape');
  await evaluate("g.missions.restore([]);g.game.player.position.set(0,0,236);g.game.car.position.copy(g.game.player.position);g.missions.update(.1);g.combat.health=0");
  await click('resume');await delay(300);
  assert.match(await evaluate('g.missions.result?.reason'),/wasted/);assert.equal(await evaluate('g.wanted.level'),0);console.log('Wasted mission failure and police reset passed.');
  await click('result-continue');await key('Escape');
  await evaluate("g.missions.restore([]);g.game.player.position.set(0,0,236);g.missions.update(.1);g.wanted.crime();g.police.spawn(g.game.player.position,0);g.police.previousLevel=1;const u=g.police.units[0];u.car.position.set(0,0,238);u.arrest=3;u.speed=0");
  await click('resume');await delay(300);
  assert.match(await evaluate('g.missions.result?.reason'),/busted/);assert.equal(await evaluate('g.wanted.level'),0);console.log('Busted mission failure and police reset passed.');
  await click('result-continue');await key('Escape');
  await evaluate("g.missions.restore([]);g.game.player.position.set(0,0,236);g.missions.update(.1)");await click('restart');
  assert(await evaluate("!document.getElementById('mission-result').classList.contains('hidden')"),'Restart result overlay');
  await click('result-continue');await key('m');assert(await evaluate('g.audio.muted'));await key('m');assert.equal(await evaluate('g.audio.muted'),false);
  await evaluate("g.audio.effect('punch');g.audio.effect('shot');g.audio.effect('fail');g.audio.effect('success')");await delay(1000);
  assert.deepEqual(errors,[]);console.log('Audio scheduler, mute, menus: no browser console errors.');
  await call('Page.reload');await delay(1200);await click('new-game');assert.equal(await evaluate("localStorage.getItem('neontide-save-v1')"),null);console.log('New Game clears save. Round 3 smoke test passed.');
}finally{ws?.close();browser.kill();server.kill();}
