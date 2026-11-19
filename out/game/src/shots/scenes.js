import * as THREE from 'three';
import { setTimeOfDay } from '../world/sky.js';
export const SCENES={
 cover({sky,camera,player,cars}){setTimeOfDay(sky,.72);player.position.set(3,0,163);player.rotation.y=.04;cars[0].position.set(-3,0,161);cars[0].rotation.y=0;camera.position.set(0,8,136);camera.lookAt(0,4,226);},
 vista({sky,camera,player,cars}){setTimeOfDay(sky,.28);player.position.set(4,0,-190);player.rotation.y=0;cars[0].position.set(9,0,-190);camera.position.set(20,145,-440);camera.lookAt(0,0,40);camera.fov=52;camera.updateProjectionMatrix();},
 chase({sky,camera,player,cars,police,wanted}){
   setTimeOfDay(sky,.93);player.position.set(0,0,120);player.visible=false;cars[0].position.copy(player.position);cars[0].rotation.y=0;
   for(const vehicle of cars)if(vehicle.userData.ambient)vehicle.visible=false;
   wanted.level=3;
   for(let i=0;i<2;i++){
     police.spawn(player.position,i);const unit=police.units.at(-1);unit.car.position.set(i?4:-4,0,99-i*8);unit.car.rotation.y=0;
     for(const x of [-.68,.68]){const lamp=new THREE.SpotLight(0xc5eaff,65,65,.34,.6,1);lamp.position.set(x,1,2.2);lamp.target.position.set(x,0,30);unit.car.add(lamp,lamp.target);}
     unit.lights[0].visible=i===0;unit.lights[1].visible=i!==0;
   }
   const neon=new THREE.PointLight(0x36f6d7,120,65);neon.position.set(6,7,120);police.scene.add(neon);
   const pink=new THREE.PointLight(0xff408f,100,55);pink.position.set(-7,5,106);police.scene.add(pink);
   camera.position.set(7,5.5,142);camera.lookAt(0,2.2,110);
 },
 mission({sky,camera,player,cars,missions}){
   setTimeOfDay(sky,.76);player.position.set(9,0,247);player.rotation.y=-1.6;cars[0].position.set(8,0,236);cars[0].rotation.y=-Math.PI/2;
   missions.letter.visible=true;camera.position.set(19,11,263);camera.lookAt(-8,5,229);
 }
};
