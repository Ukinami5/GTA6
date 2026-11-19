import * as THREE from 'three';
export class HUD {
  constructor(city){this.city=city;this.canvas=document.getElementById('map');this.ctx=this.canvas.getContext('2d');this.health=document.getElementById('health');this.cash=document.getElementById('cash');this.stars=document.getElementById('stars');this.objective=document.getElementById('objective');this.subtitle=document.getElementById('subtitle');this.hint=document.getElementById('hint')}
  update(player,driving=false){const c=this.ctx,w=this.canvas.width,h=this.canvas.height;c.clearRect(0,0,w,h);c.fillStyle='#102c35';c.fillRect(0,0,w,h);const scale=w/600;c.save();c.translate(w/2,h/2);c.scale(scale,scale);c.translate(-player.position.x,-player.position.z);
    c.fillStyle='#33464a';for(const r of this.city.roads){c.fillRect(r.x-r.w/2,r.z-r.d/2,r.w,r.d)}c.fillStyle='#cbb784';c.fillRect(-300,258,600,28);c.fillStyle='#167d83';c.fillRect(-300,286,600,120);c.restore();
    c.save();c.translate(w/2,h/2);c.rotate(-player.rotation.y);c.fillStyle='#f8d37c';c.beginPath();c.moveTo(0,-9);c.lineTo(6,7);c.lineTo(0,4);c.lineTo(-6,7);c.closePath();c.fill();c.restore();
    this.cash.textContent='$ '+(driving?'2,450':'2,450');this.health.style.width='100%';this.objective.textContent=driving?'VEHICLE · SOLSTICE · Port Solana':'FREE ROAM · FIND YOUR NEXT MOVE';
  }
}
