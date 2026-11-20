import * as THREE from 'three';
import { createCar } from './carFactory.js';
import { seededRandom } from '../world/citygen.js';

const styles = [['sedan', 'Pelican'], ['pickup', 'Bruma'], ['sports', 'Solstice']];
const paints = [0xddac63, 0x488186, 0xb75065, 0xc1c8cb, 0x646aa1];
const lane = 3.7;

export class Traffic {
  constructor(scene, city, seed, origin, shot) {
    this.city = city;
    this.random = seededRandom(seed + 17);
    this.routes = [];
    // Long clockwise lane loops cross several districts; every leg stays on a road.
    for(const [left,right,top,bottom] of [[0,210,-210,210],[-210,210,-210,140],[-140,140,-280,70],[-70,280,-140,140],[-280,70,-210,70]]){
      this.routes.push([[left+lane,top+lane],[right-lane,top+lane],[right-lane,bottom-lane],[left+lane,bottom-lane]].map(([x,z])=>new THREE.Vector3(x,0,z)));
    }
    this.units = [];
    this.frustum = new THREE.Frustum();
    this.projection = new THREE.Matrix4();
    for (let i = 0; i < (shot ? 4 : 10); i++) {
      const [style, name] = styles[i % styles.length];
      const car = createCar(style, paints[i % paints.length]);
      Object.assign(car.userData, { name, occupied: true, ambient: true });
      const unit = { car, cruise: 9 + this.random() * 6 };
      this.relocate(unit, origin, i === 0 && !shot ? 22 : shot ? 125 : 230);
      this.units.push(unit);
      city.cars.push(car);
      scene.add(car);
    }
    if (!shot) {
      // A northbound lane puts the first occupied car within reach of the marina spawn.
      const first = this.units[0];
      first.route = this.routes[0];
      this.place(first, first.route, 0, 10);first.wait=6;
    }
  }
  place(unit, route, end, offset) {
    const start = route[(end+route.length-1)%route.length], target = route[end];
    const dir = target.clone().sub(start).normalize();
    unit.car.position.copy(start).addScaledVector(dir, offset);
    unit.car.rotation.y = Math.atan2(dir.x, dir.z);
    Object.assign(unit, { route, end, speed: 0, far: 0, wait: 0 });
    unit.car.userData.roadSpeed = 0;
  }
  relocate(unit, origin, radius, offscreen = false) {
    for (let i = 0; i < 100; i++) {
      const route = this.routes[Math.floor(this.random() * this.routes.length)];
      const end = Math.floor(this.random()*4), offset = 9 + this.random()*45;
      const point = route[(end+route.length-1)%route.length].clone().lerp(route[end], offset / route[(end+route.length-1)%route.length].distanceTo(route[end]));
      if (point.distanceTo(origin) > radius) continue;
      if (offscreen && (point.distanceTo(origin) < 95 || this.frustum.containsPoint(point))) continue;
      if (this.city.cars.some(car => car.position.distanceToSquared(point) < 9 ** 2)) continue;
      this.place(unit, route, end, offset);
      return;
    }
    if (!unit.route) this.place(unit, this.routes[0], 0, 20);
  }
  update(dt, player, camera) {
    this.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projection);
    for (const unit of this.units) {
      const { car, route } = unit;
      if (!car.userData.occupied || !car.userData.ambient) continue;
      unit.far = car.position.distanceTo(player) > 245 ? unit.far + dt : 0;
      if (unit.far > 3 && !this.frustum.containsPoint(car.position)) {
        this.relocate(unit, player, 220, true);
      }
      const next = unit.route[unit.end];
      const dir = next.clone().sub(car.position);
      const distance = dir.length();
      if (distance < .08) {
        unit.end = (unit.end + 1) % route.length;
        unit.wait = .26;
        continue;
      }
      dir.divideScalar(distance);
      car.rotation.y = Math.atan2(dir.x, dir.z);
      const blocked = this.city.cars.some(other => {
        if (other === car) return false;
        const delta = other.position.clone().sub(car.position), ahead = delta.dot(dir);
        return ahead > 0 && ahead < 7 && Math.abs(delta.x*dir.z - delta.z*dir.x) < 2.4;
      }) || (player.distanceToSquared(car.position) < 16 && player.clone().sub(car.position).dot(dir) > 0);
      unit.wait = Math.max(0, unit.wait - dt);
      const targetSpeed = blocked || unit.wait ? 0 : distance < 9 ? 4 : unit.cruise;
      unit.speed = THREE.MathUtils.damp(unit.speed, targetSpeed, blocked ? 12 : 4, dt);
      const step = blocked ? 0 : Math.min(distance, unit.speed * dt);
      car.position.addScaledVector(dir, step);
      car.userData.roadSpeed = step / dt;
      car.userData.wheels.forEach(wheel => { wheel.rotation.x += step * 1.8; });
    }
  }
}
