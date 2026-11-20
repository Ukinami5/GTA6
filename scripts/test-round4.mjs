// Deterministic save, vehicle, taxi and route checks, then keyboard-only free-roam failures.
// The complete five-story chain regression remains in test-round3.mjs.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const chrome=process.env.SHOT_CHROME||'/tmp/neontide-browser/chrome-headless-shell-linux64/chrome-headless-shell';
const server=spawn(process.execPath,['serve.ts','--port','4175'],{stdio:'ignore'});
const browser=spawn(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--use-gl=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port=9334','--remote-allow-origins=*','--user-data-dir=/tmp/neontide-test-round4','about:blank'],{stdio:'ignore'});
let ws;
try{
  let target;
  for(let i=0;i<100;i++){try{target=(await (await fetch('http://127.0.0.1:9334/json/list')).json()).find(p=>p.type==='page');if(target)break;}catch{}await delay(100);}
  assert(target,'Chrome available');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  let id=0;const pending=new Map(),errors=[];
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(JSON.stringify(m.params.args));const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression:expression.includes('await import')?`(async()=>{${expression}})()`:expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const key=async key=>{await call('Input.dispatchKeyEvent',{type:'keyDown',key});await call('Input.dispatchKeyEvent',{type:'keyUp',key});};
  const click=id=>evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
  await call('Network.enable');
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.requestWillBeSent'&&!m.params.request.url.startsWith('http://127.0.0.1:4175/')&&!m.params.request.url.startsWith('data:'))errors.push('External request '+m.params.request.url);});
  await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:640,height:360,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:'http://127.0.0.1:4175/'});await delay(2000);
  assert.equal(await evaluate("return (await import('./src/main.js')).audio.ctx"),null,'audio locked before gesture');
  await evaluate("localStorage.clear()");await click('new-game');
  const bind=()=>evaluate("window.g=await import('./src/main.js');window.e=await import('./src/systems/economy.js');window.v=await import('./src/vehicles/driving.js')");
  await bind();await key('Escape');
  await evaluate(`window.move=(at)=>{g.game.player.position.set(at[0],0,at[1]);if(g.game.car){g.game.car.position.copy(g.game.player.position);g.game.drive.speed=0;}};
    g.game.player.position.copy(g.missions.veraCar.position);g.missions.veraCar.userData.controller=new v.DrivingController(g.missions.veraCar,g.game.camera,g.game.world.colliders);g.game.enterNearest(()=>{});
    g.missions.restore(['first-errand']);move([0,236]);g.missions.start();move([-90,278]);g.missions.update(1.3);g.missions.timer=73.25;g.saveGame();`);
  for(const scenario of ['hot-ice','collections']){
    if(scenario==='collections')await evaluate(`g.missions.restore(['first-errand','hot-ice','loud-exit']);move([0,236]);g.missions.start();move([-140,140]);g.missions.update(1.3);move([-210,0]);g.missions.update(1.3);g.saveGame();`);
    const saved=await evaluate("JSON.parse(localStorage.getItem('neontide-save-v1'))");
    await call('Page.reload');await delay(1500);await click('continue-game');await bind();await key('Escape');
    const restored=await evaluate('({mission:g.missions.snapshot(),completed:g.missions.completed,car:!!g.game.car,objective:g.missions.objective})');
    assert.equal(restored.mission.id,saved.mission.id);assert.equal(restored.mission.step,saved.mission.step);assert.deepEqual(restored.mission.visited,saved.mission.visited);if(saved.mission.timer!==null)assert(Math.abs(restored.mission.timer-saved.mission.timer)<1);assert.deepEqual(restored.completed,saved.completed);assert(restored.car);
    console.log('Mid-mission reload:',JSON.stringify(restored));
    await evaluate(`window.move=(at)=>{g.game.player.position.set(at[0],0,at[1]);if(g.game.car){g.game.car.position.copy(g.game.player.position);g.game.drive.speed=0;}}`);
  }
  const vehicle=await evaluate(`(()=>{const {game,missions:m}=g,car=game.car,b=game.world.colliders[0],log=[];
    for(let i=0;i<8&&car.userData.health;i++){car.position.set((b.minX+b.maxX)/2,0,b.minZ-3);car.rotation.y=0;game.drive.speed=30;game.drive.update(.04,{});log.push(car.userData.health);}
    if(car.userData.health!==0)throw Error('Car survived hard impacts');
    const at=car.position.clone();game.drive.update(1,{forward:true});if(!car.position.equals(at))throw Error('Disabled car moved');
    v.updateVehicleHealth(.1,game);const smoke=car.userData.smoke.visible;
    game.exit();const blocked=game.nearestCar()!==car;
    const replacement=game.world.cars[1];game.player.position.copy(replacement.position);replacement.userData.controller=new v.DrivingController(replacement,game.camera,game.world.colliders);game.enterNearest(()=>{});
    while(m.active){move(m.active.objectives[m.step].at);m.update(1.3);}
    const success=m.result.success;
    game.exit();game.player.position.set(275,0,290);v.updateVehicleHealth(26,game);
    return {impacts:log,smoke,blocked,success,repaired:car.userData.health,completed:m.completed};})()`);
  assert(vehicle.smoke&&vehicle.blocked&&vehicle.success);assert.equal(vehicle.repaired,100);console.log('Vehicle loss / replacement / Collections completion:',vehicle);
  await click('result-continue');await key('Escape');
  const taxi=await evaluate(`(()=>{const m=g.missions,game=g.game;m.restore(['first-errand','hot-ice','loud-exit','collections','neon-tide']);
    const car=game.world.cars[1];game.player.position.copy(car.position);game.enterNearest(()=>{});move([8,70]);m.update(.1);
    const seated=!!m.passenger&&m.passenger.parent===game.car&&m.passenger.visible;const base=m.taxi.fare;
    const second=game.world.cars[0];game.exit();game.player.position.copy(second.position);game.enterNearest(()=>{});m.update(.1);
    const transferred=m.passenger.parent===game.car;
    move(m.taxi.destination);const cash=e.getCash();m.update(.1);return {seated,transferred,removed:!m.passenger,paid:e.getCash()-cash,base};})()`);
  assert(taxi.seated&&taxi.transferred&&taxi.removed);assert.equal(taxi.paid,taxi.base+40);console.log('Taxi passenger:',taxi);
  const routes=await evaluate(`(()=>{const traffic=g.traffic,boxes=g.game.world.colliders;let samples=0;const lengths=[];
    for(const route of traffic.routes){let length=0;for(let i=0;i<route.length;i++){const a=route[i],b=route[(i+1)%route.length],n=Math.ceil(a.distanceTo(b)*2);length+=a.distanceTo(b);
      for(let j=0;j<=n;j++){const p=a.clone().lerp(b,j/n);samples++;if(boxes.some(c=>p.x>c.minX-2.4&&p.x<c.maxX+2.4&&p.z>c.minZ-2.4&&p.z<c.maxZ+2.4))throw Error('Route clips building '+p.toArray());}}
      lengths.push(length);}
    for(let t=0;t<1200;t++){traffic.update(.5,g.game.player.position,g.game.camera);for(const u of traffic.units)if(u.car.userData.ambient&&boxes.some(c=>u.car.position.x>c.minX-2.4&&u.car.position.x<c.maxX+2.4&&u.car.position.z>c.minZ-2.4&&u.car.position.z<c.maxZ+2.4))throw Error('Traffic entered building');}
    return {lengths,samples,simulatedSeconds:600,cars:traffic.units.length};})()`);
  assert(routes.lengths.length>=2);console.log('Road clearance:',routes);
  const finale=await evaluate(`window.g=await import('./src/main.js');const v=await import('./src/vehicles/driving.js');const e=await import('./src/systems/economy.js');
    const m=g.missions,game=g.game,before=e.getCash();m.restore(['first-errand','hot-ice','loud-exit','collections']);m.start();v.damageVehicle(m.veraCar,100);
    const enter=car=>{game.exit();game.player.position.copy(car.position);car.userData.controller=new v.DrivingController(car,game.camera,game.world.colliders);game.enterNearest(()=>{});};
    const move=at=>{game.car.position.set(at[0],0,at[1]);game.player.position.copy(game.car.position);game.drive.speed=0;m.update(1.3);};
    enter(game.world.cars[1]);move([8,236]);if(m.step!==1)throw Error('Disabled Vera acquisition blocked');v.damageVehicle(game.car,100);
    enter(game.world.cars.find(c=>c.userData.ambient&&c.userData.health>0));move([-140,236]);const heat=g.wanted.level;move([-70,-210]);
    return {success:m.result?.success,completed:m.completed,payout:e.getCash()-before,heat};`);
  assert(finale.success);assert.equal(finale.completed.length,5);assert.equal(finale.payout,2500);assert.equal(finale.heat,3);assert.deepEqual(errors,[]);console.log('Finale survives loss of Vera car AND replacement:',finale);
  await click('result-continue');await key('Escape');
  const ram=await evaluate(`(()=>{const game=g.game;g.wanted.reset();g.police.reset();g.wanted.crime();g.police.spawn(game.player.position,0);g.police.previousLevel=1;const u=g.police.units[0];u.car.position.copy(game.car.position);u.car.position.z-=2.5;u.speed=15;const before=game.car.userData.health;g.police.update(.04,game,g.wanted,n=>g.combat.damage(n));const loss=before-game.car.userData.health;g.wanted.reset();g.police.reset();return loss;})()`);
  assert.equal(ram,9);console.log('Police ram car damage:',ram);
  // Use the real animation loop and keyboard controls below; no direct health writes.
  await call('Page.reload');await delay(1500);await click('new-game');await bind();
  await call('Emulation.setDeviceMetricsOverride',{width:640,height:360,deviceScaleFactor:1,mobile:false});
  const down=key=>call('Input.dispatchKeyEvent',{type:'keyDown',key});
  const up=key=>call('Input.dispatchKeyEvent',{type:'keyUp',key});
  await down('w');await down('Shift');
  for(let i=0;i<80;i++){if(await evaluate('g.game.nearestCar()?.userData.occupied'))break;await delay(200);}
  await up('w');await up('Shift');await key('e');
  console.log('Free roam theft:',await evaluate('({car:g.game.car?.userData.name,health:g.combat.health,wanted:g.wanted.level,position:g.game.player.position.toArray()})'));
  if(!await evaluate('g.wanted.level>0'))throw Error('Keyboard theft did not raise heat');
  await key('e');
  let wasted=false;const damageLog=[];
  for(let i=0;i<180;i++){
    const direction=i%2?'w':'s';await down(direction);await delay(350);await up(direction);
    const r=await evaluate('({health:g.combat.health,cash:e.getCash(),wanted:g.wanted.level,position:g.game.player.position.toArray(),active:!!g.missions.active,subtitle:document.getElementById("subtitle").textContent})');
    if(i%10===0||r.cash!==250){damageLog.push(r);console.log('Free roam sample:',r);}
    if(r.cash!==250){assert.equal(r.cash,225);assert.equal(r.wanted,0);assert.equal(r.active,false);assert(Math.hypot(r.position[0]-3,r.position[2]-218)<5);assert.equal(r.health,100);assert.match(r.subtitle,/WASTED/);wasted=true;break;}
  }
  assert(wasted,'free roam wasted reached by police contact');
  console.log('Continuous free-roam wasted: passed',JSON.stringify(damageLog));
  await call('Page.reload');await delay(1500);await click('new-game');await bind();
  await down('w');await down('Shift');
  for(let i=0;i<80;i++){if(await evaluate('g.game.nearestCar()?.userData.occupied'))break;await delay(200);}
  await up('w');await up('Shift');await key('e');assert(await evaluate('g.wanted.level>0'));await key('e');
  let busted=false;
  for(let i=0;i<180;i++){const r=await evaluate('({cash:e.getCash(),wanted:g.wanted.level,health:g.combat.health,position:g.game.player.position.toArray(),active:!!g.missions.active,subtitle:document.getElementById("subtitle").textContent})');
    if(r.cash!==250){assert.equal(r.cash,212);assert.equal(r.wanted,0);assert.equal(r.health,100);assert.equal(r.active,false);assert(Math.hypot(r.position[0]-3,r.position[2]-218)<1);assert.match(r.subtitle,/BUSTED/);busted=true;console.log('Continuous free-roam busted:',r);break;}await delay(300);}
  assert(busted,'free-roam three-second arrest');
  await key('Escape');
  await evaluate(`g.game.exit();const car=g.game.world.cars[1];g.game.player.position.copy(car.position);car.userData.controller=new v.DrivingController(car,g.game.camera,g.game.world.colliders);g.game.enterNearest(()=>{});g.wanted.crime();g.police.spawn(g.game.player.position,0);g.police.units[0].car.position.copy(g.game.player.position).add({x:15,y:0,z:0});`);
  const audio=await evaluate(`(()=>{const engine=g.audio.engine.osc,context=g.audio.ctx;g.audio.start();g.audio.start();if(engine!==g.audio.engine.osc||context!==g.audio.ctx)throw Error('Audio stacked');return {state:g.audio.ctx.state,master:g.audio.master.gain.value,voices:g.audio.voices,beat:g.audio.beat,ceiling:Math.max(...g.audio.limiter.curve)};})()`);
  await click('resume');
  const burst=await evaluate(`(()=>{for(let i=0;i<100;i++)g.audio.effect('shot');return g.audio.voices;})()`);assert(burst<=24);
  const audioSamples=[];
  for(let i=0;i<20;i++){audioSamples.push(await evaluate(`(()=>{const a=g.audio,b=new Float32Array(a.analyser.fftSize);a.analyser.getFloatTimeDomainData(b);return {peak:Math.max(...b.map(Math.abs)),voices:a.voices,beat:a.beat,engine:a.engine.gain.gain.value,siren:a.siren.gain.gain.value};})()`));await delay(150);}
  await key('m');await delay(300);const muted=await evaluate('g.audio.master.gain.value');assert(muted<.0001);await key('m');
  assert(audioSamples.every(s=>s.peak<.81&&s.voices<=24));assert(audioSamples.at(-1).beat>audioSamples[0].beat);assert(audioSamples.some(s=>s.engine>.05&&s.siren>.05));assert(audioSamples.at(-1).voices<12);
  console.log('Objective audio check:',JSON.stringify({audio,burst,muted,peak:Math.max(...audioSamples.map(s=>s.peak)),maxVoices:Math.max(...audioSamples.map(s=>s.voices))}));
  await key('Escape');
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await evaluate(`g.wanted.reset();g.police.reset();g.missions.restore(['first-errand','hot-ice','loud-exit','collections','neon-tide']);g.game.car.position.set(8,0,70);g.game.car.rotation.y=0;g.game.player.position.copy(g.game.car.position);g.game.drive.speed=0;g.missions.update(.1);g.game.camera.position.set(3,3.8,75);g.game.camera.lookAt(8,1.4,70);`);
  await evaluate(`document.getElementById('pause').classList.add('hidden')`);
  await delay(400);const passengerImage=await call('Page.captureScreenshot',{format:'jpeg',quality:85});writeFileSync('/tmp/neontide-passenger.jpg',Buffer.from(passengerImage.data,'base64'));
  await evaluate(`v.damageVehicle(g.game.car,95);v.updateVehicleHealth(1,g.game)`);await delay(300);const smokeImage=await call('Page.captureScreenshot',{format:'jpeg',quality:85});writeFileSync('/tmp/neontide-damage.jpg',Buffer.from(smokeImage.data,'base64'));
  assert.deepEqual(errors,[]);console.log('Round 4 browser checks passed; no console exceptions/errors or external requests.');
}finally{ws?.close();browser.kill();server.kill();}
