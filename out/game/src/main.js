import * as THREE from 'three';
import { generateCity } from './world/citygen.js';
import { createBuildings } from './world/buildings.js';
import { createOcean, animateOcean } from './world/ocean.js';
import { createSky } from './world/sky.js';
import { createCar } from './vehicles/carFactory.js';
import { DrivingController } from './vehicles/driving.js';
import { createPlayer, PlayerController } from './characters/player.js';
import { Traffic } from './vehicles/traffic.js';
import { Pedestrians } from './characters/pedestrians.js';
import { Police } from './characters/police.js';
import { Wanted } from './systems/wanted.js';
import { Combat } from './systems/combat.js';
import { getCash, removeCash } from './systems/economy.js';
import { HUD } from './ui/hud.js';
import { SCENES } from './shots/scenes.js';

const canvas=document.getElementById('view'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x182d3b);scene.fog=new THREE.FogExp2(0x64736f,.00085);
const camera=new THREE.PerspectiveCamera(56,innerWidth/innerHeight,.1,1600);const seed=Number(new URLSearchParams(location.search).get('seed'))||1;
const city=generateCity(scene,seed);city.colliders.push(...createBuildings(scene,city,seed));const ocean=createOcean(scene),sky=createSky(scene);
const player=createPlayer();scene.add(player);
const marina = new THREE.Vector3(3,0,15);
const car = createCar('sports',0xf06c59), second = createCar('sedan',0x34bfc0);
car.position.set(10,0,15);
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
  camera.position.set(3,6,3);
  camera.lookAt(3,1,18);
}
if (showcase) {
  SCENES[showcase]({sky,camera,player,cars});
  title.classList.add('hidden');
  hud.hint.classList.add('hidden');
  hud.objective.textContent = showcase==='cover' ? 'WEST COAST · PORT SOLANA' : 'MANSION RIDGE · PORT SOLANA';
  hud.subtitle.textContent = showcase==='cover' ? 'THE CITY NEVER BELONGS TO ANYONE FOR LONG.' : 'A WHOLE CITY IN THE PALM OF YOUR HAND.';
} else setMarina();

const traffic = new Traffic(scene,city,seed,player.position,showcase);
const pedestrians = new Pedestrians(scene,city,seed,player.position,showcase);
const police = new Police(scene,city), wanted = new Wanted(), combat = new Combat(scene,city);
const aimRay = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0,1,0),-1.36);
function attack(event) {
  if (state!=='playing' || game.car) return;
  let aim;
  if (event) {
    const pointer = new THREE.Vector2(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);
    aimRay.setFromCamera(pointer,camera);
    aim = aimRay.ray.intersectPlane(ground,new THREE.Vector3());
  }
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
function respawn(busted) {
  game.exit();
  setMarina();
  game.motion = 0;
  wanted.reset();
  police.reset();
  combat.reset();
  const loss = Math.round(getCash()*(busted ? .15 : .10));
  removeCash(loss);
  hud.subtitle.textContent = (busted ? 'BUSTED' : 'WASTED')+' · −$'+loss+' · BACK AT THE MARINA';
  notice = 4;
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
  if (key==='escape' && (state==='playing' || state==='paused')) {
    state = state==='paused' ? 'playing' : 'paused';
    hud.subtitle.textContent = state==='paused' ? 'PAUSED · PRESS ESC TO RESUME' : '';
    notice=0;
    for (const action of Object.keys(keys)) keys[action]=false;
  }
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
title.addEventListener('click',() => { state='playing'; title.classList.add('hidden'); });
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
    game.update(dt,keys);
    camera.updateMatrixWorld();
    traffic.update(dt,player.position,camera);
    pedestrians.update(dt,game,wanted);
    combat.update(dt);
    const busted = police.update(dt,game,wanted,amount => combat.damage(amount));
    if (!combat.health || busted) respawn(busted && combat.health>0);
    wanted.update(dt,player.position,police.units.map(unit => unit.car));
    if (!wanted.level && police.units.length) police.reset();
    if (notice>0 && (notice-=dt)<=0) hud.subtitle.textContent='';
  }
  animateOcean(ocean,elapsed);
  hud.update(game.car || player,{
    driving:!!game.car, health:combat.health, cash:getCash(), wanted:wanted.level,
    nearby:state==='playing' && !game.car ? game.nearestCar() : null,
    armed:combat.armed, people:pedestrians.people, blink:Math.floor(police.clock*8)%2, shot:showcase
  });
  renderer.render(scene,camera);
}
requestAnimationFrame(frame);
