import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,tick,damage,loseLife,takeOff,pauseGame,resumeGame,DOCK_Y,LEVEL_LENGTH,hazardY} from './game-state.js';
const run=(g,seconds,input={})=>{for(let i=0;i<Math.ceil(seconds*60);i++)tick(g,input,1/60);};
function emptyFlight(){const g=createGame();startGame(g);g.hazards=[];g.pickups=[];g.y=8;g.vy=0;g.invincible=0;return g;}
test('ready waits for start; eight lives are distinct from HP and collision protection',()=>{
 const g=createGame();run(g,2,{up:true});assert.equal(g.status,'ready');assert.equal(g.x,4);
 startGame(g);assert.equal(g.lives,8);assert.equal(g.docked,false);g.invincible=0;
 assert.equal(damage(g),true);assert.equal(g.hp,66);assert.equal(g.lives,8);
 assert.equal(damage(g),false);assert.equal(g.hp,66);
 g.invincible=0;damage(g);g.invincible=0;damage(g);assert.equal(g.hp,0);assert.equal(g.lives,7);
 damage(g);loseLife(g);assert.equal(g.lives,7);run(g,1.7);
 assert.equal(g.hp,100);assert.equal(g.docked,true);assert.equal(g.lives,7);assert.equal(g.y,DOCK_Y);
});
test('holding down lands on the moving truck, heals and waits without progressing',()=>{
 const g=emptyFlight();run(g,2);g.hp=40;run(g,4,{down:true});
 assert.equal(g.docked,true);assert.equal(g.lives,8);assert.ok(g.hp>40);
 const distance=g.distance,x=g.x;run(g,6);assert.equal(g.hp,100);assert.equal(g.distance,distance);assert.equal(g.x,x);
 assert.equal(damage(g),false);takeOff(g);assert.equal(g.docked,false);assert.ok(g.vy>0);
});
test('eight failures exhaust the eight lives; respawn cannot double-charge',()=>{
 const g=emptyFlight();
 for(let i=7;i>=0;i--){loseLife(g);assert.equal(g.lives,i);if(i){run(g,1.7);takeOff(g);}}
 assert.equal(g.status,'lost');const saved=JSON.stringify(g);run(g,3,{up:true});assert.equal(JSON.stringify(g),saved);
 assert.equal(createGame().lives,8);
});
test('pause freezes movement, collision timers and healing',()=>{
 const g=emptyFlight();damage(g);pauseGame(g);const saved=JSON.stringify(g);run(g,3,{up:true});assert.equal(JSON.stringify(g),saved);
 resumeGame(g);tick(g,{},1/60);assert.ok(g.time>0);
});
test('obstacles collide, moving hazards change altitude, energy is collected once',()=>{
 const g=emptyFlight();g.vx=0;g.hazards=[{id:'test',type:'pillar',x:g.x,y:8,w:1,h:2}];tick(g,{},1/60);assert.equal(g.hp,66);
 const h={type:'moving',y:6,phase:0};assert.notEqual(hazardY(h,0),hazardY(h,1));
 g.hazards=[];g.pickups=[{id:0,x:g.x,y:g.y,collected:false}];tick(g,{},1/60);assert.equal(g.score,10);tick(g,{},1/60);assert.equal(g.score,10);
});
test('falling costs a life, a finish awards victory, new game resets the route',()=>{
 const g=emptyFlight();g.y=.2;g.carX=0;tick(g,{},1/60);assert.equal(g.lives,7);
 const winner=emptyFlight();winner.x=LEVEL_LENGTH-.01;winner.vx=8;tick(winner,{right:true},1/60);assert.equal(winner.status,'won');
 const fresh=createGame();assert.equal(fresh.score,0);assert.ok(fresh.pickups.every(p=>!p.collected));assert.equal(fresh.distance,4);
});
test('a full level is navigable at normal speed without losing a life',()=>{
 const g=createGame();startGame(g);
 for(let frame=0;frame<60*200&&g.status==='playing';frame++){
  const index=Math.max(0,Math.ceil((g.x-36-1.6)/20));
  const type=index%3;
  let target=type===0?10:type===1?10.6:4.7+(Math.sin(index*1.8)+1)*2;
  const projected=g.y+g.vy*.18;
  tick(g,{up:projected<target-.08,down:projected>target+.08},1/60);
 }
 assert.equal(g.status,'won');assert.equal(g.lives,8);assert.ok(g.time>120&&g.time<180);
});

test('a low-altitude hit leaves time for the truck to rescue the bird',()=>{
 const g=emptyFlight();g.y=3;run(g,2);damage(g);run(g,3,{down:true});
 assert.equal(g.lives,8);assert.equal(g.docked,true);assert.ok(g.hp>66);
});
