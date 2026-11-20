import * as THREE from 'three';
import { damageVehicle } from '../vehicles/driving.js';
import { CITY } from '../config.js';
import { createCar } from '../vehicles/carFactory.js';

export class Police {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.units = [];
    this.clock = 0;
    this.previousLevel = 0;
    this.nodes = city.intersections.map(({x,z}) => new THREE.Vector3(x,0,z));
    this.obstacles = city.colliders.map(b => new THREE.Box3(
      new THREE.Vector3(b.minX-1.4,-1,b.minZ-1.4),
      new THREE.Vector3(b.maxX+1.4,1,b.maxZ+1.4)));
    this.ray = new THREE.Ray();
    this.contact = new THREE.Vector3();
  }
  clear(from,to) {
    const delta = to.clone().sub(from);
    const length = delta.length();
    if (!length) return true;
    this.ray.set(from,delta.divideScalar(length));
    return !this.obstacles.some(box => this.ray.intersectBox(box,this.contact) &&
      from.distanceToSquared(this.contact) < length*length);
  }
  nearestNode(position) {
    let score = Infinity, best;
    for (const node of this.nodes) {
      const d = node.distanceToSquared(position);
      if (d<score && this.clear(position,node)) { best=node; score=d; }
    }
    return best;
  }
  spawn(position, index) {
    const choices = this.nodes.filter(node => {
      const d = node.distanceTo(position);
      return d>=28 && d<=83 && !this.city.cars.some(car => car.position.distanceToSquared(node)<36);
    }).sort((a,b) => a.distanceToSquared(position)-b.distanceToSquared(position));
    if (!choices.length) return;
    const car = createCar('sedan',0x283b55);
    car.position.copy(choices[index % choices.length]);
    car.rotation.y = Math.atan2(position.x-car.position.x,position.z-car.position.z);
    const lights = [0xff345b,0x308aff].map((color,i) => {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(.68,.21,.38),new THREE.MeshBasicMaterial({color}));
      lamp.position.set((i-.5)*.69,2.16,-.15);
      car.add(lamp);
      return lamp;
    });
    const unit = {car,lights,health:100,speed:0,arrest:0,cooldown:0,touching:false,lastSeen:position.clone()};
    Object.assign(car.userData,{name:'PD Interceptor', occupied:true, police:unit, roadSpeed:0});
    this.units.push(unit);
    this.city.cars.push(car);
    this.scene.add(car);
  }
  remove(unit, keepCar=false) {
    this.units.splice(this.units.indexOf(unit),1);
    const {car,lights} = unit;
    delete car.userData.police;
    car.remove(...lights);
    for (const light of lights) { light.geometry.dispose(); light.material.dispose(); }
    if (keepCar) return;
    this.city.cars.splice(this.city.cars.indexOf(car),1);
    this.scene.remove(car);
    const resources = new Set();
    car.traverse(mesh => {
      if (mesh.isMesh) { resources.add(mesh.geometry); resources.add(mesh.material); }
    });
    for (const resource of resources) resource.dispose();
  }
  reset() {
    while (this.units.length) this.remove(this.units.at(-1));
    this.previousLevel = 0;
  }
  hit(unit, damage) {
    unit.health -= damage;
    if (unit.health <= 0) this.remove(unit);
  }
  waypoint(position,target,unit) {
    if (this.clear(position,target)) { unit.waypoint=null; return target; }
    if (unit.waypoint && position.distanceToSquared(unit.waypoint)>1) return unit.waypoint;
    const start = this.nearestNode(position), end = this.nearestNode(target);
    if (!start || !end) return position;
    if (position.distanceToSquared(start)>1) return (unit.waypoint=start);
    const next = start.clone();
    if (start.x!==end.x) next.x += Math.sign(end.x-start.x)*CITY.spacing;
    else if (start.z!==end.z) next.z += Math.sign(end.z-start.z)*CITY.spacing;
    return (unit.waypoint=next);
  }
  update(dt, game, wanted, damage) {
    this.clock += dt;
    if (!wanted.level) { this.reset(); return false; }
    const position = game.player.position;
    if (wanted.level > this.previousLevel) {
      for (let i=this.units.length; i<wanted.level; i++) this.spawn(position,i);
    }
    this.previousLevel = wanted.level;
    while (this.units.length>wanted.level) this.remove(this.units.at(-1));
    for (const [index,unit] of this.units.entries()) {
      const {car,lights,lastSeen} = unit;
      const blink = Math.floor(this.clock*8)%2;
      lights[0].visible = !blink;
      lights[1].visible = !!blink;
      const distance = car.position.distanceTo(position);
      if (distance<=65) lastSeen.copy(position);
      const target = lastSeen.clone();
      if (wanted.level>=3 && index>0 && game.car && distance<38) {
        const angle = game.car.rotation.y + (index%2 ? 1 : -1)*Math.PI/2;
        target.x += Math.sin(angle)*4.5 + Math.sin(game.car.rotation.y)*7;
        target.z += Math.cos(angle)*4.5 + Math.cos(game.car.rotation.y)*7;
        if (!this.clear(position,target)) target.copy(lastSeen);
      }
      const next = this.waypoint(car.position,target,unit);
      const delta = next.clone().sub(car.position);
      const offset = delta.length();
      if (offset>.05) {
        delta.divideScalar(offset);
        const heading = Math.atan2(delta.x,delta.z);
        const turn = Math.atan2(Math.sin(heading-car.rotation.y), Math.cos(heading-car.rotation.y));
        car.rotation.y += THREE.MathUtils.clamp(turn,-6*dt,6*dt);
      }
      const arrestRange = !game.car && game.motion<.75 && distance<3;
      const topSpeed = game.car ? 27 + wanted.level*2 : 16;
      const desired = arrestRange ? 0 : Math.min(topSpeed,Math.max(0,(offset-(next===unit.waypoint ? 0 : 1.9))*4));
      unit.speed = THREE.MathUtils.damp(unit.speed,desired, arrestRange ? 18 : 5,dt);
      const step = arrestRange ? 0 : Math.min(unit.speed*dt,Math.max(0,offset-1.8));
      // Waypoints are traversed even when the destination lies behind a building.
      const waypointStep = next===unit.waypoint && !arrestRange ? Math.min(unit.speed*dt,offset) : step;
      const candidate = car.position.clone().addScaledVector(delta,waypointStep);
      if (waypointStep && this.clear(car.position,candidate)) {
        car.position.copy(candidate);
        car.userData.wheels.forEach(wheel => { wheel.rotation.x += waypointStep*1.8; });
      }
      car.userData.roadSpeed = waypointStep/dt;
      const gap = car.position.distanceTo(position);
      unit.cooldown = Math.max(0,unit.cooldown-dt);
      if (game.car && gap<3.4) {
        if (!unit.touching && Math.abs(game.drive.speed)>5) wanted.crime();
        if (!unit.cooldown && (unit.speed>4 || Math.abs(game.drive.speed)>5)) {
          unit.cooldown=1.1;
          game.drive.speed *= .67;
          damageVehicle(game.car,9);
          damage(6);
        }
      } else if (!game.car && gap<2.65 && game.motion>=.75 && !unit.cooldown) {
        unit.cooldown=.9;
        damage(10);
      }
      unit.touching = !!game.car && gap<3.8;
      unit.arrest = !game.car && gap<3 && game.motion<.75 ? unit.arrest+dt : 0;
      if (unit.arrest>=3) return true;
    }
    return false;
  }
}
