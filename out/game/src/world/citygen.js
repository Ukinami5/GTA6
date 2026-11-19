import * as THREE from 'three';
import { CITY, COLORS } from '../config.js';

export function seededRandom(seed=1) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export function makeRoadTexture() {
  const c=document.createElement('canvas'); c.width=256;c.height=256;const x=c.getContext('2d');x.fillStyle='#29363b';x.fillRect(0,0,256,256);
  for(let i=0;i<1500;i++){x.fillStyle=i%2?'#52606422':'#070f1422';x.fillRect((i*73)%256,(i*47)%256,1+(i%3),1)}
  x.fillStyle='#c5b77b';x.fillRect(124,0,2,256);x.fillRect(130,0,2,256);x.fillStyle='#f1e7bf';for(let y=2;y<256;y+=38)x.fillRect(110,y,3,18);
  x.fillStyle='#e7d7a7';for(let i=0;i<9;i++){x.fillRect(18+i*27,12,16,4);x.fillRect(18+i*27,240,16,4)}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,4);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function generateCity(scene,seed=1) {
  const rng=seededRandom(seed), roads=[], intersections=[], blocks=[], colliders=[];
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(720,720),new THREE.MeshStandardMaterial({color:0x304c42,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(0,-.12,0);scene.add(ground);
  const tex=makeRoadTexture(), asphalt=new THREE.MeshStandardMaterial({map:tex,roughness:.94}), walk=new THREE.MeshStandardMaterial({color:COLORS.sidewalk,roughness:1});
  const addRoad=(x,z,w,d,axis)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),asphalt);m.rotation.x=-Math.PI/2;m.position.set(x,.005,z);scene.add(m);roads.push({x,z,w,d,axis});};
  for(const z of CITY.roadZs) addRoad(0,z,CITY.size+16,CITY.roadWidth,'x');
  for(const x of CITY.roadXs) addRoad(x,0,CITY.roadWidth,570,'z');
  for(const z of CITY.roadZs)for(const x of CITY.roadXs)intersections.push({x,z});
  for(let z=-245;z<=210;z+=70)for(let x=-245;x<=245;x+=70)blocks.push({x,z,w:55,d:55,district: districtAt(x,z)});
  for(const z of CITY.roadZs)for(const x of CITY.roadXs){const p=new THREE.Mesh(new THREE.PlaneGeometry(15,15),new THREE.MeshStandardMaterial({color:0x384348,roughness:.9}));p.rotation.x=-Math.PI/2;p.position.set(x,.01,z);scene.add(p);
    for(const side of [-1,1]) for(const axis of [0,1]){const px=x+(axis===0?side*10:0),pz=z+(axis===1?side*10:0);const s=new THREE.Mesh(new THREE.BoxGeometry(axis===0?4:15,.28,axis===1?4:15),walk);s.position.set(px,.12,pz);scene.add(s);}}
  // Coastal boulevard and generous sidewalks frame the waterfront.
  const coast=new THREE.Mesh(new THREE.PlaneGeometry(570,18),asphalt);coast.rotation.x=-Math.PI/2;coast.position.set(0,.01,236);scene.add(coast);
  for(const x of CITY.roadXs) for(const z of CITY.roadZs) void [x,z];
  const prop=buildStreetProps(scene,rng);return {roads,intersections,blocks,colliders,...prop,ground};
}
function districtAt(x,z){if(z< -170)return 'hills';if(z>95)return 'marina';if(Math.abs(x)>175)return 'beach';return 'commercial';}
function buildStreetProps(scene,rng){
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.32,.55,8,7),new THREE.MeshStandardMaterial({color:0x70503b,roughness:1}),180);
  const leaves=new THREE.InstancedMesh(new THREE.ConeGeometry(3,1.1,5),new THREE.MeshStandardMaterial({color:0x307d63,roughness:1}),900);
  const lampPosts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.11,.18,6,7),new THREE.MeshStandardMaterial({color:0x30383a,metalness:.6,roughness:.35}),100);
  const bulbs=new THREE.InstancedMesh(new THREE.SphereGeometry(.34,8,6),new THREE.MeshBasicMaterial({color:0xf5c878}),100);
  const dummy=new THREE.Object3D(),leafGeo=new THREE.ConeGeometry(1,1,4); void leafGeo;let ti=0,li=0,pi=0;
  for(let z=-245;z<=215;z+=42)for(const x of [-280,-210,-140,-70,70,140,210,280]){if(rng()<.38)continue;dummy.position.set(x+(x<0?-10:10),4,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(ti++,dummy.matrix);
    for(let k=0;k<5;k++){dummy.position.set(x+(x<0?-10:10),7.7,z);dummy.rotation.set(.2+k*.22,k*1.25,.1);dummy.scale.set(2.2,1,1);dummy.updateMatrix();leaves.setMatrixAt(li++,dummy.matrix);}}
  for(let z=-250;z<220;z+=38)for(const x of [-10,10]){dummy.position.set(x,3,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();lampPosts.setMatrixAt(pi,dummy.matrix);dummy.position.y=6;dummy.updateMatrix();bulbs.setMatrixAt(pi++,dummy.matrix);}
  // Palm-lined central boulevard makes the waterfront approach legible from street level.
  for(let z=-18;z<=214;z+=32)for(const x of [-13,13]){if(rng()<.17)continue;dummy.position.set(x,4,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(ti++,dummy.matrix);
    for(let k=0;k<6;k++){dummy.position.set(x,8,z);dummy.rotation.set(.06,k*Math.PI/3,Math.PI/2);dummy.scale.set(1,1,1);dummy.updateMatrix();leaves.setMatrixAt(li++,dummy.matrix);}}
  trunks.count=ti;leaves.count=li;lampPosts.count=pi;bulbs.count=pi;scene.add(trunks,leaves,lampPosts,bulbs);bulbs.userData.nightGlow=true;return {trunks,leaves,lampPosts,bulbs};
}
