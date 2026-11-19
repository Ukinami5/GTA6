export class HUD {
  constructor(city) {
    this.city = city;
    for (const id of ['health','cash','stars','objective','subtitle','hint','prompt']) {
      this[id] = document.getElementById(id);
    }
    this.canvas = document.getElementById('map');
    this.ctx = this.canvas.getContext('2d');
  }
  update(actor, {driving, health, cash, wanted, nearby, armed, people, blink, shot, blips=[], objective, time=.72}) {
    const c = this.ctx, w = this.canvas.width, h = this.canvas.height;
    c.fillStyle = '#102c35';
    c.fillRect(0,0,w,h);
    c.save();
    c.translate(w/2,h/2);
    const scale = w / (shot==='mission' ? 220 : shot==='chase' ? 340 : shot ? 600 : 340);
    c.scale(scale,scale);
    c.translate(-actor.position.x,-actor.position.z);
    c.fillStyle = '#33464a';
    for (const r of this.city.roads) c.fillRect(r.x-r.w/2,r.z-r.d/2,r.w,r.d);
    c.fillStyle='#cbb784';
    c.fillRect(-300,258,600,28);
    c.fillStyle='#167d83';
    c.fillRect(-300,286,600,120);
    const dot = (object, radius, color) => {
      c.fillStyle=color;
      c.beginPath();
      c.arc(object.position.x,object.position.z,radius,0,Math.PI*2);
      c.fill();
    };
    for (const person of people) dot(person.model,1.5,'#acb5b5');
    for (const car of this.city.cars) {
      if (car!==actor && car.visible) dot(car,car.userData.police ? (shot?6:3.7) : 2.4,
        car.userData.police ? (blink ? '#ff4967' : '#4b9fff') : '#f5faf6');
    }
    for(const blip of blips){
      const dx=blip.position.x-actor.position.x,dz=blip.position.z-actor.position.z;
      const ratio=Math.min(1,(w/scale*.43)/Math.max(1,Math.hypot(dx,dz)));
      dot({position:{x:actor.position.x+dx*ratio,z:actor.position.z+dz*ratio}},5,blip.color);
    }
    c.restore();
    c.save();
    c.translate(w/2,h/2);
    c.rotate(Math.PI-actor.rotation.y);
    c.fillStyle='#f8d37c';
    c.beginPath();
    c.moveTo(0,-9);
    c.lineTo(6,7);
    c.lineTo(0,4);
    c.lineTo(-6,7);
    c.closePath();
    c.fill();
    c.restore();
    this.cash.textContent = '$ '+cash.toLocaleString('en-US');
    this.health.style.width = health+'%';
    this.stars.textContent = '★'.repeat(wanted)+'☆'.repeat(5-wanted);
    this.stars.setAttribute('aria-label',wanted+' wanted stars');
    const minutes=Math.floor(time*1440)%1440;
    document.getElementById('clock').textContent=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
    if (shot) return;
    this.objective.textContent = objective || (driving ? 'VEHICLE · '+actor.userData.name :
      'FREE ROAM · '+(armed ? 'PISTOL' : 'FISTS'));
    this.prompt.textContent = driving ? 'Press E to exit' : nearby ?
      (nearby.userData.owned ? 'Press E to enter' : 'Press E to steal')+' · '+nearby.userData.name : '';
  }
}
