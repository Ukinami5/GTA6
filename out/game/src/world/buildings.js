import * as THREE from 'three';
import { seededRandom } from './citygen.js';

export function makeWindowTexture(base='#b78668',lit=true){
  const c=document.createElement('canvas');c.width=128;c.height=256;const g=c.getContext('2d');g.fillStyle=base;g.fillRect(0,0,128,256);g.fillStyle='#242f37';g.fillRect(5,5,118,246);
  for(let y=12;y<250;y+=24)for(let x=12;x<124;x+=23){g.fillStyle=lit&&((x*3+y*7)%11<7)?'#f1c981':'#52646a';g.fillRect(x,y,13,15);g.fillStyle='#fff5cc';g.fillRect(x+2,y+2,2,10)}
  g.fillStyle='#d5ba8b';for(let y=34;y<256;y+=54)g.fillRect(4,y,120,3);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function createBuildings(scene,city,seed=1){
  const rng=seededRandom(seed+93), colliders=[], palette=['#ca795e','#b6a681','#718b85','#d7b77b','#a77870','#647e8a'], windowMaterials=palette.map((c)=>{const tex=makeWindowTexture(c);return new THREE.MeshStandardMaterial({map:tex,roughness:.75,emissive:0x665039,emissiveMap:tex})});
  const box=new THREE.BoxGeometry(1,1,1);
  city.blocks.forEach((b,i)=>{const district=b.district;const h=district==='hills'?10+rng()*22:district==='marina'?15+rng()*52:district==='beach'?8+rng()*20:14+rng()*62;
    const w=24+rng()*18,d=24+rng()*18,material=windowMaterials[Math.floor(rng()*windowMaterials.length)];
    const building=new THREE.Mesh(box,material);building.scale.set(w,h,d);building.position.set(b.x,h/2,b.z);scene.add(building);colliders.push({minX:b.x-w/2-1,maxX:b.x+w/2+1,minZ:b.z-d/2-1,maxZ:b.z+d/2+1,height:h});
    const roof=new THREE.Mesh(new THREE.BoxGeometry(w+1,1,d+1),new THREE.MeshStandardMaterial({color:district==='hills'?0x6a5448:0x353d3f,roughness:.85}));roof.position.set(b.x,h+.5,b.z);scene.add(roof);
    if(district==='commercial'&&i%4===0){const sign=new THREE.Mesh(new THREE.BoxGeometry(w*.66,2,.55),new THREE.MeshBasicMaterial({color:i%8?0x30d9d0:0xfa6c9c}));sign.position.set(b.x,h*.62,b.z+d/2+.32);scene.add(sign);const panel=new THREE.Mesh(new THREE.BoxGeometry(w*.66,2,.55),new THREE.MeshBasicMaterial({color:0x20252b}));panel.position.set(b.x,h*.62+.2,b.z+d/2+.22);scene.add(panel);}
    if(district==='hills'){const pool=new THREE.Mesh(new THREE.BoxGeometry(w*.7,.25,d*.55),new THREE.MeshStandardMaterial({color:0x3ab9ba,metalness:.45,roughness:.18}));pool.position.set(b.x,h+.2,b.z+d*.72);scene.add(pool);}
  });
  // Distinct low marina sheds along the water edge.
  for(let i=0;i<12;i++){const x=-230+i*42;const shed=new THREE.Mesh(new THREE.BoxGeometry(27,7,18),new THREE.MeshStandardMaterial({color:i%2?0xb28e68:0x839790,roughness:.9}));shed.position.set(x,3.5,220);scene.add(shed);colliders.push({minX:x-13.5,maxX:x+13.5,minZ:211,maxZ:229,height:7});}
  return colliders;
}
