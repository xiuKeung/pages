// Pure game rules, shared by the renderer and deterministic simulation tests.
export const LEVEL_LENGTH = 760;
export const MAX_LIVES = 8;
export const DOCK_Y = 1.72;
export const BIRD_RADIUS = .34;
export function createLevel() {
  const hazards = [], pickups = [];
  for(let i=0;i<36;i++) {
    const x=36+i*20, type=i%3;
    const gap=4.7+(Math.sin(i*1.8)+1)*2.0;
    if(type===0) hazards.push({id:`pillar-${i}`,type:'pillar',x,y:4.1+(i%4)*.5,w:1.25,h:4.4+(i%4),phase:0});
    if(type===1) hazards.push({id:`moving-${i}`,type:'moving',x,y:6.7,w:1.4,h:1.4,phase:i*.8});
    if(type===2) {
      const lowerTop=gap-1.85, upperBottom=gap+1.85;
      hazards.push({id:`gate-low-${i}`,type:'gate',x,y:(1.9+lowerTop)/2,w:1.0,h:lowerTop-1.9,phase:0});
      hazards.push({id:`gate-high-${i}`,type:'gate',x,y:(upperBottom+13)/2,w:1.0,h:13-upperBottom,phase:0});
    }
    pickups.push({id:i,x:x-6,y:type===2?gap:type===0?9.7:5.0,collected:false});
  }
  return {hazards,pickups};
}
export function createGame() {
  return {status:'ready',x:4,y:DOCK_Y,vx:0,vy:0,carX:4,hp:100,lives:MAX_LIVES,score:0,time:0,distance:4,
    docked:true,invincible:0,stun:0,respawn:0,event:'ready',eventId:0,...createLevel()};
}
function announce(g,event) {g.event=event;g.eventId++;}
export function startGame(g) {if(g.status==='ready'){g.status='playing';takeOff(g);}}
export function takeOff(g) {
  if(g.status!=='playing'||!g.docked||g.respawn>0)return;
  g.docked=false;g.y=DOCK_Y+.42;g.vy=4.2;g.invincible=Math.max(g.invincible,1.3);announce(g,'takeoff');
}
export function pauseGame(g) {if(g.status==='playing')g.status='paused';}
export function resumeGame(g) {if(g.status==='paused')g.status='playing';}
export function loseLife(g) {
  if(g.status!=='playing'||g.respawn>0)return;
  g.lives--;g.hp=0;g.vx=g.vy=0;
  if(g.lives<=0){g.status='lost';announce(g,'lost');return;}
  g.respawn=1.6;announce(g,'life-lost');
}
export function damage(g,amount=34) {
  if(g.status!=='playing'||g.docked||g.invincible>0||g.respawn>0)return false;
  g.hp=Math.max(0,g.hp-amount);g.invincible=1.65;g.stun=.3;g.vx=-2;g.vy=-2.6;
  if(g.hp===0)loseLife(g);else announce(g,'hit');
  return true;
}
export function hazardY(h,time) {return h.y+(h.type==='moving'?Math.sin(time*1.3+h.phase)*2.8:0);}
export function overlaps(g,h) {
  const cx=Math.max(h.x-h.w/2,Math.min(g.x,h.x+h.w/2));
  const cy=Math.max(hazardY(h,g.time)-h.h/2,Math.min(g.y,hazardY(h,g.time)+h.h/2));
  return (g.x-cx)**2+(g.y-cy)**2<BIRD_RADIUS**2;
}
export function tick(g,input,delta) {
  if(g.status!=='playing')return;
  // Bounded steps prevent tunnelling even when a device delivers a long frame.
  const steps=Math.max(1,Math.ceil(Math.min(delta,.25)/(1/60))), dt=Math.min(delta,.25)/steps;
  for(let i=0;i<steps&&g.status==='playing';i++)step(g,input,dt);
}
function step(g,input,dt) {
  g.time+=dt;g.invincible=Math.max(0,g.invincible-dt);g.stun=Math.max(0,g.stun-dt);
  if(g.respawn>0){
    g.respawn=Math.max(0,g.respawn-dt);
    if(g.respawn===0){g.x=g.carX;g.y=DOCK_Y;g.hp=100;g.docked=true;g.stun=0;g.invincible=2;announce(g,'respawn');}
    return;
  }
  if(g.docked){
    g.x=g.carX;g.y=DOCK_Y;g.vx=g.vy=0;g.hp=Math.min(100,g.hp+20*dt);
    if(input.up||input.launch)takeOff(g);
    return;
  }
  const previousY=g.y;
  if(g.stun===0){
    const desiredX=input.left?-4:input.right?8:input.down&&g.y<4.5?1.2:5.2;
    const desiredY=input.up?5.2:input.down?(g.y<3.0?-1.7:-4.6):0;
    const smoothing=1-Math.exp(-dt*5);
    g.vx+=(desiredX-g.vx)*smoothing;g.vy+=(desiredY-g.vy)*smoothing;
  }
  g.x=Math.max(0,g.x+g.vx*dt);g.y=Math.min(12.1,g.y+g.vy*dt);
  if(g.y===12.1)g.vy=Math.min(g.vy,0);
  // Truck only follows the bird; waiting on its roof cannot finish the level.
  const carTarget=g.x-.5, carStep=Math.max(-7*dt,Math.min(7*dt,(carTarget-g.carX)*3*dt));
  g.carX=Math.max(0,g.carX+carStep);
  if(g.vy<=0&&g.y<=DOCK_Y+.13&&previousY>=DOCK_Y-.1&&Math.abs(g.x-g.carX)<1.3&&Math.abs(g.vy)<3.4&&g.stun===0){
    g.docked=true;g.y=DOCK_Y;g.vx=g.vy=0;announce(g,'landed');return;
  }
  if(g.y<.35){loseLife(g);return;}
  for(const h of g.hazards){if(Math.abs(h.x-g.x)<2&&overlaps(g,h)){if(damage(g))break;}}
  if(g.respawn>0||g.status!=='playing')return;
  for(const p of g.pickups){if(!p.collected&&(p.x-g.x)**2+(p.y-g.y)**2<.8**2){p.collected=true;g.score+=10;announce(g,'pickup');}}
  g.distance=Math.max(g.distance,g.x);
  if(g.x>=LEVEL_LENGTH){g.status='won';announce(g,'won');}
}
