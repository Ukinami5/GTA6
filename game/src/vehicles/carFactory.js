import * as THREE from 'three';
export function createCar(style='sports',color=0xe75d55){
  const group=new THREE.Group(),paint=new THREE.MeshStandardMaterial({color,metalness:.55,roughness:.28}),dark=new THREE.MeshStandardMaterial({color:0x18232a,metalness:.3,roughness:.28}),glass=new THREE.MeshStandardMaterial({color:0x8db8b5,metalness:.35,roughness:.19,transparent:true,opacity:.84}),rubber=new THREE.MeshStandardMaterial({color:0x111517,roughness:.95}),lamp=new THREE.MeshBasicMaterial({color:0xffe5b0}),tail=new THREE.MeshBasicMaterial({color:0xff5260});
  const dims=style==='pickup'?[2.15,1.55,4.6]:style==='sedan'?[2.05,1.3,4.15]:[2,1.12,4.25];const [w,h,l]=dims;
  const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),paint);body.position.y=.83;group.add(body);
  const hood=new THREE.Mesh(new THREE.BoxGeometry(w*.94,.34,l*.25),paint);hood.position.set(0,1.4,l*.31);group.add(hood);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(w*.78,style==='pickup'?1.05:.8,l*.47),glass);cabin.position.set(0,1.64,-.15);group.add(cabin);
  if(style==='pickup'){const bed=new THREE.Mesh(new THREE.BoxGeometry(w*.8,.35,l*.25),dark);bed.position.set(0,1.55,-1.42);group.add(bed);}
  const bump=new THREE.Mesh(new THREE.BoxGeometry(w*1.05,.25,.22),dark);bump.position.set(0,.55,l/2);group.add(bump);const rear=new THREE.Mesh(bump.geometry,dark);rear.position.set(0,.55,-l/2);group.add(rear);
  for(const x of [-.68,.68]){const a=new THREE.Mesh(new THREE.BoxGeometry(.38,.19,.12),lamp);a.position.set(x,.9,l/2+.06);group.add(a);const b=new THREE.Mesh(new THREE.BoxGeometry(.38,.18,.12),tail);b.position.set(x,.9,-l/2-.06);group.add(b)}
  const wheels=[];for(const x of [-w/2-.04,w/2+.04])for(const z of [-l*.32,l*.32]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.39,.39,.24,12),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.44,z);group.add(wheel);wheels.push(wheel);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.25,8),dark);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);group.add(hub)}
  group.userData={wheels,style};group.castShadow=true;group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return group;
}
