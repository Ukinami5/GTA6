import * as THREE from 'three';
import { generateCity } from './world/citygen.js';
import { createBuildings } from './world/buildings.js';
import { createOcean, animateOcean } from './world/ocean.js';
import { createSky, setTimeOfDay } from './world/sky.js';
import { createCar } from './vehicles/carFactory.js';
import { updateVehicleHealth } from './vehicles/driving.js';
import { DrivingController } from './vehicles/driving.js';
import { createPlayer, PlayerController } from './characters/player.js';
import { Traffic } from './vehicles/traffic.js';
import { Pedestrians } from './characters/pedestrians.js';
import { Police } from './characters/police.js';
import { Wanted } from './systems/wanted.js';
import { Combat } from './systems/combat.js';
import { getCash, removeCash, addCash } from './systems/economy.js';
import { HUD } from './ui/hud.js';
import { Missions } from './missions/missions.js';
import { readSave, writeSave, clearSave } from './save/savegame.js';
import { Synth } from './audio/synth.js';
import { SCENES } from './shots/scenes.js';

const canvas=document.getElementById('view'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x182d3b);scene.fog=new THREE.FogExp2(0x64736f,.00085);
const camera=new THREE.PerspectiveCamera(56,innerWidth/innerHeight,.1,1600);const seed=Number(new URLSearchParams(location.search).get('seed'))||1;
const city=generateCity(scene,seed);city.colliders.push(...createBuildings(scene,city,seed));const ocean=createOcean(scene),sky=createSky(scene);
const player=createPlayer();scene.add(player);
const marina = new THREE.Vector3(3,0,218);
const car = createCar('sports',0xf06c59), second = createCar('sedan',0x34bfc0);
car.position.set(8,0,236);car.userData.owned=true;
car.userData.name = 'Solstice';
second.position.set(10,0,-15);
second.rotation.y = Math.PI*.5;
second.userData.name = 'Pelican';
scene.add(car,second);
const cars = city.cars = [car,second];
const game = new PlayerController(player,camera,city), hud = new HUD(city);
const title = document.getElementById('title');
const shot = new URLSearchParams(location.search).get('shot');
const showcase = Object.hasOwn(SCENES,shot) ? shot : null;
const keys = {};
let state = showcase ? 'shot' : 'title', last = performance.now(), elapsed = 0, notice = 0;
function setMarina() {
  player.position.copy(marina);
  player.rotation.y = 0;
  player.userData.legs.forEach(leg => { leg.rotation.x=0; });
  camera.position.set(3,6,206);
  camera.lookAt(3,1,221);
}
setMarina();

const traffic = new Traffic(scene,city,seed,player.position,showcase);
const pedestrians = new Pedestrians(scene,city,seed,player.position,showcase);
const police = new Police(scene,city), wanted = new Wanted(), combat = new Combat(scene,city);
const audio = new Synth();
let dayTime=.72, saveStatus='', respawnMessage='';
const pause=document.getElementById('pause'),resultOverlay=document.getElementById('mission-result');
const saved=readSave();document.getElementById('continue-game').classList.toggle('hidden',!saved);
function clearKeys(){for(const action of Object.keys(keys))keys[action]=false;}
function saveGame(){
  const ok=writeSave({game,cash:getCash(),completed:missions.completed,playtime:elapsed,time:dayTime,mission:missions.snapshot()});
  saveStatus=ok?'Game saved · mission objective and story progress stored.':'Save unavailable · browser storage is blocked.';
  document.getElementById('save-status').textContent=saveStatus;
  return ok;
}
const missions = new Missions(scene,{game,wanted,hud,audio,veraCar:car,onSave:saveGame,onResult:result=>{
  state='result';clearKeys();resultOverlay.classList.remove('hidden');
  document.getElementById('result-label').textContent=result.success?'MISSION COMPLETE':'MISSION FAILED';
  document.getElementById('result-title').textContent=result.name;
  document.getElementById('result-detail').textContent=result.success?'Payout +$'+result.payout+' · '+(missions.completed.length===5?'Vera’s story is complete. The city is yours.':missions.completed.length+'/5 jobs complete.')+' '+saveStatus:result.reason+' Return to Vera’s V to retry.';
}});
function togglePause(){
  if(state!=='playing'&&state!=='paused')return;
  state=state==='paused'?'playing':'paused';pause.classList.toggle('hidden',state!=='paused');clearKeys();audio.effect('click');
}
function continueResult(){if(state!=='result')return;missions.continue();resultOverlay.classList.add('hidden');state='playing';audio.effect('click');}
function mute(){audio.toggle();document.getElementById('mute').textContent='Sound: '+(audio.muted?'Off':'On');}
function begin(data){
  audio.start();audio.effect('click');game.exit();wanted.reset();police.reset();combat.reset();
  removeCash(getCash());addCash(data?data.cash:250);missions.restore(data?.completed||[],data?.mission);
  elapsed=data?.playtime||0;dayTime=data?.time??.72;setMarina();
  if(data){player.position.fromArray(data.position);player.rotation.y=Number.isFinite(data.rotation)?data.rotation:0;
    if(data.car){const vehicle=data.car.vera?car:createCar(data.car.style,0x46b9b0);vehicle.position.fromArray(data.car.position);
      vehicle.rotation.y=Number.isFinite(data.car.rotation)?data.car.rotation:0;
      Object.assign(vehicle.userData,{name:data.car.name||'Solstice',owned:true});vehicle.userData.health=Number.isFinite(data.car.health)?THREE.MathUtils.clamp(data.car.health,0,100):100;scene.add(vehicle);if(!city.cars.includes(vehicle))city.cars.push(vehicle);
      vehicle.userData.controller=new DrivingController(vehicle,camera,city.colliders);
      game.car=vehicle;game.drive=vehicle.userData.controller;player.visible=false;player.position.copy(vehicle.position);}
    camera.position.copy(player.position).add(new THREE.Vector3(0,6,-12));}
  setTimeOfDay(sky,dayTime);state='playing';title.classList.add('hidden');
}
document.getElementById('new-game').onclick=()=>{clearSave();begin(null);};
document.getElementById('continue-game').onclick=()=>begin(readSave());
document.getElementById('resume').onclick=togglePause;
document.getElementById('save-game').onclick=()=>{audio.effect('click');saveGame();};
document.getElementById('controls-toggle').onclick=()=>{audio.effect('click');document.getElementById('controls-list').classList.toggle('hidden');};
document.getElementById('restart').onclick=()=>{respawn(false,true);pause.classList.add('hidden');if(!missions.result)state='playing';};
document.getElementById('mute').onclick=mute;
document.getElementById('result-continue').onclick=continueResult;
if(showcase){
  SCENES[showcase]({sky,camera,player,cars,police,wanted,missions,game});
  dayTime=sky.time;title.classList.add('hidden');hud.hint.classList.add('hidden');
  hud.objective.textContent={cover:'WEST COAST · PORT SOLANA',vista:'MANSION RIDGE · PORT SOLANA',chase:'NEON AVENUE · SHAKE THE PURSUIT',mission:'FIRST ERRAND · COLLECT VERA’S PACKAGE'}[showcase];
  hud.subtitle.textContent={cover:'THE CITY NEVER BELONGS TO ANYONE FOR LONG.',vista:'A WHOLE CITY IN THE PALM OF YOUR HAND.',chase:'KAI: JUST ONE MORE TURN.',mission:'VERA: Welcome to The Gilded Conch, Kai. Every tide brings someone new.'}[showcase];
  missions.marker.visible=showcase==='mission';missions.hails.forEach(p=>p.model.visible=false);
}
const aimRay = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0,1,0),-1.36);
function attack(event) {
  if (state!=='playing' || game.car) return;
  let aim;
  if (event) {
    const pointer = new THREE.Vector2(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);
    aimRay.setFromCamera(pointer,camera);
    aim = aimRay.ray.intersectPlane(ground,new THREE.Vector3());
  }
  if(!combat.cooldown)audio.effect(combat.armed?'shot':'punch');
  combat.attack(game,pedestrians,police,wanted,aim);
}
function interact() {
  const nearby = game.nearestCar();
  if (!game.car && nearby && !nearby.userData.controller) {
    nearby.userData.controller = new DrivingController(nearby,camera,city.colliders);
  }
  game.enterNearest(stolen => {
    if (stolen.userData.occupied) pedestrians.eject(stolen,player.position);
    if (stolen.userData.police) police.remove(stolen.userData.police,true);
    wanted.crime();
  });
}
function respawn(busted,restart=false) {
  missions.fail(restart?'Kai left the job.':busted?'Kai was busted.':'Kai was wasted.');
  game.exit();
  setMarina();
  game.motion = 0;
  wanted.reset();
  police.reset();
  combat.reset();
  const loss = Math.round(getCash()*(busted ? .15 : .10));
  removeCash(loss);
  respawnMessage = (restart ? 'RESTART' : busted ? 'BUSTED' : 'WASTED')+' · −$'+loss+' · BACK AT THE MARINA';
  notice = 4;saveGame();
}
const bindings = {w:'forward',arrowup:'forward',s:'back',arrowdown:'back',a:'left',arrowleft:'left',
  d:'right',arrowright:'right',shift:'run',space:'brake'};
addEventListener('keydown',event => {
  const key = (event.code==='Space' ? 'space' : event.key.toLowerCase());
  if (bindings[key]) {
    event.preventDefault();
    if (state==='playing') keys[bindings[key]]=true;
  }
  if (event.repeat) return;
  if(key==='m'){mute();return;}
  if(key==='escape')togglePause();
  if(key==='enter'&&state==='result')continueResult();
  if (state!=='playing') return;
  if (key==='e') interact();
  if (key==='q' && !game.car) combat.armed = !combat.armed;
  if (key==='f') attack();
});
addEventListener('keyup',event => {
  const action = bindings[event.code==='Space' ? 'space' : event.key.toLowerCase()];
  if (action) keys[action]=false;
});
addEventListener('blur',() => { for (const action of Object.keys(keys)) keys[action]=false; });
canvas.addEventListener('pointerdown',event => { if (event.button===0) attack(event); });

addEventListener('resize',() => {
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
function frame(now) {
  requestAnimationFrame(frame);
  const dt = THREE.MathUtils.clamp((now-last)/1000,.001,.04);
  last = now;
  if (state==='playing') {
    elapsed += dt;
    dayTime=(dayTime+dt/720)%1;setTimeOfDay(sky,dayTime);
    game.update(dt,keys);
    camera.updateMatrixWorld();
    updateVehicleHealth(dt,game);
    traffic.update(dt,player.position,camera);
    pedestrians.update(dt,game,wanted);
    combat.update(dt);
    const busted = police.update(dt,game,wanted,amount => combat.damage(amount));
    if (!combat.health || busted) respawn(busted && combat.health>0);
    wanted.update(dt,player.position,police.units.map(unit => unit.car));
    if (!wanted.level && police.units.length) police.reset();
    if(state==='playing')missions.update(dt);
    if(notice>0){notice-=dt;if(notice>0)hud.subtitle.textContent=respawnMessage;}
  }
  audio.update(game,police,state==='playing');
  animateOcean(ocean,elapsed);
  hud.update(game.car || player,{
    driving:!!game.car, health:combat.health, cash:getCash(), wanted:wanted.level,
    nearby:state==='playing' && !game.car ? game.nearestCar() : null,
    armed:combat.armed, people:pedestrians.people, blink:Math.floor(police.clock*8)%2, shot:showcase,
    blips:missions.blips,objective:missions.objective,time:dayTime
  });
  renderer.render(scene,camera);
  document.documentElement.dataset.ready='true';
}
requestAnimationFrame(frame);

export { game, missions, wanted, police, combat, audio, saveGame, begin, traffic };
