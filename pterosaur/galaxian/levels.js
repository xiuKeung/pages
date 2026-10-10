// 关卡只在这里配：合体巡航、投放与俯冲都不写入渲染代码。
// 每关只提升一个主要压力变量，保持手机竖屏下的可读性与闪避空间。
const basePlayer={lives:4,fireRate:.28,speed:12};
const palette={sky:'#dfe9e4',fog:'#dfe9e4',accent:'#efb63b'};
export const LEVELS=[
 {id:'level-01',name:'首次拦截',palette,player:basePlayer,waves:[
 {label:'合体侦察队',count:4,formation:'line',health:2,drift:1.5,deployEvery:3.8,diveSpeed:6.2,score:200},
  {label:'分离投放队',count:4,formation:'wedge',health:2,drift:1.9,deployEvery:3.05,diveSpeed:6.6,score:250},
  {label:'翼龙突袭队',count:5,formation:'grid',health:2,drift:2.2,deployEvery:2.65,diveSpeed:7.0,score:310}
 ]},
 {id:'level-02',name:'交错巡航',palette,player:basePlayer,waves:[
  {label:'双列巡航队',count:4,formation:'line',health:2,drift:2.0,deployEvery:3.55,diveSpeed:6.5,score:250},
  {label:'错位投放队',count:5,formation:'stagger',health:2,drift:2.3,deployEvery:2.8,diveSpeed:6.9,score:310},
  {label:'翼龙追击队',count:5,formation:'grid',health:2,drift:2.6,deployEvery:2.45,diveSpeed:7.3,score:370}
 ]},
 {id:'level-03',name:'低空投放',palette,player:basePlayer,waves:[
  {label:'试探投放队',count:5,formation:'grid',health:2,drift:2.0,deployEvery:3.25,diveSpeed:6.7,score:300},
  {label:'连续投放队',count:5,formation:'wedge',health:2,drift:2.4,deployEvery:2.6,diveSpeed:7.1,score:360},
  {label:'低空翼龙队',count:6,formation:'stagger',health:2,drift:2.7,deployEvery:2.3,diveSpeed:7.5,score:430}
 ]},
 {id:'level-04',name:'回旋警报',palette,player:basePlayer,waves:[
  {label:'回旋侦察队',count:5,formation:'stagger',health:2,drift:2.5,deployEvery:3.0,diveSpeed:6.9,score:350},
  {label:'折返投放队',count:6,formation:'grid',health:2,drift:2.8,deployEvery:2.45,diveSpeed:7.3,score:410},
  {label:'回旋突袭队',count:6,formation:'wedge',health:2,drift:3.0,deployEvery:2.15,diveSpeed:7.7,score:480}
 ]},
 {id:'level-05',name:'边界拦截',palette,player:basePlayer,waves:[
  {label:'扩散巡航队',count:6,formation:'wedge',health:2,drift:2.8,deployEvery:2.8,diveSpeed:7.1,score:390},
  {label:'边界投放队',count:6,formation:'stagger',health:2,drift:3.0,deployEvery:2.3,diveSpeed:7.5,score:460},
  {label:'压迫翼龙队',count:7,formation:'grid',health:2,drift:3.2,deployEvery:2.0,diveSpeed:7.8,score:540}
 ]},
 {id:'level-06',name:'终端突袭',palette,player:basePlayer,waves:[
  {label:'终端侦察队',count:6,formation:'grid',health:2,drift:2.8,deployEvery:2.55,diveSpeed:7.3,score:450},
  {label:'终端投放队',count:7,formation:'wedge',health:2,drift:3.1,deployEvery:2.15,diveSpeed:7.7,score:520},
  {label:'终端翼龙队',count:8,formation:'stagger',health:2,drift:3.35,deployEvery:1.85,diveSpeed:8.0,score:620}
 ]}
];
export const getLevel=id=>LEVELS.find(level=>level.id===id)||LEVELS[0];
