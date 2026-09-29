import * as THREE from '../vendor/three.module.js';
import {buildModel} from '../model.js';
import {WORLD,createRescue,start,pause,resume,switchRole,dock,interact,skill,tick,actionLabel,objective} from './state.js?v=3';
const $=id=>document.getElementById(id);
let state=createRescue(),renderer,lastStatus='',lastEvent=-1,messageEnd=0,stickPointer=null,axis={x:0,y:0};
const keys=new Set(),scene=new THREE.Scene();scene.background=new THREE.Color('#375353');scene.fog=new THREE.Fog('#375353',40,110);
const camera=new THREE.OrthographicCamera(-20,20,10,-10,.1,180);let cameraX=15;
scene.add(new THREE.HemisphereLight(0xf4e8bf,0x486760,2.6));
const sun=new THREE.DirectionalLight(0xffdf9c,3.4);sun.position.set(-10,22,18);scene.add(sun);
const fill=new THREE.DirectionalLight(0x8bd1c5,2);fill.position.set(9,13,-14);scene.add(fill);
const material=(color,extras={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extras});
const mats={ground:material('#54645a'),edge:material('#b19b71'),rock:material('#3c5149'),road:material('#364b43'),steel:material('#49665e'),dark:material('#203937'),yellow:material('#ecc765'),blue:material('#73d8d3',{emissive:'#25776e',emissiveIntensity:.3}),green:material('#92e6a3',{emissive:'#428057',emissiveIntensity:.3}),red:material('#eb8e61',{emissive:'#a7482b',emissiveIntensity:.2})};
function mesh(g,m,parent=scene,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
function box(w,h,d,m,parent=scene,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),m,parent,x,y,z);}
function cylinder(r,h,m,parent=scene,x=0,y=0,z=0){return mesh(new THREE.CylinderGeometry(r,r,h,16),m,parent,x,y,z);}
function label(text,x,y,z=-1,color='#e9dcaa'){
 const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');
 ctx.fillStyle='rgba(22,46,43,.86)';ctx.beginPath();ctx.roundRect(2,2,508,90,12);ctx.fill();
 ctx.fillStyle=color;ctx.font='500 29px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48,475);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.position.set(x,y,z);sprite.scale.set(7,1.31,1);scene.add(sprite);return sprite;
}
// Broken road, with a visible ravine and a raised mechanical bridge.
for(const [x,width] of [[12,30],[77,78]]){
 box(width,.35,6,mats.ground,scene,x,-.2);box(width,3,7,mats.rock,scene,x,-1.9);
 box(width,.07,3.4,mats.road,scene,x,.01);
 for(let p=x-width/2+2;p<x+width/2;p+=4)box(1.2,.02,.08,mats.edge,scene,p,.065,1.65);
}
box(11,.1,7,material('#336560',{metalness:.4}),scene,32.5,-4);
for(const x of [26,39]){box(.7,6,7,mats.dark,scene,x,-2);box(.9,.2,7,mats.edge,scene,x,.05);}
const bridge=new THREE.Group();scene.add(bridge);bridge.position.set(32.5,-3,0);
for(let i=0;i<11;i++){box(.92,.25,5.4,mats.steel,bridge,i-5,0);box(.07,.03,5.2,mats.edge,bridge,i-5,.15);}
const plate=box(3.2,.14,5,mats.yellow,scene,WORLD.plate,.11,-.5);
for(const z of [-2.8,1.8])box(3.3,.1,.12,mats.dark,scene,21,.21,z);
label('01 压力板 · 推箱保持供电',20,4.6,-3);
const crate=new THREE.Group();scene.add(crate);
box(1.9,1.8,1.9,mats.edge,crate,0,.95);for(const z of [-.98,.98]){
 box(1.85,.15,.08,mats.dark,crate,0,1,z);box(.15,1.7,.08,mats.dark,crate,0,.95,z);
}cylinder(.18,.1,mats.yellow,crate,0,1.92);
const tether=mesh(new THREE.CylinderGeometry(.035,.035,1,6),mats.yellow);
// High platforms and two independently useful controls.
function platform(x,y,width){box(width,.35,3,mats.steel,scene,x,y,-.7);for(const dx of [-width/2+.3,width/2-.3])box(.35,y,2,mats.dark,scene,x+dx,y/2,-1.2);box(width,.08,.15,mats.edge,scene,x,y+.2,1);}
platform(41,5,4);platform(49,6.6,6);platform(64,6.8,4);
function control(x,y){const g=new THREE.Group();g.position.set(x,y,0);scene.add(g);box(.8,1.2,.6,mats.dark,g);const screen=box(.65,.8,.08,mats.blue,g,0,.08,.34);return screen;}
const bridgeControl=control(41,6.5),terminal=control(64,8);
label('桥梁开关 · 翼龙互动',41,8.5);label('02 高处仓库 · 能源电池',50,10.3);label('防御终端 · 可关闭炮台',64,10.2);
const cell=new THREE.Group();scene.add(cell);box(.8,1.05,.7,mats.yellow,cell);box(.55,.65,.73,mats.blue,cell);box(.5,.14,.45,mats.dark,cell,0,.6);
const station=new THREE.Group();station.position.set(71,0,-2.4);scene.add(station);
box(4,.4,3,mats.dark,station,0,.2);box(2,3,1.2,mats.steel,station,0,1.8);box(1.45,1.5,.15,mats.dark,station,0,2.1,.7);
const stationLight=box(.3,1.1,.2,mats.red,station,.45,2.1,.82);
for(let i=0;i<3;i++)box(.3,.2,.2,mats.yellow,station,-.4,1.7+i*.3,.8);
label('03 供电站 · 战车接通动力',71,5.7,-2);
const turret=new THREE.Group();turret.position.set(81,5,0);scene.add(turret);
cylinder(.8,4,mats.dark,scene,81,2,-.3);box(1.8,.4,2,mats.steel,scene,81,4.2,0);
const turretHead=new THREE.Group();turret.add(turretHead);box(1.6,1,1.1,mats.dark,turretHead);box(1.3,.22,.5,mats.red,turretHead,-1,.1,0);
const turretCore=mesh(new THREE.IcosahedronGeometry(.48,0),mats.red,turretHead,0,.1,.65);
const turretHalo=mesh(new THREE.TorusGeometry(.75,.03,6,28),mats.red,turret,0,.1,.7);
label('炮台 · 俯冲命中 × 3',81,7.6);
const wall=new THREE.Group();scene.add(wall);wall.position.x=94;
const chunks=[];
for(let row=0;row<8;row++)for(let col=0;col<3;col++){
 const chunk=box(1.1,1.45,1.85,col===1&&row%2===0?mats.edge:mats.rock,wall,0,row*1.5+.7,(col-1)*1.95);
 chunk.userData.origin=chunk.position.clone();chunks.push(chunk);
}
label('04 裂墙 · 合体冲刺',94,13);let brokenAt=null;
const exit=new THREE.Group();exit.position.x=105;scene.add(exit);
for(const z of [-2.6,2.6]){box(.6,5,.6,mats.steel,exit,0,2.5,z);box(.16,4,.65,mats.green,exit,-.33,2.5,z);}
box(.6,.6,5.8,mats.steel,exit,0,5.2,0);label('出口 · 一起归来',105,7);
// Distant ruins form a backdrop without competing with interactable objects.
const ruins=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material('#365950'),30),dummy=new THREE.Object3D();
for(let i=0;i<30;i++){dummy.position.set(i*5-12,2,-12-i%3*5);dummy.scale.set(2+i%3,4+i%7,3);dummy.rotation.y=i*.3;dummy.updateMatrix();ruins.setMatrixAt(i,dummy.matrix);}scene.add(ruins);
const rig=buildModel(),truck=new THREE.Group(),bird=new THREE.Group();scene.add(truck,bird);truck.add(rig.chassis);bird.add(rig.creature);rig.chassis.scale.setScalar(.58);rig.creature.scale.setScalar(.58);
const wheels=rig.chassis.children.filter(c=>c.name==='Wheel with tread and spoked rim');
const shield=mesh(new THREE.SphereGeometry(3,24,12),new THREE.MeshBasicMaterial({color:'#8cddd2',transparent:true,opacity:.14,wireframe:true}),truck,0,1.4);
const ring=mesh(new THREE.TorusGeometry(1.45,.035,6,40),new THREE.MeshBasicMaterial({color:'#f5d478'}));ring.rotation.x=-Math.PI/2;
const birdRing=mesh(new THREE.TorusGeometry(.85,.025,6,32),new THREE.MeshBasicMaterial({color:'#b9f5d7'}));
const hitRing=mesh(new THREE.TorusGeometry(1.6,.1,6,32),new THREE.MeshBasicMaterial({color:'#f8c475',transparent:true,opacity:.6}));
const bullets=Array.from({length:12},()=>mesh(new THREE.SphereGeometry(.16,8,6),mats.red));
let prev=performance.now();
function resize(){const host=$('canvas'),w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);const aspect=w/h,width=Math.max(22,15.6*aspect);camera.left=-width/2;camera.right=width/2;camera.top=width/aspect/2;camera.bottom=-width/aspect/2;camera.updateProjectionMatrix();}
function draw(dt){
 rig.poseCreature({wing:state.docked?0:.45+Math.sin(state.time*8)*.35});rig.creature.position.set(0,0,0);rig.creature.rotation.z=state.attack>0?-.25:0;
 truck.position.set(state.truck.x,0,0);bird.position.set(state.bird.x,state.bird.y,0);bird.visible=state.respawn===0;
 wheels.forEach(w=>w.rotation.z=-state.truck.x/.464);shield.visible=state.shield;
 ring.position.set(state.truck.x,.13,0);ring.visible=state.active==='truck';birdRing.position.set(state.bird.x,state.bird.y,-.5);birdRing.visible=state.active==='bird';
 hitRing.visible=state.attack>.25;hitRing.position.copy(bird.position);hitRing.scale.setScalar(1+( .65-state.attack)*2);
 crate.position.set(state.crate,0,state.crateParked?-2.1:0);
 plate.material=state.plateHeld?mats.green:mats.yellow;
 bridge.position.y=THREE.MathUtils.lerp(bridge.position.y,state.bridgeOpen?-.04:-3,1-Math.exp(-dt*5));
 bridgeControl.material=state.bridgeEnabled?mats.green:mats.blue;terminal.material=state.turretOff?mats.green:mats.blue;stationLight.material=state.powered?mats.green:mats.red;
 cell.visible=state.battery!=='installed';cell.position.set(state.batteryPos.x,state.batteryPos.y,0);
 if(state.battery==='socket')cell.position.set(71,2.1,-1.45);
 cell.rotation.y=state.battery==='shelf'?state.time:0;
 tether.visible=state.towing;if(tether.visible){const a=new THREE.Vector3(state.truck.x,1,0),b=new THREE.Vector3(state.crate,1,0);tether.position.copy(a).add(b).multiplyScalar(.5);tether.scale.y=a.distanceTo(b);tether.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());}
 turretCore.material=state.turretOff?mats.dark:mats.red;turretHalo.visible=!state.turretOff&&state.turretHp>0;turretHead.visible=state.turretHp>0;
 const target=state.active==='bird'?state.bird:{x:state.truck.x,y:1.4};turretHead.rotation.z=Math.atan2(WORLD.turret.y-target.y,WORLD.turret.x-target.x);
 turretHalo.rotation.z=state.time;
 bullets.forEach((b,i)=>{const shot=state.shots[i];b.visible=!!shot;if(shot)b.position.set(shot.x,shot.y,0);});
 if(state.wallBroken&&brokenAt===null)brokenAt=state.time;if(!state.wallBroken)brokenAt=null;
 chunks.forEach((c,i)=>{c.position.copy(c.userData.origin);c.rotation.set(0,0,0);c.visible=true;if(brokenAt!==null){const t=Math.min(2,state.time-brokenAt);c.position.x+=t*(2+i%3);c.position.y-=t*t*3;c.position.z+=t*((i%3)-1)*3;c.rotation.z=t*(i%2?1:-1);c.visible=t<2;}});
 const focus=state.active==='bird'?state.bird.x:state.truck.x;
 cameraX=THREE.MathUtils.lerp(cameraX,THREE.MathUtils.clamp(focus+4,13,101),1-Math.exp(-dt*4));camera.position.set(cameraX,13.2,32);camera.lookAt(cameraX,5.7,0);
 renderer.render(scene,camera);
}
function sync(){
 const role=state.active==='bird'?'机械翼龙':state.docked?'合体战车':'探索战车';
 $('role-name').textContent=role;$('hp').textContent=Math.ceil(state[state.active].hp);$('energy').textContent=Math.floor(state.energy);$('lives').textContent=`♥ ${state.lives}`;
 $('objective').textContent=objective(state);
 $('truck-marker').style.left=`${state.truck.x/108*100}%`;$('bird-marker').style.left=`${state.bird.x/108*100}%`;
 const label=actionLabel(state);$('context-prompt').textContent=state.status==='playing'&&label?`E · ${label}`:'';
 $('interact-label').textContent=label||'附近互动';$('switch-label').textContent=state.docked?'翼龙出动':state.active==='bird'?'切换战车':'切换翼龙';
 $('skill-label').textContent=state.active==='bird'?'俯冲打击':state.docked?'合体冲刺':state.shield?'收起护盾':'展开护盾';$('dock-label').textContent=state.docked?'分离':state.recalling?'取消召回':Math.abs(state.bird.x-state.truck.x)>3.3||state.bird.y>4.1?'召回合体':'车顶合体';
 for(const id of ['switch','interact','skill','dock'])$(id).disabled=state.status!=='playing'||state.respawn>0;
 $('joystick').setAttribute('aria-disabled',String(state.status!=='playing'));
 $('task-bridge').classList.toggle('done',state.bridgeEnabled&&state.crateParked);$('task-battery').classList.toggle('done',state.battery!=='shelf');$('task-power').classList.toggle('done',state.powered);$('task-exit').classList.toggle('done',state.status==='won');
 if(state.eventId!==lastEvent){lastEvent=state.eventId;if(state.event!=='ready'){$('message').textContent=state.event;messageEnd=state.time+5;}}
 $('message').classList.toggle('show',state.time<messageEnd&&state.status==='playing');
 if(lastStatus===state.status)return;lastStatus=state.status;
 $('overlay').hidden=state.status==='playing';$('pause-button').disabled=['ready','won','lost'].includes(state.status);$('pause-button').textContent=state.status==='paused'?'▶':'Ⅱ';$('pause-button').setAttribute('aria-label',state.status==='paused'?'继续游戏':'暂停游戏');
 $('intro-icons').hidden=state.status!=='ready';$('restart').hidden=state.status!=='paused';
 if(state.status==='paused'){$('overlay-kicker').textContent='搭档会在原地等你';$('overlay-title').textContent='休息一下';$('overlay-copy').textContent=objective(state);$('primary').textContent='继续救援 →';$('overlay-note').textContent='恢复后继续刚才的探索。需要提示可以展开下方搭档手册。';}
 if(state.status==='won'){$('overlay-kicker').textContent='MISSION COMPLETE / 断桥供电站';$('overlay-title').textContent='一起回来了。';$('overlay-copy').textContent=`供电恢复，通路重建。耗时 ${Math.floor(state.time/60)} 分 ${Math.floor(state.time%60)} 秒，剩余 ${state.lives} 次接应机会。${state.turretOff?'你选择关闭防御，完成了和平救援。':state.turretHp===0?'你拆除了炮台，扫清了前路。':'你成功绕过了防御。'}`;$('primary').textContent='换一种方法，再玩一次 ↗';$('overlay-note').textContent='尝试另一条运输路线，或用另一种方式通过炮台。';}
 if(state.status==='lost'){$('overlay-title').textContent='需要重新整备';$('overlay-copy').textContent='接应机会已用完。可以先关闭高处的防御终端，再安全运送电池。';$('primary').textContent='重新开始 →';$('overlay-note').textContent='合体能恢复装甲；护盾也能保护靠近战车的翼龙。';}
 if(state.status==='paused'||state.status==='won'||state.status==='lost')$('primary').focus({preventScroll:true});
}
function resetInput(){keys.clear();stickPointer=null;axis={x:0,y:0};$('thumb').style.transform='translate(0,0)';$('joystick').classList.remove('held');$('joystick').setAttribute('aria-valuenow','0');$('joystick').setAttribute('aria-valuetext','静止');}
function restart(){resetInput();state=createRescue();lastStatus='';lastEvent=-1;messageEnd=0;cameraX=15;start(state);sync();}
function togglePause(){resetInput();if(state.status==='playing')pause(state);else if(state.status==='paused')resume(state);sync();}
$('primary').addEventListener('click',()=>{resetInput();if(state.status==='ready')start(state);else if(state.status==='paused')resume(state);else restart();sync();});
$('restart').addEventListener('click',restart);$('pause-button').addEventListener('click',togglePause);
$('switch').addEventListener('click',()=>{resetInput();switchRole(state);sync();});$('interact').addEventListener('click',()=>interact(state));$('skill').addEventListener('click',()=>skill(state));$('dock').addEventListener('click',()=>{dock(state);resetInput();});
$('help-button').addEventListener('click',()=>{if(state.status==='playing')togglePause();$('help').open=true;$('help').scrollIntoView({behavior:'smooth',block:'start'});});
const movement=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'];
window.addEventListener('keydown',e=>{
 if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(!e.repeat)togglePause();return;}
 if(state.status!=='playing')return;
 if(movement.includes(e.code)){e.preventDefault();keys.add(e.code);return;}
 if(['Tab','KeyQ','KeyE','Space'].includes(e.code)){e.preventDefault();if(e.repeat)return;
  if(e.code==='Tab'){resetInput();switchRole(state);}if(e.code==='KeyQ')dock(state);if(e.code==='KeyE')interact(state);if(e.code==='Space')skill(state);sync();
 }
});window.addEventListener('keyup',e=>keys.delete(e.code));
const joystick=$('joystick');
function moveStick(e){if(e.pointerId!==stickPointer)return;const r=joystick.getBoundingClientRect(),travel=25,dx=(e.clientX-r.left-r.width/2)/travel,dy=-(e.clientY-r.top-r.height/2)/travel,len=Math.hypot(dx,dy),factor=len>1?1/len:1;axis=len<.16?{x:0,y:0}:{x:dx*factor,y:dy*factor};$('thumb').style.transform=`translate(${axis.x*travel}px,${-axis.y*travel}px)`;joystick.setAttribute('aria-valuenow',String(Math.round(axis.x*100)));joystick.setAttribute('aria-valuetext',`水平 ${Math.round(axis.x*100)}，垂直 ${Math.round(axis.y*100)}`);}
joystick.addEventListener('pointerdown',e=>{if(state.status!=='playing'||stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);joystick.classList.add('held');moveStick(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer){e.preventDefault();moveStick(e);}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId===stickPointer)resetInput();});
function suspend(){resetInput();pause(state);sync();}window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
try{
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;$('canvas').appendChild(renderer.domElement);resize();new ResizeObserver(resize).observe($('canvas'));
 renderer.setAnimationLoop(now=>{const dt=Math.min(.1,(now-prev)/1000);prev=now;const held=(...names)=>names.some(n=>keys.has(n));const input={x:held('ArrowLeft','KeyA')?-1:held('ArrowRight','KeyD')?1:axis.x,y:held('ArrowUp','KeyW')?1:held('ArrowDown','KeyS')?-1:axis.y};tick(state,input,dt);draw(dt);sync();});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();suspend();$('overlay-title').textContent='画面暂时中断';$('overlay-copy').textContent='请刷新页面重新加载。';$('primary').disabled=true;});
}catch(error){console.error(error);$('overlay-title').textContent='暂时无法启动场景';$('overlay-copy').textContent='请使用支持 WebGL 的浏览器，并开启硬件加速。';$('primary').disabled=true;}
