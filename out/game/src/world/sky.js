import * as THREE from 'three';
export function createSky(scene){
  const geo=new THREE.SphereGeometry(800,32,20),pos=geo.attributes.position,colors=[];const top=new THREE.Color(0x142b42),horizon=new THREE.Color(0xef9a70),low=new THREE.Color(0x382c49);
  for(let i=0;i<pos.count;i++){const y=pos.getY(i)/800;const c=new THREE.Color().lerpColors(horizon,top,THREE.MathUtils.smoothstep(y,-.05,.6));if(y<-.05)c.lerp(low,THREE.MathUtils.smoothstep(-y,.05,.5)*.45);colors.push(c.r,c.g,c.b)}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const dome=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide}));scene.add(dome);
  const sun=new THREE.Mesh(new THREE.SphereGeometry(12,20,16),new THREE.MeshBasicMaterial({color:0xffd59b}));sun.position.set(-170,115,360);scene.add(sun);
  const directional=new THREE.DirectionalLight(0xffd4a6,3.2);directional.position.set(-120,180,-130);directional.castShadow=true;directional.shadow.mapSize.set(1024,1024);directional.shadow.camera.left=-260;directional.shadow.camera.right=260;directional.shadow.camera.top=260;directional.shadow.camera.bottom=-260;directional.shadow.bias=-.0004;scene.add(directional);
  const fill=new THREE.HemisphereLight(0x8bc6cf,0x2b302b,1.45);scene.add(fill);
  const glow=[];scene.traverse(o=>{if(o.userData.nightGlow){o.userData.dayColor=o.material.color.clone();glow.push(o);}});
  return {dome,sun,directional,ambient:scene.fog,fill,glow,time:.72};
}
export function setTimeOfDay(sky,t){
  sky.time=((t%1)+1)%1;
  const altitude=Math.sin((sky.time-.25)*Math.PI*2),daylight=THREE.MathUtils.smoothstep(altitude,-.15,.6);
  sky.directional.intensity=.18+2.9*daylight;
  sky.directional.color.setHSL(.07+daylight*.06,.5,.65);
  sky.fill.intensity=.4+daylight*1.05;
  sky.directional.position.set(Math.cos(sky.time*Math.PI*2)*180,Math.max(20,altitude*220),-100);
  sky.dome.material.color.setRGB(.12+.88*daylight,.17+.83*daylight,.32+.68*daylight);
  sky.ambient.color.setHex(daylight>.3?0x64736f:0x112238);
  sky.sun.visible=altitude>-.15;sky.sun.position.set(-170,altitude*280,360);
  sky.sun.material.color.setHex(daylight>.7?0xffdcab:0xff8e72);
  for(const object of sky.glow)object.material.color.copy(object.userData.dayColor).multiplyScalar(.32+(1-daylight)*1.7);
  return sky.time;
}
