import * as THREE from 'three';
import './style.css';

const $ = (id) => document.getElementById(id);
const ui = Object.fromEntries(['hud','titleScreen','pauseScreen','endScreen','loading','startButton','resumeButton','restartButton','quitButton','againButton','distanceLabel','progressFill','progressMarker','objectiveLabel','scoreLabel','comboLabel','targetLabel','tutorial','tutorialKey','tutorialTitle','tutorialText','toastStack','healthLabel','healthDamage','healthFill','bestLabel','furyLabel','weaponName','weaponHint','ammoLabel','weaponSlots','damageFlash','endEyebrow','endTitle','endCopy','endScore','endCrates','endKills','endAccuracy'].map((id)=>[id,$(id)]));
const canvas = $('game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91a18a);
scene.fog = new THREE.Fog(0x91a18a, 25, 115);
const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 180);
camera.position.set(0, 4.7, 9.5);
camera.lookAt(0, 1.5, -5);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (error) {
  console.error(error);
  $('loading').innerHTML = '<div class="loading-mark"></div><span>3D GRAPHICS ARE UNAVAILABLE IN THIS BROWSER</span>';
}
if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
}

const mats = {};
const mat = (name, color, roughness = 1, extra = {}) => (mats[name] ||= new THREE.MeshStandardMaterial({ color, roughness, flatShading: true, ...extra }));
const geo = {
  box: new THREE.BoxGeometry(1,1,1),
  rock: new THREE.DodecahedronGeometry(1,0),
  cone: new THREE.ConeGeometry(1,1,4),
  cylinder: new THREE.CylinderGeometry(1,1,1,6),
  sphere: new THREE.IcosahedronGeometry(1,1),
};
const world = new THREE.Group(); scene.add(world);
const staticThings = new THREE.Group(); world.add(staticThings);
const dynamicThings = new THREE.Group(); world.add(dynamicThings);
const bullets = new THREE.Group(); scene.add(bullets);
const clock = new THREE.Clock();
const lanes = [-2.15, 0, 2.15];
const game = { state:'title', distance:0, score:0, health:100, lane:1, y:0, vy:0, slide:0, speed:14, elapsed:0, lastShot:0, ammo:{ pistol:Infinity, ak:0, rocket:0, grenade:0 }, weapon:'pistol', objects:[], shots:[], particles:[], kills:0, crates:0, fired:0, hits:0, combo:1, comboTime:0, invuln:0, spawnAt:22, tutorialTimer:7, fury:0, seed:918273 };
const totalDistance = 42;

function seeded() { game.seed = (game.seed * 1664525 + 1013904223) >>> 0; return game.seed / 4294967296; }
function mesh(geometry, material, parent, x=0,y=0,z=0,sx=1,sy=1,sz=1) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x,y,z); m.scale.set(sx,sy,sz); m.castShadow = false; m.receiveShadow = false; parent.add(m); return m;
}
function addBox(parent,x,y,z,sx,sy,sz,color, opts={}) { return mesh(geo.box, mat(`box-${color}`, color, opts.roughness ?? 1, opts.metalness ? { metalness:opts.metalness } : {}), parent,x,y,z,sx,sy,sz); }
function makeTemple() {
  scene.add(new THREE.HemisphereLight(0xc8d4c2,0x443321,2.1));
  const sun = new THREE.DirectionalLight(0xffdfaa,3.2); sun.position.set(-8,14,7); scene.add(sun);
  const ground = mat('ground',0x6a6048); const side = mat('side',0x435044);
  addBox(staticThings,0,-0.45,-490,7,0.9,1040,0x70664d);
  addBox(staticThings,-4.25,1,-490,2,2,1040,0x465142);
  addBox(staticThings,4.25,1,-490,2,2,1040,0x465142);
  // Repeating flagstones and temple edging establish forward motion.
  for(let z=8;z>-1010;z-=8) {
    addBox(staticThings,0,0.015,z,6.1,0.08,7.7,seeded()<.5?0x77705a:0x81775d);
    for (const x of [-3.35,3.35]) {
      addBox(staticThings,x,0.2,z,0.42,0.38,7.8,0x8a7858);
      if (Math.abs(z)%32 < 1) addBox(staticThings,x*1.35,0.8,z,1.3,1.6,1.7,0x53604c);
    }
    if (Math.abs(z)%56 < 1) {
      for(const x of [-3.0,3.0]) {
        addBox(staticThings,x,3.05,z,0.72,6.1,0.82,0x776b50);
        addBox(staticThings,x,6.18,z,1.5,0.4,1.4,0xb0925d);
      }
      addBox(staticThings,0,6.5,z,6.7,0.55,1.5,0x7d704f);
    }
    if (Math.abs(z)%40 < 1) {
      const pillarX = seeded()<.5?-4.15:4.15;
      addBox(staticThings,pillarX,1.5,z,1.1,3,1.2,0x5d634e);
      addBox(staticThings,pillarX,3.15,z,1.5,.35,1.5,0x9b8051);
    }
  }
  // Distant green canopy and a monumental sun gate at the finish.
  for(let i=0;i<32;i++) {
    const x=(seeded()-.5)*24, z=-seeded()*940;
    const trunk=mesh(geo.cylinder,mat('bark',0x51452f),staticThings,x,1.7,z,.32,3.4,.32);
    trunk.rotation.z=(seeded()-.5)*.24;
    const crown=mesh(geo.rock,mat('leaf',seeded()<.5?0x455b3b:0x596747),staticThings,x,4.1,z,1.8,2.2,1.7);
  }
  const gateZ=-totalDistance;
  for(const x of [-2.65,2.65]) addBox(staticThings,x,4,gateZ,.9,8,1,0xc0a164);
  addBox(staticThings,0,7.6,gateZ,6.2,1,1,0xd1ae68);
  addBox(staticThings,0,3,gateZ,4.3,6,.45,0xf6c868);
  // A low-poly explorer stands ahead of the camera in the view.
}
makeTemple();

function createPlayer() {
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  mesh(geo.box,mat('pants',0x46513c),body,0,.91,0,.5,.75,.32);
  mesh(geo.box,mat('shirt',0x6b7645),body,0,1.52,0,.8,.67,.42);
  mesh(geo.box,mat('skin',0xc38d62),body,0,2.15,0,.42,.46,.42);
  mesh(geo.box,mat('hair',0x392c22),body,0,2.43,-.015,.48,.2,.45);
  for(const x of [-.26,.26]) {
    mesh(geo.box,mat('boot',0x342b20),body,x,.28,.09,.32,.24,.52);
    mesh(geo.box,mat('glove',0x44382b),body,x*1.7,1.42,.15,.22,.35,.25);
  }
  mesh(geo.box,mat('strap',0x383528),body,-.22,1.48,-.22,.13,.86,.12);
  root.position.set(0,0,3.1);
  return {root,body};
}
const player = createPlayer();
function resize() {
  if(!renderer) return;
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize); resize();

function toast(text, kind='') {
  const el=document.createElement('div'); el.className=`toast ${kind}`; el.textContent=text; ui.toastStack.append(el);
  requestAnimationFrame(()=>el.classList.add('show')); setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),350);},1900);
}
function showScreen(name) {
  for(const id of ['titleScreen','pauseScreen','endScreen']) ui[id].classList.toggle('is-hidden',id!==name);
}
function startGame() {
  resetGame(); game.state='playing'; showScreen(''); ui.hud.classList.remove('is-hidden'); ui.loading.classList.add('is-hidden');
  ui.tutorial.classList.remove('is-hidden'); game.tutorialTimer=7; clock.getDelta();
}
function resetGame() {
  ui.furyLabel.classList.add('is-off');
  ui.furyLabel.textContent='FURY READY';
  for(const o of game.objects) dynamicThings.remove(o.group);
  game.objects=[]; game.shots.forEach(s=>bullets.remove(s.mesh)); game.shots=[]; game.particles.forEach(p=>scene.remove(p.mesh));game.particles=[];
  Object.assign(game,{distance:0,score:0,health:100,lane:1,y:0,vy:0,slide:0,elapsed:0,lastShot:0,weapon:'pistol',kills:0,crates:0,fired:0,hits:0,combo:1,comboTime:0,invuln:0,spawnAt:22,fury:0,seed:918273});
  game.ammo={pistol:Infinity,ak:0,rocket:0,grenade:0}; player.root.position.set(0,0,3.1); player.body.scale.set(1,1,1);
  ui.hud.classList.add('is-hidden'); ui.loading.classList.add('is-hidden'); ui.toastStack.replaceChildren();
  updateHud();
}
function pause() { if(game.state==='playing'){game.state='paused';showScreen('pauseScreen');} else if(game.state==='paused'){game.state='playing';showScreen('');clock.getDelta();} }

const weaponInfo={pistol:['PISTOL','SIDEARM · ∞'],ak:['AK-47','ASSAULT RIFLE'],rocket:['ROCKET LAUNCHER','EXPLOSIVE'],grenade:['GRENADE','THROWN · AREA']};
function updateHud() {
  ui.distanceLabel.textContent=`${String(Math.floor(game.distance)).padStart(4,'0')} m`;
  const progress=Math.min(game.distance/totalDistance,1); ui.progressFill.style.width=`${progress*100}%`;ui.progressMarker.style.left=`${progress*100}%`;
  ui.objectiveLabel.textContent=progress>.9?'THE SUN GATE IS NEAR':'REACH THE SUN GATE';
  ui.scoreLabel.textContent=String(game.score).padStart(6,'0'); ui.comboLabel.textContent=`CHAIN ×${game.combo}`;
  ui.healthLabel.textContent=String(Math.max(0,Math.ceil(game.health)));ui.healthFill.style.width=`${Math.max(0,game.health)}%`;ui.healthDamage.style.width=`${Math.max(0,game.health)}%`;
  ui.weaponName.textContent=weaponInfo[game.weapon][0];ui.weaponHint.textContent=weaponInfo[game.weapon][1];ui.ammoLabel.textContent=game.ammo[game.weapon]===Infinity?'∞':game.ammo[game.weapon];ui.bestLabel.textContent=game.weapon.toUpperCase();
  ui.weaponSlots.querySelectorAll('.weapon-slot').forEach(slot=>{const w=slot.dataset.weapon;slot.classList.toggle('is-active',w===game.weapon);slot.classList.toggle('is-locked',w!=='pistol'&&game.ammo[w]<=0);slot.querySelector('b').textContent=game.ammo[w]===Infinity?'∞':game.ammo[w];});
}
function spawn(type,lane,z) {
  const group=new THREE.Group(); dynamicThings.add(group); group.position.set(lanes[lane],0,z);
  const obj={type,lane,z,group,hp:1,hit:false,phase:seeded()*6.28,kind:0};
  if(type==='crate') {
    const hue=seeded(); const wood=mat('wood'+(hue>.5?1:0),hue>.5?0x95633b:0x795237);
    mesh(geo.box,wood,group,0,.72,0,1.25,1.35,1.05);
    for(const y of [.12,1.28]) mesh(geo.box,mat('brace',0xc29a61),group,0,y,.55,1.29,.12,.08);
    for(const x of [-.55,.55]) mesh(geo.box,mat('brace',0xc29a61),group,x,.72,.56,.11,1.28,.08);
    obj.hp=game.weapon==='rocket'?1:3; obj.reward=seeded();
  } else if(type==='spike') {
    for(let i=0;i<3;i++){const p=mesh(geo.cone,mat('spike',0xa8a393),group,-.48+i*.48,.6,0,.27,1.15,.27);p.rotation.x=Math.PI;}
  } else if(type==='enemy') {
    const kind=Math.floor(seeded()*3);obj.kind=kind;obj.hp=kind===2?3:2;
    const colors=[0x8b5034,0x8c8d72,0x4c5b42];
    mesh(geo.box,mat('enemy'+kind,colors[kind]),group,0,1.05,0,.82,1.05,.48);
    mesh(geo.box,mat('enemyhead'+kind,kind===1?0x9a8b68:0xc38d62),group,0,1.86,.02,.55,.55,.48);
    mesh(geo.box,mat('eye',0xc44e2e),group,.14,1.92,.26,.09,.08,.04);
    for(const x of [-.45,.45])mesh(geo.box,mat('enemyarm',colors[kind]),group,x,1.22,0,.22,.7,.27);
    obj.fireAt=2+seeded()*2;
  } else if(type==='pickup') {
    const p=obj.pickup= ['ak','rocket','grenade','health','ammo'][Math.floor(seeded()*5)];
    const colors={ak:0x83924a,rocket:0xb85935,grenade:0x667749,health:0xd7543b,ammo:0xd5ad54};
    mesh(p==='health'?geo.box:geo.rock,mat('pickup'+p,colors[p],.55,{emissive:colors[p],emissiveIntensity:.23}),group,0,1.05,0,.48,.48,.48);
    if(p==='health')addBox(group,0,1.05,.26,.12,.38,.08,0xffe6c6);
    obj.phase=seeded()*6.28;
  }
  game.objects.push(obj); return obj;
}
function spawnWave() {
  const pattern=Math.floor(seeded()*6), z=-105;
  if(pattern===0){spawn('crate',Math.floor(seeded()*3),z);spawn('spike',Math.floor(seeded()*3),z-19);}
  else if(pattern===1){const safe=Math.floor(seeded()*3);for(let l=0;l<3;l++)if(l!==safe)spawn(seeded()<.55?'crate':'spike',l,z);if(seeded()<.6)spawn('pickup',safe,z-7);}
  else if(pattern===2){spawn('enemy',Math.floor(seeded()*3),z);spawn('crate',Math.floor(seeded()*3),z-22);}
  else if(pattern===3){spawn('pickup',Math.floor(seeded()*3),z);spawn('spike',Math.floor(seeded()*3),z-25);}
  else if(pattern===4){spawn('crate',Math.floor(seeded()*3),z);spawn('crate',Math.floor(seeded()*3),z-18);}
  else {spawn('enemy',Math.floor(seeded()*3),z);spawn('pickup',Math.floor(seeded()*3),z-18);}
  game.spawnAt=game.distance+45+seeded()*20;
}

function burst(position,color=0xe6b45e,count=10) {
  for(let i=0;i<count;i++) {
    const m=mesh(geo.box,mat('particle'+color,color),scene,position.x,position.y,position.z,.08,.08,.08);
    game.particles.push({mesh:m,life:.45+Math.random()*.3,v:new THREE.Vector3((Math.random()-.5)*5,Math.random()*4,(Math.random()-.5)*5)});
  }
}
function damage(amount) {
  if(game.invuln>0||game.state!=='playing')return;
  game.health=Math.max(0,game.health-amount);game.invuln=1.1;
  ui.damageFlash.classList.remove('flash');void ui.damageFlash.offsetWidth;ui.damageFlash.classList.add('flash');
  updateHud(); if(game.health<=0) finish(false);
}
function awardScore(points) { game.score+=Math.round(points*(game.fury>0?2:1)); }
function rewardCrate(obj) {
  game.crates++;awardScore(100*game.combo);game.combo=Math.min(9,game.combo+1);game.comboTime=4;
  burst(obj.group.position.clone().add(new THREE.Vector3(0,.7,0)),0xc89454,14);
  const r=obj.reward;
  if(r<.34){game.ammo.ak+=18;toast('AK-47 AMMO +18','loot');}
  else if(r<.52){game.ammo.rocket+=2;toast('ROCKETS +2','loot');}
  else if(r<.68){game.ammo.grenade+=2;toast('GRENADES +2','loot');}
  else if(r<.82){game.health=Math.min(100,game.health+24);toast('MED KIT · VITALS RESTORED','loot');}
  else {game.fury=8;ui.furyLabel.textContent='FURY ×2';ui.furyLabel.classList.remove('is-off');toast('RELIC FURY · SCORE DOUBLED','loot');}
  updateHud();
}
function destroyObject(obj) {
  if(obj.type==='crate') rewardCrate(obj);
  else if(obj.type==='enemy'){game.kills++;awardScore(250*game.combo);game.combo=Math.min(9,game.combo+1);game.comboTime=4;burst(obj.group.position.clone().add(new THREE.Vector3(0,1,0)),0x9f4d36,14);toast('TEMPLE GUARD DOWN');}
  const index=game.objects.indexOf(obj);if(index>=0)game.objects.splice(index,1);dynamicThings.remove(obj.group);
}
function shoot() {
  if(game.state!=='playing'||game.elapsed-game.lastShot<({pistol:.3,ak:.12,rocket:.72,grenade:.9}[game.weapon]))return;
  if(game.weapon!=='pistol'&&game.ammo[game.weapon]<=0){toast('OUT OF AMMO · PISTOL SELECTED');game.weapon='pistol';updateHud();return;}
  game.lastShot=game.elapsed;game.fired++;
  if(game.weapon!=='pistol')game.ammo[game.weapon]--;
  const target=game.objects.filter(o=>o.lane===game.lane&&o.z>player.root.position.z-80&&o.z<player.root.position.z+2&&(o.type==='crate'||o.type==='enemy')).sort((a,b)=>b.z-a.z)[0];
  const start=new THREE.Vector3(lanes[game.lane],1.65,player.root.position.z-0.7);
  if(game.weapon==='grenade') {
    const victims=game.objects.filter(o=>Math.abs(o.lane-game.lane)<=1&&o.z>player.root.position.z-48&&o.z<player.root.position.z+1&&(o.type==='crate'||o.type==='enemy'));
    victims.forEach(o=>{o.hp-=3;if(o.hp<=0)destroyObject(o);else game.hits++;});
    burst(new THREE.Vector3(lanes[game.lane],1.5,player.root.position.z-24),0xc69749,24);
  } else {
    const color=game.weapon==='rocket'?0xff8a35:0xffe6a3;
    const bullet=mesh(geo.box,mat('shot'+color,color,.3,{emissive:color,emissiveIntensity:2}),bullets,start.x,start.y,start.z,game.weapon==='rocket'?.16:.055,game.weapon==='rocket'?.16:.055,game.weapon==='rocket'?.65:.38);
    const end=target?new THREE.Vector3(lanes[target.lane],target.type==='enemy'?1.5:.85,target.z):new THREE.Vector3(lanes[game.lane],1.2,player.root.position.z-65);
    game.shots.push({mesh:bullet,from:start,to:end,t:0,duration:game.weapon==='rocket'?.24:.12,target,damage:game.weapon==='rocket'?4:1});
  }
  updateHud();
}
function selectWeapon(key) { const weapon={1:'pistol',2:'ak',3:'rocket',4:'grenade'}[key];if(!weapon)return;if(weapon==='pistol'||game.ammo[weapon]>0){game.weapon=weapon;updateHud();} }
function setLane(delta) {game.lane=THREE.MathUtils.clamp(game.lane+delta,0,2);}
function jump() { if(game.state==='playing'&&game.y<=.01&&game.slide<=0){game.vy=9.1;} }
function slide() { if(game.state==='playing'&&game.y<=.1)game.slide=.8; }
function finish(won) {
  if(game.state==='ended')return;game.state='ended';ui.hud.classList.add('is-hidden');showScreen('endScreen');
  ui.endEyebrow.textContent=won?'EXPEDITION COMPLETE':'EXPEDITION LOST';ui.endTitle.textContent=won?'THE SUN GATE OPENS':'LOST TO THE TEMPLE';
  ui.endCopy.textContent=won?'You escaped with the relics. The Sunken Path will remember your name.':'The temple keeps its secrets. Catch your breath, then run it again.';
  ui.endScore.textContent=String(game.score).padStart(6,'0');ui.endCrates.textContent=game.crates;ui.endKills.textContent=game.kills;ui.endAccuracy.textContent=`${game.fired?Math.round(game.hits/game.fired*100):0}%`;
}
function handleCollision(obj) {
  if(obj.type==='pickup') {
    const p=obj.pickup; if(p==='ak'||p==='rocket'||p==='grenade'){game.ammo[p]+={ak:24,rocket:3,grenade:3}[p];game.weapon=p;toast(`${p==='ak'?'AK-47':p.toUpperCase()} ACQUIRED`,'loot');}
    else if(p==='health'){game.health=Math.min(100,game.health+30);toast('MED KIT +30 VITALS','loot');}
    else {game.ammo.ak+=12;awardScore(100);toast('AMMO CACHE +12','loot');}
    awardScore(50);destroyObject(obj);updateHud();return;
  }
  if(obj.type==='crate') {
    if(game.y>.55||game.slide>0)return;
    damage(18);obj.z+=8;obj.group.position.z=obj.z;return;
  }
  if(obj.type==='spike') {
    if(game.y>.8||game.slide>0)return;damage(24);obj.z+=8;obj.group.position.z=obj.z;return;
  }
  if(obj.type==='enemy') {damage(16);obj.z-=1.5;obj.group.position.z=obj.z;}
}

const held=new Set();
window.addEventListener('keydown',(event)=>{
  const key=event.key.toLowerCase();
  if([' ','arrowleft','arrowright','arrowup','control'].includes(key))event.preventDefault();
  if(key==='enter'&&(game.state==='title'||game.state==='ended')){startGame();return;}
  if(key==='p'||key==='escape'){pause();return;}
  if(game.state!=='playing')return;
  if(key==='a'||key==='arrowleft'){if(!held.has(key))setLane(-1);}
  if(key==='d'||key==='arrowright'){if(!held.has(key))setLane(1);}
  if(key==='w'||key==='arrowup'){if(!held.has(key))jump();}
  if(key==='control'){slide();}
  if(key===' '){shoot();}
  if(['1','2','3','4'].includes(key))selectWeapon(key);
  if(key==='m')scene.userData.muted=!scene.userData.muted;
  held.add(key);
});
window.addEventListener('keyup',(e)=>held.delete(e.key.toLowerCase()));
ui.startButton.addEventListener('click',startGame);ui.againButton.addEventListener('click',startGame);ui.restartButton.addEventListener('click',startGame);
ui.resumeButton.addEventListener('click',pause);ui.quitButton.addEventListener('click',()=>{game.state='title';ui.hud.classList.add('is-hidden');showScreen('titleScreen');});

function update(dt) {
  if(game.state!=='playing')return;
  dt=Math.min(dt,.04);game.elapsed+=dt;game.distance+=game.speed*dt;
  staticThings.position.z=game.distance;
  camera.position.z=9.5;camera.position.x=THREE.MathUtils.damp(camera.position.x,lanes[game.lane]*.13,3,dt);
  player.root.position.z=3.1;player.root.position.x=THREE.MathUtils.damp(player.root.position.x,lanes[game.lane],12,dt);
  game.vy-=22*dt;game.y=Math.max(0,game.y+game.vy*dt);if(game.y===0)game.vy=0;
  if(game.slide>0)game.slide=Math.max(0,game.slide-dt);
  player.root.position.y=game.y;player.body.scale.y=game.slide>0?.48:1;player.body.position.y=game.slide>0?-.38:0;
  player.body.rotation.z=THREE.MathUtils.damp(player.body.rotation.z,(lanes[game.lane]-player.root.position.x)*-.18,8,dt);
  if(game.invuln>0)game.invuln-=dt;
  if(game.comboTime>0){game.comboTime-=dt;if(game.comboTime<=0)game.combo=1;}
  if(game.fury>0){game.fury-=dt;if(game.fury<=0)ui.furyLabel.classList.add('is-off');}
  if(game.tutorialTimer>0){game.tutorialTimer-=dt;if(game.tutorialTimer<=0)ui.tutorial.classList.add('is-hidden');}
  if(game.distance>=game.spawnAt&&game.distance<totalDistance-35)spawnWave();
  for(const obj of [...game.objects]) {
    obj.z+=game.speed*dt;obj.group.position.z=obj.z;
    if(obj.type==='pickup'){obj.group.position.y=1.05+Math.sin(game.elapsed*3+obj.phase)*.15;obj.group.rotation.y+=dt*1.5;}
    if(obj.type==='enemy'){
      obj.fireAt-=dt;
      if(obj.fireAt<=0&&Math.abs(obj.z-player.root.position.z)<38&&Math.abs(obj.lane-game.lane)<.5){damage(7);obj.fireAt=2.2;}
      obj.group.rotation.y=Math.sin(game.elapsed*2+obj.phase)*.08;
    }
    const dz=obj.z-player.root.position.z;
    if(Math.abs(dz)<1.45&&obj.lane===game.lane)handleCollision(obj);
    if(obj.z>player.root.position.z+10){const index=game.objects.indexOf(obj);if(index>=0)game.objects.splice(index,1);dynamicThings.remove(obj.group);}
  }
  for(const shot of [...game.shots]) {
    shot.t+=dt/shot.duration;const t=Math.min(shot.t,1);shot.mesh.position.lerpVectors(shot.from,shot.to,t);
    if(t>=1){
      if(shot.target&&game.objects.includes(shot.target)){
        shot.target.hp-=shot.damage;game.hits++;
        if(shot.target.hp<=0)destroyObject(shot.target);else toast('HIT');
      } else if(game.weapon==='rocket')burst(shot.to,0xe4853c,8);
      bullets.remove(shot.mesh);game.shots.splice(game.shots.indexOf(shot),1);
    }
  }
  for(const p of [...game.particles]){p.life-=dt;p.mesh.position.addScaledVector(p.v,dt);p.v.y-=8*dt;p.mesh.scale.multiplyScalar(Math.max(.01,1-dt*2));if(p.life<=0){scene.remove(p.mesh);game.particles.splice(game.particles.indexOf(p),1);}}
  if(game.distance>=totalDistance){finish(true);}
  if(Math.floor(game.distance)%10===0) updateHud();
}
function render() {
  if(!renderer)return;
  requestAnimationFrame(render);
  const dt=clock.getDelta();update(dt);
  // Keep the camera tracking the runner without mouse-look.
  camera.position.y=4.7+Math.sin(game.elapsed*8)*.025;
  camera.lookAt(player.root.position.x*.3,1.3+game.y*.3,player.root.position.z-7);
  renderer.render(scene,camera);
}
ui.loading.classList.add('is-hidden');
showScreen('titleScreen');
render();
