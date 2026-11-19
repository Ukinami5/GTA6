import * as THREE from 'three';
import { createPlayer } from '../characters/player.js';
import { addCash } from '../systems/economy.js';
import { STORY, CLUB } from './story.js';

export function worldLabel(text,color='#ffda88') {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const c=canvas.getContext('2d');c.fillStyle='#071b25dd';c.fillRect(0,0,512,128);
  c.fillStyle=color;c.font='bold 38px sans-serif';c.textAlign='center';c.fillText(text,256,78);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true}));sprite.scale.set(22,5.5,1);return sprite;
}
function marker(scene,color) {
  const group=new THREE.Group(),material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.22,depthWrite:false});
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,18,16,1,true),material);pillar.position.y=9;group.add(pillar);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(3.6,.16,6,40),new THREE.MeshBasicMaterial({color}));ring.rotation.x=Math.PI/2;ring.position.y=.18;group.add(ring);scene.add(group);return group;
}
export class Missions {
  constructor(scene,{game,wanted,hud,audio,onResult,onSave,veraCar}) {
    Object.assign(this,{game,wanted,hud,audio,onResult,onSave,veraCar});
    this.completed=[];this.active=null;this.result=null;this.queue=[];this.speech=0;this.clock=0;this.armed=true;this.taxi=null;this.taxiCooldown=0;
    this.marker=marker(scene,0xffce67);this.blip={position:this.marker.position,color:'#ffd568'};
    this.letter=worldLabel('V · VERA SOLANO');this.letter.scale.set(12,3,1);this.letter.position.set(0,20,0);this.marker.add(this.letter);
    const sign=worldLabel('THE GILDED CONCH');sign.position.set(-20,9,231);scene.add(sign);
    for(const [text,x,y,z,color] of [['NEON AVENUE',-13,8,100,'#65f2e3'],['SOLANA NIGHTS',13,10,92,'#ff80b5'],['BEACH BAR',210,5,248,'#ffce67'],['MARINA WAREHOUSE',-146,8,230,'#65f2e3']]){
      const label=worldLabel(text,color);label.position.set(x,y,z);label.scale.set(12,3,1);scene.add(label);
    }
    const glow=new THREE.PointLight(0xffbd62,35,32);glow.position.set(-20,7,234);scene.add(glow);
    const taxiLabel=worldLabel('!','#ffe261');taxiLabel.scale.set(2,2,1);
    this.hails=[[0,70],[140,0],[-70,140]].map((at,i)=>{
      const person=createPlayer(0xffcf67);person.position.set(at[0]+8,0,at[1]);scene.add(person);
      const label=taxiLabel.clone();label.position.set(0,3.4,0);person.add(label);
      return {model:person,destination:[[210,140],[-140,-70],[70,236]][i]};
    });
    this.syncMarker();
  }
  restore(ids=[]) {
    this.completed=[];
    for(const mission of STORY){if(ids.includes(mission.id))this.completed.push(mission.id);else break;}
    this.active=null;this.result=null;this.taxi=null;this.queue=[];this.speech=0;this.armed=true;
    this.hails.forEach(p=>p.model.visible=true);this.syncMarker();
  }
  say(lines) {this.queue.push(...lines);}
  syncMarker() {
    const next=this.active?.objectives[this.step],at=next?.at || this.taxi?.destination || CLUB;
    this.marker.position.set(at[0],0,at[1]);
    this.marker.visible=!!this.active||!!this.taxi||this.completed.length<STORY.length;
    this.letter.visible=!this.active&&!this.taxi;
  }
  start() {
    if(this.active||this.taxi||this.result||this.completed.length>=STORY.length)return;
    this.active=STORY[this.completed.length];this.step=0;this.hold=1.2;this.timer=null;
    this.say(this.active.intro);this.audio.effect('click');
    if(this.active.id==='neon-tide'){
      if(this.game.car===this.veraCar)this.game.exit();
      this.veraCar.position.set(8,0,236);this.veraCar.rotation.y=-Math.PI/2;
      this.veraCar.userData.owned=true;
    }
    this.syncMarker();
  }
  finish(success,reason='') {
    if(!this.active)return;
    const mission=this.active;this.active=null;this.timer=null;this.armed=false;
    this.queue=[];this.speech=0;this.hud.subtitle.textContent='';
    if(success){this.completed.push(mission.id);addCash(mission.payout);this.audio.effect('cash');this.onSave();}
    this.audio.effect(success?'success':'fail');
    this.result={success,name:mission.name,payout:success?mission.payout:0,reason};
    this.syncMarker();this.onResult(this.result);
  }
  fail(reason) {
    this.finish(false,reason);
    if(this.taxi){this.hails[this.taxi.index].model.visible=true;this.taxi=null;this.taxiCooldown=10;this.syncMarker();}
  }
  continue() {this.result=null;this.syncMarker();}
  update(dt) {
    this.clock+=dt;this.marker.children[0].material.opacity=.18+.07*Math.sin(this.clock*3);
    this.speech-=dt;
    if(this.speech<=0){if(this.queue.length){const [speaker,text]=this.queue.shift();this.hud.subtitle.textContent=speaker.toUpperCase()+': '+text;this.speech=4.7;}
      else this.hud.subtitle.textContent='';}
    if(this.result)return;
    const position=this.game.player.position;
    if(position.distanceTo(new THREE.Vector3(...[CLUB[0],0,CLUB[1]]))>14)this.armed=true;
    if(this.active){
      const objective=this.active.objectives[this.step];
      if(this.timer!==null){this.timer-=dt;if(this.timer<=0){this.finish(false,'The delivery window closed.');return;}}
      this.hold=Math.max(0,this.hold-dt);
      if(!this.hold && position.distanceTo(this.marker.position)<9 && (!objective.car||this.game.car) &&
        (objective.type!=='vehicle'||this.game.car===this.veraCar) && (objective.type!=='lose'||!this.wanted.level)){
        if(objective.heat){while(this.wanted.level<objective.heat)this.wanted.crime();}
        if(objective.line)this.say([objective.line]);
        this.audio.effect('click');this.step++;this.hold=1;
        if(this.step>=this.active.objectives.length){this.finish(true);return;}
        const next=this.active.objectives[this.step];if(next.timer)this.timer=next.timer;
        this.syncMarker();
      }
    }else if(!this.taxi && this.armed && this.completed.length<STORY.length && position.distanceTo(this.marker.position)<9){this.start();}
    this.updateTaxi(dt);
  }
  updateTaxi(dt) {
    this.taxiCooldown=Math.max(0,this.taxiCooldown-dt);
    if(this.active||this.result)return;
    if(this.taxi){
      const speed=Math.abs(this.game.drive?.speed||0);
      const collision=(this.game.drive?.collisions||0)!==this.taxi.collisions || this.game.world.cars.some(c=>c!==this.game.car&&c.position.distanceToSquared(this.game.player.position)<12);
      if(collision)this.taxi.clean=false;
      if(!this.game.car){this.hud.prompt.textContent='Your passenger is waiting · return to a car';return;}
      if(this.game.player.position.distanceTo(this.marker.position)<9 && speed<7){
        const fare=this.taxi.fare+(this.taxi.clean?40:0);addCash(fare);this.audio.effect('cash');
        this.say([['Passenger','Here is $'+fare+'. '+(this.taxi.clean?'Smooth ride. Keep the tip!':'Made it in one piece, at least.')]]);
        this.hails[this.taxi.index].model.visible=true;this.taxi=null;this.taxiCooldown=12;this.syncMarker();
      }
    }else if(this.game.car && !this.taxiCooldown && Math.abs(this.game.drive.speed)<7){
      const index=this.hails.findIndex(p=>p.model.position.distanceTo(this.game.player.position)<11);
      if(index<0)return;
      const hail=this.hails[index],distance=this.game.player.position.distanceTo(new THREE.Vector3(hail.destination[0],0,hail.destination[1]));
      hail.model.visible=false;
      this.taxi={index,destination:hail.destination,fare:Math.round(45+distance*.65),clean:true,collisions:this.game.drive.collisions||0};
      this.say([['Passenger','Taxi! Take me to the marked stop. There is a tip for a smooth ride.']]);this.syncMarker();
    }
  }
  get objective() {
    if(this.active){const step=this.active.objectives[this.step];return this.active.name+' · '+step.label+(this.timer!==null?' · '+Math.ceil(this.timer)+'s':'')+(step.car&&!this.game.car?' · GET A CAR':'');}
    if(this.taxi)return 'TAXI · Deliver passenger · $'+this.taxi.fare+' + $40 clean ride tip';
    return this.completed.length<STORY.length?'VERA · V at The Gilded Conch · '+(this.completed.length+1)+'/5':'STORY COMPLETE · Port Solana is yours · find yellow ! taxi fares';
  }
  get blips() {return [...(this.marker.visible?[this.blip]:[]),...(!this.active&&!this.taxi?this.hails.filter(p=>p.model.visible).map(p=>({position:p.model.position,color:'#ffe261'})):[])];}
}
