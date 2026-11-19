import * as THREE from 'three';
import { CITY, COLORS } from '../config.js';
import { seededRandom } from '../world/citygen.js';
import { createPlayer } from './player.js';

const shirts = [0xea966c, 0xf0c76b, 0x54bbb0, 0x5587bf, 0xc574a8, 0xe9dbca];
const walkY = .14;
const half = (CITY.spacing - CITY.roadWidth - CITY.sidewalk) / 2;

export class Pedestrians {
  constructor(scene, city, seed, origin, shot) {
    this.scene = scene;
    this.city = city;
    this.random = seededRandom(seed + 48);
    this.people = [];
    const blocks = city.blocks.filter(b => b.z < 210);
    this.loops = blocks.map(({x,z}) => [[x-half,z-half], [x+half,z-half], [x+half,z+half], [x-half,z+half]]
      .map(([a,b]) => new THREE.Vector3(a,walkY,b)));
    const paving = new THREE.InstancedMesh(new THREE.BoxGeometry(1,walkY,1),
      new THREE.MeshStandardMaterial({color:COLORS.sidewalk}), this.loops.length*4);
    const dummy = new THREE.Object3D();
    this.loops.forEach((loop,i) => loop.forEach((point,j) => {
      const next = loop[(j+1)%4];
      dummy.position.copy(point).lerp(next,.5);
      dummy.position.y = walkY/2;
      dummy.scale.set(j%2 ? CITY.sidewalk : half*2+CITY.sidewalk, 1, j%2 ? half*2 : CITY.sidewalk);
      dummy.updateMatrix();
      paving.setMatrixAt(i*4+j,dummy.matrix);
    }));
    paving.receiveShadow = true;
    scene.add(paving);
    const nearby = this.loops.filter(loop => loop.some(p => p.distanceTo(origin) < (shot ? 105 : 180)));
    for (let i=0; i<(shot ? 6 : 14); i++) {
      const loop = nearby[Math.floor(this.random() * nearby.length)];
      const edge = Math.floor(this.random()*4), t = .1 + this.random()*.8;
      const person = this.spawn(loop[edge].clone().lerp(loop[(edge+1)%4], t));
      Object.assign(person, {loop, edge, t});
      person.model.rotation.y = edge*Math.PI/2 + Math.PI/2;
    }
  }
  spawn(position) {
    const model = createPlayer(shirts[Math.floor(this.random()*shirts.length)]);
    model.position.copy(position);
    this.scene.add(model);
    const person = {model, speed:1.4+this.random()*1.05, direction:this.random()<.5 ? -1 : 1,
      phase:this.random()*6, flee:0, down:0, health:100, impact:false};
    this.people.push(person);
    return person;
  }
  eject(car, threat) {
    const p = car.position.clone();
    const person = this.spawn(p);
    let best = Infinity;
    for (const loop of this.loops) for (let edge=0; edge<4; edge++) {
      const a = loop[edge], line = loop[(edge+1)%4].clone().sub(a);
      const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(line)/line.lengthSq(),0,1);
      const target = a.clone().addScaledVector(line,t), d = target.distanceToSquared(p);
      if (d < best && !this.blocked(target)) {
        best = d;
        Object.assign(person,{loop,edge,t,target});
      }
    }
    this.scare(person, threat);
  }
  blocked(p) {
    return this.city.colliders.some(b => p.x>b.minX-.3 && p.x<b.maxX+.3 && p.z>b.minZ-.3 && p.z<b.maxZ+.3);
  }
  scare(person, threat) {
    person.flee = 5;
    const a = person.loop[person.edge], b = person.loop[(person.edge+1)%4];
    person.direction = a.distanceToSquared(threat)>b.distanceToSquared(threat) ? -1 : 1;
  }
  scareNearby(position, radius) {
    for (const p of this.people) if (p.model.position.distanceToSquared(position)<radius*radius) this.scare(p,position);
  }
  hit(person, damage, threat) {
    person.health = Math.max(0, person.health - damage);
    person.down = person.health ? .8 : 2.4;
    this.scare(person,threat);
  }
  update(dt, game, wanted) {
    for (const p of this.people) {
      const position = p.model.position, dist = position.distanceToSquared(game.player.position);
      const speed = Math.abs(game.drive?.speed || 0);
      if (speed>8 && dist<100 && p.flee<1) this.scare(p,game.player.position);
      const touching = !!game.car && dist<2.3**2;
      if (touching && !p.impact && speed>3) {
        this.hit(p,35,game.player.position);
        wanted.crime();
        p.impact = true;
      }
      if (!touching) p.impact = false;
      if (p.down>0) {
        p.down -= dt;
        p.model.rotation.z = Math.PI/2;
        continue;
      }
      if (!p.health) p.health = 100;
      p.model.rotation.z = 0;
      p.flee = Math.max(0,p.flee-dt);
      const pace = p.flee ? 5.8 : p.speed;
      if (!p.target && ((p.t>=1 && p.direction>0) || (p.t<=0 && p.direction<0))) {
        p.edge = (p.edge+p.direction+4)%4;
        p.t = p.direction>0 ? 0 : 1;
      }
      const a = p.loop[p.edge], b = p.loop[(p.edge+1)%4];
      const t = THREE.MathUtils.clamp(p.t + p.direction*pace*dt/a.distanceTo(b),0,1);
      const next = p.target ? position.clone().lerp(p.target,Math.min(1,pace*dt/Math.max(.001,position.distanceTo(p.target)))) : a.clone().lerp(b,t);
      if (this.blocked(next) || (!p.target && this.city.cars.some(car =>
        next.distanceToSquared(car.position)<3.2**2 &&
        next.distanceToSquared(car.position)<position.distanceToSquared(car.position)))) {
        if (p.flee) p.direction *= -1;
        continue;
      }
      const move = next.clone().sub(position);
      if (move.lengthSq()>1e-8) p.model.rotation.y = Math.atan2(move.x,move.z);
      position.copy(next);
      if (p.target) {
        if (position.distanceToSquared(p.target)<.01) { position.copy(p.target); p.target=null; }
      } else p.t=t;
      p.phase += pace*dt*3;
      p.model.userData.legs.forEach((leg,i) => { leg.rotation.x = Math.sin(p.phase+i*Math.PI)*.5; });
    }
  }
}
