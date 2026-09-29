import test from 'node:test';
import assert from 'node:assert/strict';
import {createRescue,start,tick,switchRole,interact,dock,skill,pause,resume,hurt,WORLD} from './state.js';
const run=(s,seconds,input={})=>{for(let i=0;i<seconds*60;i++)tick(s,input,1/60);};
function go(s,x,y){for(let i=0;i<3000;i++){const p=s.active==='bird'?s.bird:s.truck;const dx=x-p.x,dy=s.active==='bird'?y-p.y:0;if(Math.abs(dx)<.09&&Math.abs(dy)<.09)return;tick(s,{x:Math.abs(dx)>.05?Math.sign(dx):0,y:Math.abs(dy)>.05?Math.sign(dy):0},1/60);}assert.fail(`cannot reach ${x},${y}, at ${s[s.active].x},${s[s.active].y}`);}
test('complete rescue through crate, bridge, battery, terminal, power and combined dash',()=>{
 const s=createRescue();start(s);go(s,18.7,0);assert.equal(s.crateParked,true);
 switchRole(s);go(s,41,6.5);interact(s);tick(s,{},1/60);assert.equal(s.bridgeOpen,true);
 go(s,49,8);interact(s);assert.equal(s.battery,'bird');
 go(s,s.truck.x,3);interact(s);assert.equal(s.battery,'truck');
 switchRole(s);go(s,54,0);switchRole(s);go(s,64,8);interact(s);assert.equal(s.turretOff,true);
 switchRole(s);go(s,71,0);interact(s);assert.equal(s.powered,true);
 switchRole(s);go(s,71,3);dock(s);assert.equal(s.docked,true);
 go(s,91,0);skill(s);run(s,1,{x:1});assert.equal(s.wallBroken,true);run(s,3,{x:1});assert.equal(s.status,'won');assert.equal(s.lives,8);
});
test('bridge requires switch plus pressure and truck cannot drive into an unpowered gap',()=>{
 const s=createRescue();start(s);run(s,10,{x:1});assert.ok(s.truck.x<=25);assert.equal(s.bridgeOpen,false);
 s.bridgeEnabled=true;tick(s,{},1/60);assert.equal(s.bridgeOpen,true);
 s.crate=10;s.crateParked=false;s.truck.x=7;tick(s,{},1/60);assert.equal(s.bridgeOpen,false);
});
test('carried battery blocks attack and can be dropped, retrieved or installed directly',()=>{
 const s=createRescue();start(s);switchRole(s);go(s,49,8);interact(s);skill(s);assert.equal(s.attack,0);
 go(s,55,6);interact(s);assert.equal(s.battery,'ground');run(s,2);go(s,55,1.8);interact(s);assert.equal(s.battery,'bird');
 go(s,71,2.5);interact(s);assert.equal(s.battery,'socket');assert.equal(s.powered,false);
});
test('combat offers turret destruction and shield interception across role switches',()=>{
 const s=createRescue();start(s);switchRole(s);s.truck.x=77;s.bird={x:80,y:7,hp:100};s.active='truck';skill(s);switchRole(s);assert.equal(s.shield,true);
 s.shots=[{x:77,y:2,vx:0,vy:0,ttl:1}];tick(s,{},1/60);assert.equal(s.truck.hp,100);assert.equal(s.shots.length,0);
 for(let i=0;i<3;i++){skill(s);run(s,.7);}assert.equal(s.turretHp,0);
});
test('remote recall flies back before docking; early dashing is rejected and pause freezes simulation',()=>{
 const s=createRescue();start(s);skill(s);assert.equal(s.dash,0);switchRole(s);go(s,20,8);dock(s);assert.equal(s.docked,false);assert.equal(s.recalling,true);
 pause(s);const before=JSON.stringify(s);run(s,10,{x:1});assert.equal(JSON.stringify(s),before);resume(s);assert.equal(s.status,'playing');run(s,4);assert.equal(s.docked,true);
});
test('repair, checkpoint rescue and eight-life failure preserve puzzle progress',()=>{
 const s=createRescue();start(s);s.truck.hp=50;s.bird.hp=20;run(s,5);assert.equal(s.truck.hp,100);assert.equal(s.bird.hp,100);
 s.powered=true;s.checkpoint=71;s.battery='bird';s.invincible=0;hurt(s,'bird',100);run(s,2);assert.equal(s.truck.x,71);assert.equal(s.battery,'truck');assert.equal(s.lives,7);
 for(let i=0;i<7;i++){s.invincible=0;hurt(s,'truck',100);run(s,2);}assert.equal(s.status,'lost');assert.equal(s.lives,0);
});
