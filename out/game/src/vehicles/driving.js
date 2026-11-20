import * as THREE from 'three';
import { BALANCE, CITY } from '../config.js';
export function damageVehicle(car,amount) {
  car.userData.health=Math.max(0,(car.userData.health??100)-amount);
  if(!car.userData.health && car.userData.controller)car.userData.controller.speed=0;
}
export function updateVehicleHealth(dt,game) {
  if(game.car){const car=game.car,d=car.userData;d.impactCooldown=Math.max(0,(d.impactCooldown||0)-dt);
    if(!d.impactCooldown && Math.abs(game.drive.speed)>10 && game.world.cars.some(c=>c!==car&&!c.userData.police&&c.position.distanceToSquared(car.position)<10)){
      damageVehicle(car,Math.abs(game.drive.speed)*.45);game.drive.speed*=.4;game.drive.collisions++;d.impactCooldown=.8;
    }
  }
  for(const car of game.world.cars){const d=car.userData;
    if(d.health<35){d.smoke.visible=true;d.smokeClock=(d.smokeClock||0)+dt;
      d.smoke.children.forEach((p,i)=>{const t=(d.smokeClock*.6+i*.25)%1;p.position.set(Math.sin(i*2+t)*.3,1.6+t*3,1.3);p.scale.setScalar(.5+t*1.5);});
    }else d.smoke.visible=false;
    if(d.health===0 && car!==game.car){d.wreckAge=(d.wreckAge||0)+dt;
      if(d.wreckAge>25 && car.position.distanceTo(game.player.position)>80 && d.home && d.home.distanceTo(game.player.position)>80 && !game.world.cars.some(c=>c!==car&&c.position.distanceTo(d.home)<6)){
        car.position.copy(d.home);car.rotation.y=d.homeRotation;d.health=100;d.wreckAge=0;d.smoke.visible=false;d.occupied=false;d.ambient=false;d.roadSpeed=0;
      }
    }
  }
}
export class DrivingController {
  constructor(car,camera,colliders){this.car=car;car.userData.home=car.position.clone();car.userData.homeRotation=car.rotation.y;this.camera=camera;this.colliders=colliders;this.speed=0;this.steer=0;this.collisions=0;this.velocity=new THREE.Vector3();this.look=new THREE.Vector3();}
  update(dt,input){const throttle=this.car.userData.health>0?(input.forward?1:0)-(input.back?1:0):0;if(!this.car.userData.health)this.speed=0;if(throttle)this.speed+=throttle*(throttle*this.speed<0?BALANCE.brake:BALANCE.acceleration)*dt;else this.speed*=Math.pow(.985,dt*60);if(input.brake)this.speed*=Math.pow(.91,dt*60);this.speed=THREE.MathUtils.clamp(this.speed,-BALANCE.reverseSpeed,BALANCE.maxSpeed);
    const steer=(input.left?1:0)-(input.right?1:0);this.steer=THREE.MathUtils.damp(this.steer,steer,.1,dt);const factor=Math.min(1,Math.abs(this.speed)/5);this.car.rotation.y+=this.steer*BALANCE.steerRate*factor*dt*Math.sign(this.speed||1);
    const old=this.car.position.clone();this.car.position.x+=Math.sin(this.car.rotation.y)*this.speed*dt;this.car.position.z+=Math.cos(this.car.rotation.y)*this.speed*dt;
    this.car.position.x=THREE.MathUtils.clamp(this.car.position.x,-CITY.max+5,CITY.max-5);this.car.position.z=THREE.MathUtils.clamp(this.car.position.z,-CITY.max+5,CITY.seaZ-14);
    const hit=this.colliders.some(c=>this.car.position.x>c.minX-1.5&&this.car.position.x<c.maxX+1.5&&this.car.position.z>c.minZ-2.4&&this.car.position.z<c.maxZ+2.4);if(hit){if(Math.abs(this.speed)>2)this.collisions++;if(Math.abs(this.speed)>10)damageVehicle(this.car,(Math.abs(this.speed)-8)*.8);this.car.position.copy(old);this.speed*=-.18}
    this.car.userData.wheels.forEach(w=>{w.rotation.x+=this.speed*dt*1.8});this.velocity.set(Math.sin(this.car.rotation.y),0,Math.cos(this.car.rotation.y));
    const target=this.car.position.clone().add(new THREE.Vector3(0,5.5,-12).applyAxisAngle(new THREE.Vector3(0,1,0),this.car.rotation.y));this.camera.position.lerp(target,1-Math.exp(-BALANCE.cameraFollow*dt));this.look.copy(this.car.position).add(new THREE.Vector3(0,1,8).applyAxisAngle(new THREE.Vector3(0,1,0),this.car.rotation.y));this.camera.lookAt(this.look);
  }
}
