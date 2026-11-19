import * as THREE from 'three';
import { BALANCE } from '../config.js';

export class Combat {
  constructor(scene, city) {
    this.health = BALANCE.health;
    this.sinceHit = 0;
    this.cooldown = 0;
    this.armed = false;
    this.flashTime = 0;
    this.ray = new THREE.Raycaster();
    this.flash = new THREE.PointLight(0xffa448,0,11);
    this.spark = new THREE.Mesh(new THREE.SphereGeometry(.13,6,4),new THREE.MeshBasicMaterial({color:0xffdf8c}));
    this.spark.visible=false;
    this.walls = city.colliders.map(b => new THREE.Box3(
      new THREE.Vector3(b.minX,0,b.minZ),new THREE.Vector3(b.maxX,b.height,b.maxZ)));
    scene.add(this.flash,this.spark);
  }
  damage(amount) {
    this.health = Math.max(0,this.health-amount);
    this.sinceHit = 0;
  }
  reset() {
    this.health = BALANCE.health;
    this.sinceHit = 0;
    this.cooldown = 0;
    this.armed = false;
    this.flashTime = 0;
    this.flash.intensity = 0;
    this.spark.visible = false;
  }
  update(dt) {
    this.sinceHit += dt;
    if (this.health && this.sinceHit>10) this.health = Math.min(BALANCE.health,this.health+4*dt);
    this.cooldown = Math.max(0,this.cooldown-dt);
    this.flashTime = Math.max(0,this.flashTime-dt);
    if (!this.flashTime) { this.flash.intensity=0; this.spark.visible=false; }
  }
  attack(game, pedestrians, police, wanted, aim) {
    if (game.car || this.cooldown) return;
    const actor = game.player;
    const facing = new THREE.Vector3(Math.sin(actor.rotation.y),0,Math.cos(actor.rotation.y));
    const direction = aim ? aim.clone().sub(actor.position).setY(0) : facing.clone();
    if (direction.lengthSq()<.05) direction.copy(facing);
    direction.normalize();
    actor.rotation.y = Math.atan2(direction.x,direction.z);
    this.cooldown = this.armed ? .26 : .38;
    const origin = actor.position.clone().add(new THREE.Vector3(0,1.36,0));
    const range = this.armed ? 75 : 2.25;
    if (this.armed) {
      this.flash.position.copy(origin).addScaledVector(direction,.65);
      this.flash.intensity = 55;
      this.spark.position.copy(this.flash.position);
      this.spark.visible = true;
      this.flashTime = .075;
      pedestrians.scareNearby(actor.position,30);
    }
    this.ray.set(origin,direction);
    this.ray.far=range;
    const targets = new Map();
    for (const p of pedestrians.people) if (p.health && !p.down) targets.set(p.model,p);
    for (const car of game.world.cars) targets.set(car,car.userData.police || null);
    const contact = new THREE.Vector3();
    const wall = this.walls.reduce((limit,box) => this.ray.ray.intersectBox(box,contact)
      ? Math.min(limit,contact.distanceTo(origin)) : limit,range);
    const hit = this.ray.intersectObjects([...targets.keys()],true)[0];
    if (!hit || hit.distance>=wall) return;
    let root = hit.object;
    while (!targets.has(root)) root=root.parent;
    const target = targets.get(root);
    if (target?.model) pedestrians.hit(target,this.armed ? 55 : 20,actor.position);
    else if (target) { wanted.crime(); police.hit(target,this.armed ? 40 : 15); }
  }
}
