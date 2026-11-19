import * as THREE from 'three';
import { BALANCE, CITY } from '../config.js';
export function createPlayer(){
  const root=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:0xb77b59,roughness:.8}),shirt=new THREE.MeshStandardMaterial({color:0x37a9a1,roughness:.85}),pants=new THREE.MeshStandardMaterial({color:0x263747,roughness:.9}),shoe=new THREE.MeshStandardMaterial({color:0x26211f});
  function part(geo,mat,x,y,z){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;root.add(m);return m}
  part(new THREE.CylinderGeometry(.28,.34,.85,7),shirt,0,1.3,0);part(new THREE.SphereGeometry(.25,9,7),skin,0,1.91,.03);part(new THREE.CylinderGeometry(.1,.13,.72,6),pants,-.16,.52,0);part(new THREE.CylinderGeometry(.1,.13,.72,6),pants,.16,.52,0);part(new THREE.BoxGeometry(.2,.13,.34),shoe,-.16,.12,.1);part(new THREE.BoxGeometry(.2,.13,.34),shoe,.16,.12,.1);
  const arm1=part(new THREE.CylinderGeometry(.09,.11,.65,6),skin,-.36,1.33,0),arm2=part(new THREE.CylinderGeometry(.09,.11,.65,6),skin,.36,1.33,0);arm1.rotation.z=-.2;arm2.rotation.z=.2;
  root.userData={legs:root.children.slice(2,4)};return root;
}
export class PlayerController {
  constructor(player,camera,world){this.player=player;this.camera=camera;this.world=world;this.car=null;this.drive=null;this.walkClock=0;this.look=new THREE.Vector3()}
  update(dt,input){if(this.car){this.drive.update(dt,input);this.player.position.copy(this.car.position);this.player.visible=false;return}
    const moving=input.forward||input.back||input.left||input.right,speed=input.run?BALANCE.runSpeed:BALANCE.walkSpeed;const dir=new THREE.Vector3((input.right?1:0)-(input.left?1:0),0,(input.back?1:0)-(input.forward?1:0));if(dir.lengthSq())dir.normalize();
    if(moving){this.player.rotation.y=Math.atan2(dir.x,dir.z);const old=this.player.position.clone();this.player.position.addScaledVector(dir,speed*dt);this.player.position.x=THREE.MathUtils.clamp(this.player.position.x,-CITY.max+2,CITY.max-2);this.player.position.z=THREE.MathUtils.clamp(this.player.position.z,-CITY.max+2,CITY.seaZ-8);if(this.world.colliders.some(c=>this.player.position.x>c.minX-.4&&this.player.position.x<c.maxX+.4&&this.player.position.z>c.minZ-.4&&this.player.position.z<c.maxZ+.4))this.player.position.copy(old);this.walkClock+=dt*speed;this.player.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(this.walkClock+(i*Math.PI))*0.55)}
    const target=this.player.position.clone().add(new THREE.Vector3(0,5,-9));this.camera.position.lerp(target,1-Math.exp(-5*dt));this.camera.lookAt(this.player.position.x,this.player.position.y+1,this.player.position.z+2);
  }
  enterNearest(){if(this.car){this.car.userData.drive=null;this.car=null;this.drive=null;this.player.visible=true;return true}
    const candidates=this.world.cars.map(c=>({c,d:c.position.distanceTo(this.player.position)})).filter(x=>x.d<5).sort((a,b)=>a.d-b.d);if(!candidates.length)return false;this.car=candidates[0].c;this.drive=this.car.userData.controller;this.player.visible=false;return true}
}
