import * as THREE from 'three';

// RELIC RUNNER — a keyboard-only, low-poly endless raid through one temple level.
const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const hud = document.querySelector('#hud');
const overlay = document.querySelector('#overlay');
const ui = Object.fromEntries(['health-num','health-fill','shield-tag','progress-fill','distance-num','score-num','combo-num','weapon-name','ammo-num','weapon-slots','toast','screen-title','screen-pause','screen-dead','screen-win','dead-score','dead-distance','dead-kills','win-score','win-time','win-kills'].map(id => [id, document.getElementById(id)]));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9b7850);
scene.fog = new THREE.Fog(0x9b7850, 27, 105);
const camera = new THREE.PerspectiveCamera(61, window.innerWidth / window.innerHeight, 0.1, 170);
camera.position.set(0, 5.2, 9.3);

const hemi = new THREE.HemisphereLight(0xffdca1, 0x343b24, 2.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd28a, 3.2);
sun.position.set(-8, 15, -12); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -6;
sun.shadow.bias = -0.0004;
scene.add(sun);

const mat = (color, roughness = 1, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true, ...opts });
const mats = {
  sand: mat(0x76603a), sandLight: mat(0xa28652), sandstone: mat(0x9b7142), stone: mat(0x65533a), stoneDark: mat(0x3d3829),
  moss: mat(0x46523a), mossLight: mat(0x667248), leaf: mat(0x3f5937), leafBright: mat(0x718147), wood: mat(0x5d3920), woodLight: mat(0x8b552b),
  gold: mat(0xd5a64d, 0.65, { metalness: 0.3 }), glow: mat(0xffbe55, 0.3, { emissive: 0x9c4614, emissiveIntensity: 1.6 }),
  cloth: mat(0x9c3e27), skin: mat(0xc89368), dark: mat(0x231b14), blue: mat(0x3b5962), red: mat(0xa33325),
  crate: mat(0x9a6332), crateDark: mat(0x52351e), green: mat(0x718147), bullet: mat(0xffd66a, 0.25, { emissive: 0xff8a26, emissiveIntensity: 1.5 }),
};

const boxGeo = new THREE.BoxGeometry(1,1,1);
const sphereGeo = new THREE.IcosahedronGeometry(0.5, 0);
const coneGeo = new THREE.ConeGeometry(0.5, 1, 5);
const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
const makeMesh = (geo, material, parent, x=0, y=0, z=0, sx=1, sy=1, sz=1) => {
  const o = new THREE.Mesh(geo, material); o.position.set(x,y,z); o.scale.set(sx,sy,sz); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
};
const group = (parent, x=0,y=0,z=0) => { const g = new THREE.Group(); g.position.set(x,y,z); parent.add(g); return g; };

// Long temple causeway and repeating carved side structures.
const world = new THREE.Group(); scene.add(world);
makeMesh(boxGeo, mats.sand, world, 0,-0.46,-34, 9,0.9,100).receiveShadow = true;
makeMesh(boxGeo, mats.stoneDark, world, 0,-0.92,-34, 10.4,0.14,100);
for (let laneX of [-1.6, 1.6]) {
  const seam = makeMesh(boxGeo, mats.sandstone, world, laneX,-0.005,-34, 0.055,0.025,100);
  seam.material = mats.sandstone;
}
const groundTiles = [];
for (let i=0;i<10;i++) {
  const tile = makeMesh(boxGeo, i%2 ? mats.sand : mats.sandLight, world, 0,-0.03,-i*10-1, 8.7,0.08,9.85);
  tile.userData.scroll = true; groundTiles.push(tile);
  for (let x of [-3.12,3.12]) makeMesh(boxGeo, mats.sandstone, tile, x,0.04,0,0.10,0.06,9.82);
}

// Background atmosphere: sandstone columns, broken lintels, palms and chunky foliage.
const scenery = [];
function makePalm(x,z,side=1,scale=1) {
  const g=group(world,x,0,z); g.userData.scroll=true; scenery.push(g);
  const trunk=makeMesh(cylGeo,mats.wood,g,0,2.0,0,0.25*scale,4.0*scale,0.25*scale); trunk.rotation.z=side*0.08;
  for(let i=0;i<7;i++) {
    const a=i/7*Math.PI*2;
    const leaf=makeMesh(coneGeo,i%2?mats.leaf:mats.leafBright,g,Math.cos(a)*1.35*scale,3.95*scale+Math.sin(a)*0.45*scale,Math.sin(a)*1.35*scale,0.55*scale,2.7*scale,0.65*scale);
    leaf.rotation.z=-Math.cos(a)*0.72; leaf.rotation.x=Math.sin(a)*0.72; leaf.rotation.y=-a;
  }
  for(let i=0;i<4;i++) makeMesh(sphereGeo,i%2?mats.moss:mats.leaf,g,side*(0.5+i*0.28)*scale,0.5+i%2*0.22,0.4-i*0.35,0.9*scale,0.5*scale,0.8*scale);
}
function makeTempleSide(x,z) {
  const g=group(world,x,0,z); g.userData.scroll=true; scenery.push(g);
  const s=Math.sign(x);
  makeMesh(boxGeo,mats.stone,g,0,1.8,0,1.2,3.6,1.3);
  for(let k=0;k<3;k++) makeMesh(boxGeo,k===1?mats.sandstone:mats.stoneDark,g,0,0.38+k*1.1,0.68,0.83,0.22,0.08);
  makeMesh(boxGeo,mats.stoneDark,g,0,3.72,0,1.55,0.35,1.65);
  makeMesh(boxGeo,mats.gold,g,0,3.82,0,1.28,0.08,1.38);
  for(let i=0;i<3;i++) {
    const inset=makeMesh(boxGeo,mats.stoneDark,g,0.0,1.55,0.67,0.46,1.65,0.05);
    makeMesh(boxGeo,mats.sandstone,g,-0.3,1.55,0.73,0.08,1.4,0.04);
  }
  makeMesh(boxGeo,mats.moss,g,-s*0.8,0.4,0.2,0.7,0.5,0.8);
}
for(let i=0;i<9;i++) {
  const z=-18-i*11;
  makePalm(-7.3,z,-1,1.15+(i%3)*0.12); makePalm(7.5,z-5,1,1.0+(i%2)*0.2);
  if(i%2===0) { makeTempleSide(-5.65,z-3); makeTempleSide(5.65,z-8); }
  for(let j=0;j<4;j++) {
    const x=(j%2?1:-1)*(4.6+(j%3)*0.55);
    const shrub=makeMesh(sphereGeo,j%2?mats.leaf:mats.moss,world,x,0.25,-z*0+z-2-j*1.8,1.1+j%2*0.5,0.55,1.0);
    shrub.userData.scroll=true; scenery.push(shrub);
  }
}

// Player adventurer: blocky explorer with backpack and sidearm; animated at runtime.
const player = group(scene,0,0,0);
const body = group(player,0,0,0);
makeMesh(boxGeo,mats.cloth,body,0,1.12,0,0.55,0.72,0.38);
makeMesh(boxGeo,mats.skin,body,0,1.72,-0.01,0.39,0.4,0.39);
makeMesh(boxGeo,mats.sandLight,body,0,1.93,0,0.46,0.13,0.47);
makeMesh(boxGeo,mats.dark,body,-0.21,1.74,0.2,0.08,0.07,0.035); makeMesh(boxGeo,mats.dark,body,0.21,1.74,0.2,0.08,0.07,0.035);
makeMesh(boxGeo,mats.wood,body,-0.39,1.12,-0.03,0.18,0.62,0.34);
makeMesh(boxGeo,mats.gold,body,0,1.25,0.205,0.28,0.12,0.035);
const arms=[], legs=[];
for(const side of [-1,1]) {
  const arm=group(body,side*0.38,1.36,0); arms.push(arm);
  makeMesh(boxGeo,mats.cloth,arm,side*0.06,-0.24,0,0.22,0.48,0.23);
  makeMesh(boxGeo,mats.skin,arm,side*0.06,-0.49,0.07,0.2,0.18,0.2);
  const leg=group(body,side*0.18,0.78,0); legs.push(leg);
  makeMesh(boxGeo,mats.dark,leg,0,-0.31,0,0.23,0.62,0.25);
  makeMesh(boxGeo,mats.wood,leg,0,-0.63,0.08,0.27,0.17,0.38);
}
const gunRoot=group(body,0.35,1.1,0.34);
makeMesh(boxGeo,mats.dark,gunRoot,0,0,0.16,0.14,0.13,0.4);
makeMesh(boxGeo,mats.stoneDark,gunRoot,0,-0.13,0.03,0.11,0.21,0.13);
const muzzleFlash=makeMesh(sphereGeo,mats.glow,gunRoot,0,0,0.42,0.28,0.25,0.28); muzzleFlash.visible=false;
player.traverse(o=>{ if(o.isMesh){o.castShadow=true;o.receiveShadow=true;} });

// Entrance gate at end of the run.
const gate = group(world,0,0,-680);
makeMesh(boxGeo,mats.stone,gate,-3.6,3.7,0,1.1,7.4,1.1);
makeMesh(boxGeo,mats.stone,gate,3.6,3.7,0,1.1,7.4,1.1);
makeMesh(boxGeo,mats.sandstone,gate,0,7.5,0,8.2,1.0,1.4);
makeMesh(boxGeo,mats.stoneDark,gate,0,3.2,0,5.2,6.4,0.5);
makeMesh(boxGeo,mats.dark,gate,0,2.55,0.2,3.5,5.1,0.24);
for(let i=-2;i<=2;i++) makeMesh(boxGeo,mats.gold,gate,i*0.76,3.1,-0.02,0.12,5.5,0.12);
const gateGem=makeMesh(sphereGeo,mats.glow,gate,0,6.65,0.1,0.6,0.6,0.35);

// Gameplay data, procedural encounters and object construction follow.
const LANES=[-2.1,0,2.1];
const WEAPONS=['PISTOL','AK-47','ROCKET','GRENADES'];
const WEAPON_INFO={PISTOL:{ammo:Infinity,rate:0.28,damage:1},'AK-47':{ammo:60,rate:0.105,damage:1},ROCKET:{ammo:8,rate:0.82,damage:5},GRENADES:{ammo:12,rate:0.58,damage:3}};
const game={mode:'title',time:0,distance:0,score:0,health:100,weapon:'PISTOL',ammo:{PISTOL:Infinity,'AK-47':0,ROCKET:0,GRENADES:0},owned:new Set(['PISTOL']),lane:1,x:0,jumpY:0,jumpV:0,sliding:0,fireCd:0,spawnCd:0,enemyCd:0,pickupCd:0,combo:0,comboTimer:0,kills:0,shield:0,invuln:0,shake:0,mute:false,lastToast:0};
const actors=[], effects=[], keys=new Set();
const clock=new THREE.Timer();
clock.connect(document);

function makeCrate(lane,z) {
  const g=group(scene,LANES[lane],0,z); g.userData={kind:'crate',lane,hp:2};
  makeMesh(boxGeo,mats.crate,g,0,0.65,0,1.05,1.25,0.92);
  for(const s of [-1,1]) { makeMesh(boxGeo,mats.crateDark,g,s*0.49,0.65,0,0.08,1.22,0.98); makeMesh(boxGeo,mats.woodLight,g,0,0.65,s*0.47,1.02,1.18,0.09); }
  makeMesh(boxGeo,mats.gold,g,0,0.65,0.51,0.2,0.2,0.05); actors.push(g); return g;
}
function makeEnemy(lane,z,kind) {
  const g=group(scene,LANES[lane],0,z); g.userData={kind:'enemy',enemy:kind,hp:kind==='brute'?3:2,lane};
  const brute=kind==='brute', scout=kind==='scout';
  makeMesh(boxGeo,brute?mats.blue:scout?mats.woodLight:mats.red,g,0,brute?1.05:0.9,0,brute?0.76:0.55,brute?1:0.82,0.42);
  makeMesh(boxGeo,mats.skin,g,0,brute?1.85:1.55,0,0.42,0.42,0.4);
  makeMesh(boxGeo,mats.dark,g,-0.13,brute?1.88:1.58,0.21,0.08,0.07,0.04); makeMesh(boxGeo,mats.dark,g,0.13,brute?1.88:1.58,0.21,0.08,0.07,0.04);
  if(kind==='sentinel') makeMesh(boxGeo,mats.gold,g,0,2.1,0,0.7,0.14,0.52);
  if(brute) { makeMesh(boxGeo,mats.stoneDark,g,-0.53,1.2,0,0.22,0.9,0.48); makeMesh(boxGeo,mats.stoneDark,g,0.53,1.2,0,0.22,0.9,0.48); }
  if(scout) makeMesh(boxGeo,mats.gold,g,0,1.95,-0.2,0.2,0.35,0.2);
  actors.push(g); return g;
}
function makePickup(lane,z,item) {
  const g=group(scene,LANES[lane],0,z); g.userData={kind:'pickup',item,lane,age:Math.random()*7};
  const color={ammo:mats.gold,health:mats.glow,shield:mats.blue,'AK-47':mats.green,ROCKET:mats.red,GRENADES:mats.woodLight}[item]||mats.gold;
  makeMesh(boxGeo,mats.stoneDark,g,0,0.58,0,0.62,0.7,0.58); makeMesh(boxGeo,color,g,0,0.58,0,0.35,0.4,0.35); makeMesh(sphereGeo,color,g,0,1.05,0,0.28,0.28,0.28); actors.push(g); return g;
}
function makeBeam(lane,z) {
  const g=group(scene,LANES[lane],0,z); g.userData={kind:'beam',lane};
  makeMesh(boxGeo,mats.stoneDark,g,0,1.22,0,1.7,0.34,0.7); makeMesh(boxGeo,mats.gold,g,0,1.42,0,1.73,0.08,0.73); actors.push(g);
}
function makeEffect(x,y,z,color=0xffb34e,scale=0.4) {
  const mesh=makeMesh(sphereGeo,mat(color,0.6,{emissive:color,emissiveIntensity:1.2}),scene,x,y,z,scale,scale,scale); effects.push({mesh,life:0.3,max:0.3});
}
function toast(text) { ui.toast.textContent=text; ui.toast.classList.add('show'); game.lastToast=2; }
let audio;
function playTone(freq=180,duration=0.08,type='square',volume=0.035) {
  if(game.mute) return;
  try { if(!audio) audio=new (window.AudioContext||window.webkitAudioContext)(); if(audio.state==='suspended') audio.resume();
    const osc=audio.createOscillator(), gain=audio.createGain(); osc.type=type; osc.frequency.value=freq; gain.gain.setValueAtTime(volume,audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001,audio.currentTime+duration); osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime+duration);
  } catch {}
}
function setMode(mode) {
  game.mode=mode; overlay.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
  const id={title:'screen-title',pause:'screen-pause',dead:'screen-dead',win:'screen-win'}[mode]; if(id) document.getElementById(id).classList.add('active');
  hud.classList.toggle('hidden',mode!=='playing'); overlay.style.pointerEvents=mode==='playing'?'none':'auto';
}
function disposeGroup(g) { g.traverse(o=>{ if(o.geometry && ![boxGeo,sphereGeo,coneGeo,cylGeo].includes(o.geometry)) o.geometry.dispose(); }); }
function resetGame() {
  for(const o of actors) { scene.remove(o); disposeGroup(o); } actors.length=0; for(const e of effects) scene.remove(e.mesh); effects.length=0;
  Object.assign(game,{mode:'playing',time:0,distance:0,score:0,health:100,weapon:'PISTOL',ammo:{PISTOL:Infinity,'AK-47':0,ROCKET:0,GRENADES:0},owned:new Set(['PISTOL']),lane:1,x:0,jumpY:0,jumpV:0,sliding:0,fireCd:0,spawnCd:1,enemyCd:2.5,pickupCd:4,combo:0,comboTimer:0,kills:0,shield:0,invuln:0,shake:0,lastToast:0});
  player.position.set(0,0,0); body.position.y=0; body.scale.set(1,1,1); gunRoot.visible=true; gate.position.z=-680; gateGem.material=mats.glow;
  groundTiles.forEach((t,i)=>t.position.z=-1-i*10); scenery.forEach(g=>{ if(g.position.z>12) g.position.z-=100; });
  setMode('playing'); updateHud(); toast('THE TEMPLE IS AHEAD'); playTone(440,0.16,'triangle',0.045);
}
function updateHud() {
  ui['health-num'].textContent=Math.max(0,Math.ceil(game.health)); ui['health-fill'].style.width=`${Math.max(0,game.health)}%`; ui['shield-tag'].classList.toggle('hidden',game.shield<=0);
  ui['progress-fill'].style.width=`${Math.min(100,game.distance/680*100)}%`; ui['distance-num'].textContent=`${Math.floor(game.distance)} m`; ui['score-num'].textContent=String(Math.floor(game.score)).padStart(6,'0');
  ui['combo-num'].textContent=`x${game.combo}`; ui['combo-num'].classList.toggle('hidden',game.combo<2||game.comboTimer<=0);
  ui['weapon-name'].textContent=game.weapon; ui['ammo-num'].textContent=game.ammo[game.weapon]===Infinity?'∞':String(game.ammo[game.weapon]).padStart(2,'0');
  ui['weapon-slots'].innerHTML=WEAPONS.map((w,i)=>`<span class="slot ${game.owned.has(w)?'owned':''} ${game.weapon===w?'active':''}">${i+1} ${w==='GRENADES'?'GREN':w==='ROCKET'?'RKT':w==='PISTOL'?'PST':'AK'}</span>`).join('');
}
function addScore(n) { game.score+=n*(game.combo>=2?game.combo:1); }
function hitPlayer(amount) {
  if(game.invuln>0||game.mode!=='playing') return;
  if(game.shield>0) { game.shield=0; toast('RELIC SHIELD ABSORBED THE HIT'); playTone(520,0.15,'sine'); }
  else { game.health=Math.max(0,game.health-amount); toast(`HIT — ${game.health} VITALITY`); playTone(90,0.18,'sawtooth',0.05); }
  game.invuln=1.05; game.shake=0.32; if(game.health<=0) endGame(false);
}
function endGame(win) {
  if(win) { ui['win-score'].textContent=String(Math.floor(game.score)).padStart(6,'0'); ui['win-time'].textContent=`${Math.floor(game.time/60)}:${String(Math.floor(game.time%60)).padStart(2,'0')}`; ui['win-kills'].textContent=game.kills; playTone(660,0.45,'triangle',0.08); }
  else { ui['dead-score'].textContent=String(Math.floor(game.score)).padStart(6,'0'); ui['dead-distance'].textContent=`${Math.floor(game.distance)} m`; ui['dead-kills'].textContent=game.kills; }
  setMode(win?'win':'dead');
}
function collect(item) {
  if(item==='ammo') { const w=game.weapon==='PISTOL'?'AK-47':game.weapon, n=w==='AK-47'?24:w==='ROCKET'?3:5; game.ammo[w]=Math.min(w==='AK-47'?180:30,game.ammo[w]+n); toast(`${w} AMMO +${n}`); }
  else if(item==='health') { game.health=Math.min(100,game.health+30); toast('VITALITY RESTORED'); }
  else if(item==='shield') { game.shield=1; toast('RELIC SHIELD — ONE HIT'); }
  else { game.owned.add(item); game.weapon=item; game.ammo[item]+=item==='AK-47'?36:item==='ROCKET'?4:6; toast(`${item} ACQUIRED`); }
  addScore(100); playTone(620,0.12,'triangle'); updateHud();
}
function removeActor(actor) { scene.remove(actor); const i=actors.indexOf(actor); if(i>=0) actors.splice(i,1); disposeGroup(actor); }
function breakActor(actor) {
  const d=actor.userData;
  if(d.kind==='crate') { makeEffect(actor.position.x,0.7,actor.position.z,0xe89a42,0.65); playTone(145,0.1,'square'); const r=Math.random(), item=r<0.24?'health':r<0.42?'shield':r<0.63?'AK-47':r<0.75?'ROCKET':r<0.88?'GRENADES':'ammo'; makePickup(d.lane,actor.position.z,item); addScore(80); game.combo=Math.min(9,game.combo+1); game.comboTimer=3; }
  else if(d.kind==='enemy') { makeEffect(actor.position.x,1,actor.position.z,d.enemy==='brute'?0x73a6b0:0xd54d2e,0.58); game.kills++; game.combo=Math.min(9,game.combo+1); game.comboTimer=3; addScore(d.enemy==='brute'?250:180); if(Math.random()<0.25) makePickup(d.lane,actor.position.z,'ammo'); }
  removeActor(actor);
}
function shoot() {
  if(game.fireCd>0) return; const weapon=game.weapon, info=WEAPON_INFO[weapon];
  if(game.ammo[weapon]<=0) { toast('OUT OF AMMO — PISTOL SELECTED'); game.weapon='PISTOL'; game.fireCd=0.5; updateHud(); return; }
  if(game.ammo[weapon]!==Infinity) game.ammo[weapon]--; game.fireCd=info.rate; muzzleFlash.visible=true; window.setTimeout(()=>muzzleFlash.visible=false,65);
  playTone(weapon==='ROCKET'?78:weapon==='GRENADES'?115:weapon==='AK-47'?210:250,weapon==='ROCKET'?0.25:0.065,'square',0.035);
  const targets=actors.filter(a=>['enemy','crate'].includes(a.userData.kind)&&a.userData.lane===game.lane&&a.position.z<0&&a.position.z>-32).sort((a,b)=>b.position.z-a.position.z), target=targets[0];
  makeEffect(game.x,1.2,-1,weapon==='ROCKET'?0xff8b38:0xffd06a,weapon==='ROCKET'?0.35:0.12);
  if(target) {
    if(weapon==='ROCKET'||weapon==='GRENADES') { const z=target.position.z; for(const a of [...actors]) if(['crate','enemy'].includes(a.userData.kind)&&Math.abs(a.position.z-z)<4&&Math.abs(a.position.x-target.position.x)<3) breakActor(a); makeEffect(target.position.x,1,z,0xff8b38,1.2); }
    else { target.userData.hp--; makeEffect(target.position.x,1.2,target.position.z,0xffd06a,0.2); if(target.userData.hp<=0) breakActor(target); }
  }
  updateHud();
}

function spawnObstacle() {
  const lane=Math.floor(Math.random()*3), r=Math.random();
  if(r<0.58) makeCrate(lane,-76);
  else if(r<0.78) makeBeam(lane,-76);
  else makePickup(lane,-76,r<0.84?'health':r<0.9?'shield':r<0.94?'ammo':r<0.97?'ROCKET':'AK-47');
  if(Math.random()<0.22) makeEnemy((lane+1+Math.floor(Math.random()*2))%3,-85,['scout','sentinel','brute'][Math.floor(Math.random()*3)]);
}
function spawnEnemy() {
  const lane=Math.floor(Math.random()*3), kind=['scout','sentinel','brute'][Math.floor(Math.random()*3)]; makeEnemy(lane,-76,kind);
}
function update(dt) {
  if(game.mode!=='playing') return;
  game.time+=dt; const speed=12+Math.min(3,game.distance/240), travel=speed*dt; game.distance+=travel; game.score+=dt*12;
  game.fireCd=Math.max(0,game.fireCd-dt); game.invuln=Math.max(0,game.invuln-dt); game.shake=Math.max(0,game.shake-dt); game.sliding=Math.max(0,game.sliding-dt); game.comboTimer=Math.max(0,game.comboTimer-dt);
  if(game.lastToast>0) { game.lastToast-=dt; if(game.lastToast<=0) ui.toast.classList.remove('show'); }
  if(keys.has('Space')) shoot();
  game.spawnCd-=dt; if(game.spawnCd<=0) { spawnObstacle(); game.spawnCd=1.5+Math.random()*1.25; }
  game.enemyCd-=dt; if(game.enemyCd<=0) { spawnEnemy(); game.enemyCd=3.0+Math.random()*2.2; }
  game.pickupCd-=dt; if(game.pickupCd<=0) { const lane=Math.floor(Math.random()*3); makePickup(lane,-82,['health','shield','ammo','AK-47','ROCKET','GRENADES'][Math.floor(Math.random()*6)]); game.pickupCd=8+Math.random()*5; }
  game.jumpY+=game.jumpV*dt; game.jumpV-=19*dt; if(game.jumpY<0) { game.jumpY=0; game.jumpV=0; }
  game.x=THREE.MathUtils.damp(game.x,LANES[game.lane],12,dt); player.position.x=game.x; player.position.y=game.jumpY;
  body.position.y=game.sliding>0?-0.43:Math.sin(game.time*11)*0.035; body.scale.y=game.sliding>0?0.58:1;
  legs.forEach((leg,i)=>{ leg.rotation.x=game.jumpY>0?0:Math.sin(game.time*11+i*Math.PI)*0.48; });
  arms.forEach((arm,i)=>{ arm.rotation.x=game.sliding>0?0.6:Math.sin(game.time*11+i*Math.PI)*0.18; });
  player.visible=game.invuln<=0||Math.floor(game.time*18)%2===0;
  for(const t of groundTiles) { t.position.z+=travel; if(t.position.z>10) t.position.z-=100; }
  for(const g of scenery) { g.position.z+=travel; if(g.position.z>16) g.position.z-=100; }
  gate.position.z+=travel; gateGem.rotation.y+=dt*1.6;
  for(const a of [...actors]) {
    a.position.z+=travel; a.userData.age=(a.userData.age||0)+dt;
    if(a.userData.kind==='pickup') { a.position.y=0.08+Math.sin(a.userData.age*3)*0.12; a.rotation.y+=dt*1.4; }
    if(a.userData.kind==='enemy'&&a.userData.enemy==='scout') a.position.x=LANES[a.userData.lane]+Math.sin(a.userData.age*3)*0.18;
    const near=Math.abs(a.position.z)<0.9&&Math.abs(a.position.x-game.x)<0.95;
    if(near) {
      const kind=a.userData.kind;
      if(kind==='pickup') { collect(a.userData.item); removeActor(a); }
      else if(kind==='crate') { if(game.jumpY<1.32) { hitPlayer(18); addScore(0); } if(game.jumpY>1.3||game.sliding>0) { addScore(20); removeActor(a); } }
      else if(kind==='beam') { if(game.sliding<=0) hitPlayer(22); removeActor(a); }
      else if(kind==='enemy') { hitPlayer(a.userData.enemy==='brute'?28:18); removeActor(a); }
    }
    if(a.position.z>8) removeActor(a);
  }
  for(let i=effects.length-1;i>=0;i--) { const e=effects[i]; e.life-=dt; if(e.life<=0) { scene.remove(e.mesh); effects.splice(i,1); } else if(!e.bullet) { const s=1+(1-e.life/e.max)*1.5; e.mesh.scale.setScalar(s); e.mesh.material.transparent=true; e.mesh.material.opacity=e.life/e.max; } }
  if(game.distance>=680) { endGame(true); }
  updateHud();
}
function render() {
  const t=game.time; camera.position.x=THREE.MathUtils.damp(camera.position.x,game.x*0.28,3,0.016);
  camera.position.y=5.0+Math.sin(t*2)*0.04; camera.position.z=9.3;
  camera.lookAt(game.x*0.16,1.05,-8.5);
  if(game.shake>0) { camera.position.x+=(Math.random()-0.5)*game.shake; camera.position.y+=(Math.random()-0.5)*game.shake; }
  renderer.render(scene,camera);
}
function frame() { requestAnimationFrame(frame); clock.update(); const dt=Math.min(clock.getDelta(),0.05); update(dt); render(); }
function setWeapon(index) { const w=WEAPONS[index]; if(w&&game.owned.has(w)) { game.weapon=w; updateHud(); playTone(340+index*55,0.05,'triangle'); } }
function onKeyDown(e) {
  const k=e.code; if(['Space','ArrowLeft','ArrowRight','ArrowUp','ControlLeft','ControlRight'].includes(k)) e.preventDefault();
  if(keys.has(k)) return; keys.add(k);
  if(game.mode==='title'&&(k==='Space'||k==='Enter')) { resetGame(); return; }
  if((game.mode==='dead'||game.mode==='win')&&(k==='Space'||k==='Enter')) { resetGame(); return; }
  if((k==='Escape'||k==='KeyP')&&['playing','pause'].includes(game.mode)) { setMode(game.mode==='playing'?'pause':'playing'); return; }
  if(game.mode!=='playing') return;
  if(k==='KeyA'||k==='ArrowLeft') game.lane=Math.max(0,game.lane-1);
  if(k==='KeyD'||k==='ArrowRight') game.lane=Math.min(2,game.lane+1);
  if(k==='KeyW'||k==='ArrowUp') { if(game.jumpY===0&&game.sliding<=0) { game.jumpV=7.6; playTone(300,0.07,'triangle',0.02); } }
  if(k==='ControlLeft'||k==='ControlRight') { if(game.jumpY<0.4) { game.sliding=0.8; playTone(120,0.08,'sawtooth',0.02); } }
  if(k==='Digit1') setWeapon(0); if(k==='Digit2') setWeapon(1); if(k==='Digit3') setWeapon(2); if(k==='Digit4') setWeapon(3);
  if(k==='KeyM') { game.mute=!game.mute; if(!game.mute) playTone(440,0.08,'sine'); toast(game.mute?'SOUND MUTED':'SOUND ON'); }
}
function onKeyUp(e) { keys.delete(e.code); }
window.addEventListener('keydown',onKeyDown); window.addEventListener('keyup',onKeyUp);
window.addEventListener('blur',()=>{ keys.clear(); if(game.mode==='playing') setMode('pause'); });
document.getElementById('start-btn').addEventListener('click',resetGame);
document.getElementById('dead-btn').addEventListener('click',resetGame);
document.getElementById('win-btn').addEventListener('click',resetGame);
document.getElementById('resume-btn').addEventListener('click',()=>setMode('playing'));
window.addEventListener('resize',()=>{ camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth,window.innerHeight); });
loading.classList.add('hidden'); setMode('title'); updateHud(); frame();

