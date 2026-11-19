import * as THREE from 'three';
import { BALANCE, CITY } from '../config.js';
export function createPlayer(shirtColor=0x37a9a1){
  const root=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:0xb77b59,roughness:.8}),shirt=new THREE.MeshStandardMaterial({color:shirtColor,roughness:.85}),pants=new THREE.MeshStandardMaterial({color:0x263747,roughness:.9}),shoe=new THREE.MeshStandardMaterial({color:0x26211f});
  function part(geo,mat,x,y,z){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;root.add(m);return m}
  part(new THREE.CylinderGeometry(.28,.34,.85,7),shirt,0,1.3,0);part(new THREE.SphereGeometry(.25,9,7),skin,0,1.91,.03);part(new THREE.CylinderGeometry(.1,.13,.72,6),pants,-.16,.52,0);part(new THREE.CylinderGeometry(.1,.13,.72,6),pants,.16,.52,0);part(new THREE.BoxGeometry(.2,.13,.34),shoe,-.16,.12,.1);part(new THREE.BoxGeometry(.2,.13,.34),shoe,.16,.12,.1);
  const arm1=part(new THREE.CylinderGeometry(.09,.11,.65,6),skin,-.36,1.33,0),arm2=part(new THREE.CylinderGeometry(.09,.11,.65,6),skin,.36,1.33,0);arm1.rotation.z=-.2;arm2.rotation.z=.2;
  root.userData={legs:root.children.slice(2,4)};return root;
}
export class PlayerController {
  constructor(player,camera,world){this.player=player;this.camera=camera;this.world=world;this.car=null;this.drive=null;this.motion=0;this.walkClock=0;this.look=new THREE.Vector3()}
  update(dt,input){if(this.car){this.drive.update(dt,input);this.motion=Math.abs(this.drive.speed);this.player.position.copy(this.car.position);this.player.visible=false;return}
    const before=this.player.position.clone();
    const moving=input.forward||input.back||input.left||input.right,speed=input.run?BALANCE.runSpeed:BALANCE.walkSpeed;const dir=new THREE.Vector3((input.right?1:0)-(input.left?1:0),0,(input.back?1:0)-(input.forward?1:0));if(dir.lengthSq())dir.normalize();
    if(moving){this.player.rotation.y=Math.atan2(dir.x,dir.z);const old=this.player.position.clone();this.player.position.addScaledVector(dir,speed*dt);this.player.position.x=THREE.MathUtils.clamp(this.player.position.x,-CITY.max+2,CITY.max-2);this.player.position.z=THREE.MathUtils.clamp(this.player.position.z,-CITY.max+2,CITY.seaZ-8);if(this.world.colliders.some(c=>this.player.position.x>c.minX-.4&&this.player.position.x<c.maxX+.4&&this.player.position.z>c.minZ-.4&&this.player.position.z<c.maxZ+.4))this.player.position.copy(old);this.walkClock+=dt*speed;this.player.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(this.walkClock+(i*Math.PI))*0.55)}
    this.motion=this.player.position.distanceTo(before)/dt;
    const target=this.player.position.clone().add(new THREE.Vector3(0,5,-9));this.camera.position.lerp(target,1-Math.exp(-5*dt));this.camera.lookAt(this.player.position.x,this.player.position.y+1,this.player.position.z+2);
  }
  nearestCar() {
    let nearest = null, distance = 5;
    for (const car of this.world.cars) {
      const d = car.position.distanceTo(this.player.position);
      if (d < distance) { distance=d; nearest=car; }
    }
    return nearest;
  }
  exit() {
    if (!this.car) return;
    const car = this.car;
    const right = new THREE.Vector3(Math.cos(car.rotation.y),0,-Math.sin(car.rotation.y));
    const spots = [2.6,-2.6].map(side => car.position.clone().addScaledVector(right,side));
    const clear = spots.find(p => !this.world.colliders.some(b =>
      p.x>b.minX-.4 && p.x<b.maxX+.4 && p.z>b.minZ-.4 && p.z<b.maxZ+.4));
    this.player.position.copy(clear || car.position);
    this.drive.speed=0;
    this.car=null;
    this.drive=null;
    this.player.visible=true;
  }
  enterNearest(onSteal) {
    if (this.car) { this.exit(); return; }
    const car = this.nearestCar();
    if (!car) return;
    this.car=car;
    this.drive=car.userData.controller;
    this.drive.speed=car.userData.roadSpeed || 0;
    if (!car.userData.owned) onSteal(car);
    Object.assign(car.userData,{owned:true,occupied:false,ambient:false,roadSpeed:0});
    this.player.position.copy(car.position);
    this.player.visible=false;
  }
}
