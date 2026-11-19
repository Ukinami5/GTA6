import * as THREE from 'three';
import { BALANCE, CITY } from '../config.js';
export class DrivingController {
  constructor(car,camera,colliders){this.car=car;this.camera=camera;this.colliders=colliders;this.speed=0;this.steer=0;this.velocity=new THREE.Vector3();this.look=new THREE.Vector3();}
  update(dt,input){const throttle=(input.forward?1:0)-(input.back?1:0);if(throttle)this.speed+=throttle*(throttle*this.speed<0?BALANCE.brake:BALANCE.acceleration)*dt;else this.speed*=Math.pow(.985,dt*60);if(input.brake)this.speed*=Math.pow(.91,dt*60);this.speed=THREE.MathUtils.clamp(this.speed,-BALANCE.reverseSpeed,BALANCE.maxSpeed);
    const steer=(input.left?1:0)-(input.right?1:0);this.steer=THREE.MathUtils.damp(this.steer,steer,.1,dt);const factor=Math.min(1,Math.abs(this.speed)/5);this.car.rotation.y+=this.steer*BALANCE.steerRate*factor*dt*Math.sign(this.speed||1);
    const old=this.car.position.clone();this.car.position.x+=Math.sin(this.car.rotation.y)*this.speed*dt;this.car.position.z+=Math.cos(this.car.rotation.y)*this.speed*dt;
    this.car.position.x=THREE.MathUtils.clamp(this.car.position.x,-CITY.max+5,CITY.max-5);this.car.position.z=THREE.MathUtils.clamp(this.car.position.z,-CITY.max+5,CITY.seaZ-14);
    const hit=this.colliders.some(c=>this.car.position.x>c.minX-1.5&&this.car.position.x<c.maxX+1.5&&this.car.position.z>c.minZ-2.4&&this.car.position.z<c.maxZ+2.4);if(hit){this.car.position.copy(old);this.speed*=-.18}
    this.car.userData.wheels.forEach(w=>{w.rotation.x+=this.speed*dt*1.8});this.velocity.set(Math.sin(this.car.rotation.y),0,Math.cos(this.car.rotation.y));
    const target=this.car.position.clone().add(new THREE.Vector3(0,5.5,-12).applyAxisAngle(new THREE.Vector3(0,1,0),this.car.rotation.y));this.camera.position.lerp(target,1-Math.exp(-BALANCE.cameraFollow*dt));this.look.copy(this.car.position).add(new THREE.Vector3(0,1,8).applyAxisAngle(new THREE.Vector3(0,1,0),this.car.rotation.y));this.camera.lookAt(this.look);
  }
}
