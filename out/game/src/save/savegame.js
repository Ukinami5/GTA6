const KEY = 'neontide-save-v1';
const point = p => Array.isArray(p) && p.length===3 && p.every(Number.isFinite) && Math.abs(p[0])<=300 && Math.abs(p[2])<=320;
export function readSave() {
  try {
    const data=JSON.parse(localStorage.getItem(KEY));
    if (!data || data.version!==1 || !point(data.position) || !Number.isFinite(data.cash) || data.cash<0 || !Array.isArray(data.completed)) return null;
    if (data.car && (!point(data.car.position) || !['sports','sedan','pickup'].includes(data.car.style))) return null;
    return {...data,playtime:Math.max(0,Number(data.playtime)||0),time:Number.isFinite(data.time)?data.time: .72};
  } catch { return null; }
}
export function writeSave({game, cash, completed, playtime, time}) {
  const car=game.car;
  const data={version:1,cash,completed:[...completed],storyProgress:completed.length,
    position:game.player.position.toArray(),rotation:game.player.rotation.y,playtime,time,
    car:car?{style:car.userData.style,name:car.userData.name,position:car.position.toArray(),rotation:car.rotation.y}:null};
  try { localStorage.setItem(KEY,JSON.stringify(data)); return true; } catch { return false; }
}
export function clearSave() { try { localStorage.removeItem(KEY); return true; } catch { return false; } }
