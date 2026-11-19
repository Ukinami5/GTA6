import * as THREE from 'three';
import { CITY } from './config.js';
import { generateCity } from './world/citygen.js';
import { createBuildings } from './world/buildings.js';
import { createOcean, animateOcean } from './world/ocean.js';
import { createSky } from './world/sky.js';
import { createCar } from './vehicles/carFactory.js';
import { DrivingController } from './vehicles/driving.js';
import { createPlayer, PlayerController } from './characters/player.js';
import { HUD } from './ui/hud.js';
import { SCENES } from './shots/scenes.js';

const canvas=document.getElementById('view'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x182d3b);scene.fog=new THREE.FogExp2(0x64736f,.00085);
const camera=new THREE.PerspectiveCamera(56,innerWidth/innerHeight,.1,1600);const seed=Number(new URLSearchParams(location.search).get('seed'))||1;
const city=generateCity(scene,seed);city.colliders.push(...createBuildings(scene,city,seed));const ocean=createOcean(scene),sky=createSky(scene);
const player=createPlayer();scene.add(player);
const car=createCar('sports',0xf06c59);car.position.set(0,0,15);scene.add(car);const second=createCar('sedan',0x34bfc0);second.position.set(10,0,-15);second.rotation.y=Math.PI*.5;scene.add(second);const cars=[car,second];
const controllers=cars.map(c=>new DrivingController(c,camera,city.colliders));cars.forEach((c,i)=>{c.userData.controller=controllers[i];city.cars=cars});
const game=new PlayerController(player,camera,city),hud=new HUD(city),title=document.getElementById('title'),shot=new URLSearchParams(location.search).get('shot');
const keys={};let state=shot?'shot':'title',last=performance.now(),elapsed=0;
if(shot&&SCENES[shot]){SCENES[shot]({sky,camera,player,cars});title.classList.add('hidden');document.getElementById('hint').classList.add('hidden');document.getElementById('objective').textContent=shot==='cover'?'WEST COAST · PORT SOLANA':'MANSION RIDGE · PORT SOLANA';document.getElementById('subtitle').textContent=shot==='cover'?'THE CITY NEVER BELONGS TO ANYONE FOR LONG.':'A WHOLE CITY IN THE PALM OF YOUR HAND.';}
else{player.position.set(3,0,15);camera.position.set(3,6,3);camera.lookAt(3,1,18);}
const mapKey=e=>({w:'forward',arrowup:'forward',s:'back',arrowdown:'back',a:'left',arrowleft:'left',d:'right',arrowright:'right',shift:'run',space:'brake'})[e.key.toLowerCase()];
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k==='escape'){state=state==='paused'?'playing':'paused';document.getElementById('subtitle').textContent=state==='paused'?'PAUSED · PRESS ESC TO RESUME':''}if(k==='e'&&state==='playing')game.enterNearest();if(mapKey(e))keys[mapKey(e)]=true;});
addEventListener('keyup',e=>{if(mapKey(e))keys[mapKey(e)]=false});
title.addEventListener('click',()=>{state='playing';title.classList.add('hidden');});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.04);last=now;elapsed+=dt;if(state==='playing')game.update(dt,keys);if(state==='shot'){player.rotation.y=.08;cars[0].userData.wheels.forEach(w=>{w.rotation.x=Math.sin(elapsed*.3)*.015});}
  animateOcean(ocean,shot?0:elapsed);hud.update(game.car||player,!!game.car);if(shot){document.getElementById('objective').textContent=shot==='cover'?'WEST COAST · PORT SOLANA':'MANSION RIDGE · PORT SOLANA';document.getElementById('subtitle').textContent=shot==='cover'?'THE CITY NEVER BELONGS TO ANYONE FOR LONG.':'A WHOLE CITY IN THE PALM OF YOUR HAND.';}renderer.render(scene,camera);}
requestAnimationFrame(frame);
