import * as THREE from 'three';
import { setTimeOfDay } from '../world/sky.js';
export const SCENES={
 cover({sky,camera,player,cars}){setTimeOfDay(sky,.78);player.position.set(3,0,163);player.rotation.y=.04;cars[0].position.set(-3,0,161);cars[0].rotation.y=0;camera.position.set(0,8,136);camera.lookAt(0,4,226);},
 vista({sky,camera,player,cars}){setTimeOfDay(sky,.28);player.position.set(4,0,-190);player.rotation.y=0;cars[0].position.set(9,0,-190);camera.position.set(20,145,-440);camera.lookAt(0,0,40);camera.fov=52;camera.updateProjectionMatrix();}
};
