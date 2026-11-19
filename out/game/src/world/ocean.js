import * as THREE from 'three';
export function createOcean(scene){
  const waterGeo=new THREE.PlaneGeometry(1000,600,100,60);const pos=waterGeo.attributes.position;const base=Float32Array.from(pos.array);
  const water=new THREE.Mesh(waterGeo,new THREE.MeshStandardMaterial({color:0x167f88,roughness:.24,metalness:.28,transparent:true,opacity:.94}));water.rotation.x=-Math.PI/2;water.position.set(0,-.05,610);scene.add(water);
  const sand=new THREE.Mesh(new THREE.PlaneGeometry(760,90),new THREE.MeshStandardMaterial({color:0xd6bf91,roughness:1}));sand.rotation.x=-Math.PI/2;sand.position.set(0,-.02,280);scene.add(sand);
  const foam=new THREE.Mesh(new THREE.PlaneGeometry(740,5),new THREE.MeshBasicMaterial({color:0xb3e5d3,transparent:true,opacity:.36}));foam.rotation.x=-Math.PI/2;foam.position.set(0,.02,321);scene.add(foam);
  const wood=new THREE.MeshStandardMaterial({color:0x927957,roughness:.95});const pier=new THREE.Mesh(new THREE.BoxGeometry(20,.55,58),wood);pier.position.set(-90,.5,305);scene.add(pier);
  for(let z=282;z<335;z+=10)for(const x of [-100,-80]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.35,.42,3,7),wood);post.position.set(x,-.7,z);scene.add(post);}
  for(let x=-98;x<-80;x+=4){const post=new THREE.Mesh(new THREE.CylinderGeometry(.3,.4,3,7),wood);post.position.set(x,-.7,333);scene.add(post);}
  return {water,waterGeo,base};
}
export function animateOcean(ocean,t){const p=ocean.waterGeo.attributes.position;for(let i=0;i<p.count;i++){const x=ocean.base[i*3],y=ocean.base[i*3+1];p.array[i*3+2]=ocean.base[i*3+2]+Math.sin(x*.035+t*1.3)*.65+Math.cos(y*.045+t)*.4;}p.needsUpdate=true;ocean.waterGeo.computeVertexNormals();}
