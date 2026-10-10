import * as THREE from '../vendor/three.module.js';
import {buildModel} from '../model.js';
import {buildTank} from '../tank/model.js';
import {LEVELS} from './levels.js';

const $=id=>document.getElementById(id);
let levelIndex=0,level=LEVELS[levelIndex];
const levelSelect=$('level-select');
const scene=new THREE.Scene();
scene.background=new THREE.Color(level.palette.sky);
scene.fog=new THREE.Fog(level.palette.sky,22,48);
const host=$('scene');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;host.append(renderer.domElement);
const camera=new THREE.OrthographicCamera(-10,10,8,-8,.1,80);camera.position.set(0,2,28);camera.lookAt(0,2,0);
scene.add(new THREE.HemisphereLight(0xfffdf4,0x7a9081,2.6));
const sun=new THREE.DirectionalLight(0xffe2a5,2.3);sun.position.set(-8,16,14);sun.castShadow=true;scene.add(sun);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.7,...extra});
const mats={gold:mat('#efb63b',{emissive:'#875c00',emissiveIntensity:.2}),red:mat('#d66f5d',{emissive:'#6f1f18',emissiveIntensity:.3}),dark:mat('#39473c'),mint:mat('#78b49a',{emissive:'#2f8166',emissiveIntensity:.3}),blue:mat('#6c9fd1',{emissive:'#244f80',emissiveIntensity:.3}),violet:mat('#9a88c9',{emissive:'#473776',emissiveIntensity:.3})};
function mesh(geo,material,parent=scene){const o=new THREE.Mesh(geo,material);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
function topDownRig(template,scale,heading=Math.PI/2){const rig=new THREE.Group(),visual=template.clone(true);visual.rotation.x=Math.PI/2;rig.rotation.z=heading;rig.scale.setScalar(scale);rig.add(visual);return rig}
function sideViewRig(template,scale){const rig=new THREE.Group(),visual=template.clone(true);visual.position.y=-1.3;rig.scale.setScalar(scale);rig.add(visual);return rig}

const tankRig=buildTank(),player=new THREE.Group();
tankRig.tank.rotation.x=Math.PI/2;player.rotation.z=Math.PI/2;player.add(tankRig.tank);tankRig.tank.scale.setScalar(.32);player.position.set(0,-3,0);scene.add(player);
const shieldVisual=new THREE.Mesh(new THREE.TorusGeometry(1.02,.045,8,24),new THREE.MeshBasicMaterial({color:'#79bda2',transparent:true,opacity:.78}));shieldVisual.rotation.x=Math.PI/2;shieldVisual.visible=false;player.add(shieldVisual);
const enemyRig=buildModel();enemyRig.poseCreature({stand:0,wing:.42});
const combinedTemplate=enemyRig.model,carrierTemplate=enemyRig.chassis.clone(true);
const enemies=[],droppedCars=[],shots=[],enemyShots=[],sparks=[],powerups=[];
const enemyLayer=new THREE.Group();scene.add(enemyLayer);
const bulletGeo=new THREE.SphereGeometry(.14,10,8),enemyBulletGeo=new THREE.SphereGeometry(.18,10,8);
const POWERUPS={double:{name:'双炮',duration:9,material:mats.gold},spread:{name:'散射',duration:8,material:mats.blue},shield:{name:'护盾',duration:7,material:mats.mint},slow:{name:'减速时间',duration:7,material:mats.violet}};
const powerTimers=Object.fromEntries(Object.keys(POWERUPS).map(key=>[key,0]));
let state='ready',time=0,last=performance.now(),playerX=0,move=0,fireHeld=false,fireClock=0,waveIndex=0,score=0,lives=level.player.lives,deployClock=0,defeatCount=0;
function say(){}
function burst(pos,color='#efb63b',count=12){for(let i=0;i<count;i++){const s=mesh(new THREE.SphereGeometry(.055,6,5),new THREE.MeshBasicMaterial({color,transparent:true}));s.position.copy(pos);s.userData={v:new THREE.Vector3((Math.random()-.5)*7,(Math.random()-.5)*7,Math.random()-.5),life:.45};sparks.push(s)}}
function laneLimit(padding=.75){return Math.max(2,camera.right-padding)}
function formationSlots(count,lane,formation){
  const columns=formation==='line'?count:Math.min(3,Math.ceil(count/2));const gap=Math.min(2.05,(lane*2)/(columns+1));const slots=[];
  for(let i=0;i<count;i++){
    const row=Math.floor(i/columns),inRow=Math.min(columns,count-row*columns),col=i-row*columns;
    let x=(col-(inRow-1)/2)*gap,y=6.35+row*.92;
    if(formation==='stagger'&&row%2)x+=gap*.38;
    if(formation==='wedge')y+=Math.abs(col-(inRow-1)/2)*.42;
    slots.push({x,y,row});
  }
  return slots;
}
function spawnWave(index){
  enemyLayer.clear();enemies.length=0;droppedCars.splice(0).forEach(o=>o.removeFromParent());
  const wave=level.waves[index],lane=laneLimit(1),slots=formationSlots(wave.count,lane,wave.formation);
  slots.forEach(slot=>{const combined=topDownRig(combinedTemplate,.24);combined.position.set(slot.x,slot.y,0);combined.userData={homeX:slot.x,homeY:slot.y,row:slot.row,health:wave.health,phase:'combined',phaseTime:0};enemyLayer.add(combined);enemies.push(combined)});
  waveIndex=index;deployClock=wave.deployEvery;say(`${wave.label} · 留意投放与俯冲`);sync();
}
function makeShot(xOffset=0,xVelocity=0){const b=mesh(bulletGeo,mats.gold);b.position.set(playerX+xOffset,player.position.y+.82,.3);b.userData={vx:xVelocity,vy:17};shots.push(b)}
function shoot(){
  if(state!=='playing')return;
  const barrels=powerTimers.double>0?[-.28,.28]:[0];const spread=powerTimers.spread>0?[-2,0,2]:[0];
  barrels.forEach(barrel=>spread.forEach(vx=>makeShot(barrel,vx)));
}
function powerPart(geometry,material){const part=new THREE.Mesh(geometry,material);part.castShadow=part.receiveShadow=true;return part}
function powerModule(type){
  const module=new THREE.Group(),material=POWERUPS[type].material,glow=new THREE.MeshBasicMaterial({color:material.color,transparent:true,opacity:.82});
  const halo=powerPart(new THREE.TorusGeometry(.36,.045,8,20),glow);halo.rotation.x=Math.PI/2;module.add(halo);
  const core=powerPart(new THREE.SphereGeometry(.19,12,8),material);core.scale.set(1,1,.55);module.add(core);
  const ink=new THREE.MeshBasicMaterial({color:'#fff8d8'});
  if(type==='double')[-.085,.085].forEach(x=>{const bar=powerPart(new THREE.BoxGeometry(.055,.24,.035),ink);bar.position.set(x,0,.12);module.add(bar)});
  if(type==='spread')[-.17,0,.17].forEach((x,index)=>{const ray=powerPart(new THREE.BoxGeometry(.04,.22,.035),ink);ray.position.set(0,.01,.12);ray.rotation.z=(index-1)*.45;module.add(ray)});
  if(type==='shield'){const shield=powerPart(new THREE.TorusGeometry(.12,.035,6,12),ink);shield.rotation.x=Math.PI/2;shield.position.z=.12;module.add(shield)}
  if(type==='slow'){const top=powerPart(new THREE.BoxGeometry(.18,.045,.035),ink),bottom=top.clone(),neck=powerPart(new THREE.BoxGeometry(.045,.16,.035),ink);top.position.set(0,.1,.12);bottom.position.set(0,-.1,.12);neck.position.z=.12;module.add(top,bottom,neck)}
  return module;
}
function spawnPowerup(pos){
  const type=Object.keys(POWERUPS)[Math.floor(defeatCount/3)%4],orb=powerModule(type);
  orb.position.copy(pos);orb.userData={type,v:2.0,phase:Math.random()*Math.PI*2};scene.add(orb);powerups.push(orb);
}
function activatePower(type){powerTimers[type]=POWERUPS[type].duration;score+=40;burst(player.position,POWERUPS[type].material.color,16);sync()}
function damage(text='坦克受击！'){
  if(powerTimers.shield>0){burst(player.position,'#78b49a',12);return}
  lives--;burst(player.position,'#d66f5d',18);say(lives?text:'战斗结束',2);
  if(lives<=0)end('坦克已损坏','再试一次：利用强化挡住压力，并通过横移躲开投放战车和俯冲翼龙。','重新开始');sync();
}
function end(title,copy,label){state=title==='关卡完成'?'won':'lost';$('overlay').hidden=false;$('overlay').querySelector('.eyebrow').textContent=state==='won'?'首批关卡包 · 完成':'首批关卡包 · 失败';$('overlay').querySelector('h2').textContent=title;$('overlay').querySelector('p:not(.eyebrow)').textContent=copy;$('start').textContent=label}
function advance(){if(waveIndex<level.waves.length-1)spawnWave(waveIndex+1);else{const hasNext=levelIndex<LEVELS.length-1;end('关卡完成',hasNext?`关卡 ${String(levelIndex+1).padStart(2,'0')} 完成，下一关会增加一项新的压力。`:'你已完成首批六个关卡。可重新挑战终端突袭。',hasNext?'下一关':'再玩一次')}}
function showLevelIntro(){const overlay=$('overlay');overlay.hidden=false;overlay.querySelector('.eyebrow').textContent=`首批关卡包 · ${String(levelIndex+1).padStart(2,'0')} / ${String(LEVELS.length).padStart(2,'0')}`;overlay.querySelector('h2').textContent=`${level.name} · 编队接近`;overlay.querySelector('p:not(.eyebrow)').textContent='击败敌人会掉落强化模块。接住后可短时获得双炮、散射、护盾或减速时间。';$('start').textContent='开始'}
function loadLevel(index){levelIndex=THREE.MathUtils.clamp(index,0,LEVELS.length-1);level=LEVELS[levelIndex];levelSelect.value=String(levelIndex);scene.background.set(level.palette.sky);scene.fog.color.set(level.palette.fog)}
function clearPowerups(){powerups.splice(0).forEach(o=>o.removeFromParent());Object.keys(powerTimers).forEach(key=>powerTimers[key]=0)}
function reset(){
  enemyLayer.clear();enemies.length=0;[...shots,...enemyShots,...sparks].forEach(o=>o.removeFromParent());shots.length=enemyShots.length=sparks.length=0;droppedCars.splice(0).forEach(o=>o.removeFromParent());clearPowerups();
  time=0;playerX=0;move=0;fireHeld=false;fireClock=0;waveIndex=0;score=0;lives=level.player.lives;deployClock=0;defeatCount=0;state='playing';$('overlay').hidden=true;spawnWave(0);say('坦克自动开火 · 左右躲避投放',3);
}
function sync(){
  $('score').textContent=String(score).padStart(6,'0');$('lives').innerHTML=Array.from({length:level.player.lives},(_,i)=>`<span class="life${i<lives?' is-active':''}"></span>`).join('');$('lives').setAttribute('aria-label',`${lives} / ${level.player.lives} 格装甲`);
  $('wave-label').textContent='波次 '+String(waveIndex+1).padStart(2,'0');$('objective').textContent=`残余合体 ${enemies.filter(e=>e.parent).length}`;
  const active=Object.entries(powerTimers).filter(([,remaining])=>remaining>0).map(([key,remaining])=>`${POWERUPS[key].name} ${Math.ceil(remaining)}s`);$('power-state').textContent=active.length?active.join(' · '):'强化待机';
}
function resize(){const w=host.clientWidth,h=host.clientHeight,aspect=w/h,viewH=18;renderer.setSize(w,h,false);camera.left=-viewH*aspect/2;camera.right=viewH*aspect/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(host);resize();
function hit(a,b,r){return a.position.distanceTo(b.position)<r}
function deploy(enemy,wave){
  const d=enemy.userData;if(d.phase!=='combined')return;d.phase='turn';d.phaseTime=0;
  const car=sideViewRig(carrierTemplate,.24);car.position.copy(enemy.position);car.position.y-=.7;car.userData={v:4.3,health:1};scene.add(car);droppedCars.push(car);
  const chassis=enemy.getObjectByName('Four-wheel carrier');if(chassis)chassis.visible=false;say('战车已投放！翼龙正在掉头。',2);
}
function update(dt){
  if(state!=='playing')return;time+=dt;
  Object.keys(powerTimers).forEach(key=>powerTimers[key]=Math.max(0,powerTimers[key]-dt));shieldVisual.visible=powerTimers.shield>0;shieldVisual.rotation.z+=dt*2.6;
  const enemyDt=dt*(powerTimers.slow>0?.55:1),lane=laneLimit();playerX=THREE.MathUtils.clamp(playerX+move*level.player.speed*dt,-lane,lane);player.position.x=playerX;
  fireClock-=dt;if(fireClock<=0){shoot();fireClock=level.player.fireRate}
  const wave=level.waves[waveIndex],formationShift=Math.sin(time*1.15)*wave.drift;deployClock-=enemyDt;
  if(deployClock<=0){const target=enemies.filter(e=>e.parent&&e.userData.phase==='combined').sort((a,b)=>b.userData.row-a.userData.row)[0];if(target)deploy(target,wave);deployClock=wave.deployEvery;}
  enemies.forEach((e,i)=>{
    if(!e.parent)return;const d=e.userData;
    if(d.phase==='combined'){e.position.x=THREE.MathUtils.clamp(d.homeX+formationShift,-lane,lane);e.position.y=d.homeY+Math.sin(time*2+i)*.09;e.rotation.z=Math.PI/2+Math.sin(time*4+i)*.025;}
    else if(d.phase==='turn'){d.phaseTime+=enemyDt;e.rotation.z=THREE.MathUtils.lerp(Math.PI/2,-Math.PI/2,Math.min(1,d.phaseTime/.55));if(d.phaseTime>=.55){d.phase='dive';d.target=playerX;}}
    else{e.position.x=THREE.MathUtils.clamp(THREE.MathUtils.lerp(e.position.x,d.target,enemyDt*1.35),-lane,lane);e.position.y-=wave.diveSpeed*enemyDt;e.rotation.z=-Math.PI/2+Math.sin(time*8+i)*.08;if(e.position.y<player.position.y+.55){const connects=Math.abs(e.position.x-playerX)<1.15;e.removeFromParent();if(connects){damage('翼龙俯冲命中坦克！');burst(e.position,'#d66f5d',20)}else burst(e.position,'#a9bbaa',8);}}
    const wings=e.getObjectByName('Left small triangular wing');if(wings)wings.rotation.x=Math.sin(time*11+i)*.35;
  });
  droppedCars.forEach((car,i)=>{car.position.y-=car.userData.v*enemyDt;if(car.position.y<player.position.y-.25){const connects=Math.abs(car.position.x-playerX)<1.1;car.removeFromParent();droppedCars.splice(i,1);if(connects)damage('投放战车撞击坦克！');else burst(car.position,'#a9bbaa',8);}});
  powerups.forEach((orb,i)=>{orb.position.y-=orb.userData.v*dt;orb.position.y+=Math.sin(time*3+orb.userData.phase)*.035;orb.rotation.z+=dt*.9;if(hit(orb,player,.98)){activatePower(orb.userData.type);burst(orb.position,'#fff8d8',10);orb.removeFromParent();powerups.splice(i,1)}else if(orb.position.y<-6){orb.removeFromParent();powerups.splice(i,1)}});
  shots.forEach((b,i)=>{
    b.position.x+=b.userData.vx*dt;b.position.y+=b.userData.vy*dt;b.rotation.y+=dt*9;
    if(b.position.y>12||Math.abs(b.position.x)>lane+1){b.removeFromParent();shots.splice(i,1);return}
    for(const car of droppedCars){if(car.parent&&hit(b,car,.9)){car.removeFromParent();droppedCars.splice(droppedCars.indexOf(car),1);score+=80;burst(car.position);b.removeFromParent();shots.splice(i,1);return}}
    for(const e of enemies){if(e.parent&&hit(b,e,.92)){e.userData.health--;burst(b.position);b.removeFromParent();shots.splice(i,1);if(e.userData.health<=0){e.removeFromParent();score+=wave.score;defeatCount++;if(defeatCount%3===0)spawnPowerup(e.position);burst(e.position,'#f1c448',18)}break}}
  });
  enemyShots.forEach((b,i)=>{b.position.y+=b.userData.v*enemyDt;if(b.position.y<-7){b.removeFromParent();enemyShots.splice(i,1);return}if(Math.abs(b.position.x-playerX)<1.15&&b.position.y<-4){b.removeFromParent();enemyShots.splice(i,1);damage();}});
  sparks.forEach((s,i)=>{s.position.addScaledVector(s.userData.v,dt);s.userData.life-=dt;s.material.opacity=Math.max(0,s.userData.life*2);if(s.userData.life<=0){s.removeFromParent();sparks.splice(i,1)}});
  if(enemies.length&&enemies.every(e=>!e.parent)&&!droppedCars.length)advance();sync();
}
function startGame(){if(state==='won'&&levelIndex<LEVELS.length-1)loadLevel(levelIndex+1);if(state==='ready'||state==='won'||state==='lost')reset()}
$('start').onclick=startGame;$('start').addEventListener('touchend',e=>{e.preventDefault();startGame()},{passive:false});$('restart').onclick=reset;
window.addEventListener('keydown',e=>{if(['ArrowLeft','KeyA'].includes(e.code)){move=-1;e.preventDefault()}if(['ArrowRight','KeyD'].includes(e.code)){move=1;e.preventDefault()}if(e.code==='Space'){fireHeld=true;e.preventDefault()}});
window.addEventListener('keyup',e=>{if(['ArrowLeft','KeyA','ArrowRight','KeyD'].includes(e.code))move=0;if(e.code==='Space')fireHeld=false});
for(const b of document.querySelectorAll('[data-move]')){const dir=Number(b.dataset.move),startMove=e=>{e.preventDefault();move=dir},stopMove=()=>move=0;b.addEventListener('pointerdown',e=>{startMove(e);try{b.setPointerCapture(e.pointerId)}catch{}});b.addEventListener('touchstart',startMove,{passive:false});for(const ev of ['pointerup','pointercancel','lostpointercapture','touchend','touchcancel'])b.addEventListener(ev,stopMove)}
const fire=$('fire'),startFire=e=>{e.preventDefault();fireHeld=true},stopFire=()=>fireHeld=false;fire.addEventListener('pointerdown',startFire);fire.addEventListener('touchstart',startFire,{passive:false});for(const ev of ['pointerup','pointercancel','lostpointercapture','touchend','touchcancel'])fire.addEventListener(ev,stopFire);
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);renderer.render(scene,camera);requestAnimationFrame(loop)}
LEVELS.forEach((item,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=`关卡 ${String(index+1).padStart(2,'0')} · ${item.name}`;levelSelect.append(option)});
levelSelect.addEventListener('change',()=>{loadLevel(Number(levelSelect.value));if(state==='playing')reset();else{state='ready';showLevelIntro();sync()}});
loadLevel(0);showLevelIntro();requestAnimationFrame(loop);sync();
