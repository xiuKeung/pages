// 关卡只在这里配：合体巡航、投放与俯冲都不写入渲染代码。
// 每关只提升一个主要压力变量，保持手机竖屏下的可读性与闪避空间。
const basePlayer={lives:4,fireRate:.28,speed:12};
const palette={sky:'#dfe9e4',fog:'#dfe9e4',accent:'#efb63b'};
export const LEVELS=[
 {id:'level-01',name:'首次拦截',palette,player:basePlayer,waves:[
 {label:'合体侦察队',count:3,formation:'line',health:2,drift:1.3,deployEvery:4.4,diveSpeed:5.6,score:180},
  {label:'分离投放队',count:3,formation:'wedge',health:2,drift:1.7,deployEvery:3.7,diveSpeed:6.0,score:220},
  {label:'翼龙突袭队',count:4,formation:'grid',health:2,drift:2.0,deployEvery:3.2,diveSpeed:6.4,score:280}
 ]},
 {id:'level-02',name:'交错巡航',palette,player:basePlayer,waves:[
  {label:'双列巡航队',count:3,formation:'line',health:2,drift:1.8,deployEvery:4.0,diveSpeed:6.0,score:220},
  {label:'错位投放队',count:4,formation:'stagger',health:2,drift:2.0,deployEvery:3.35,diveSpeed:6.4,score:270},
  {label:'翼龙追击队',count:4,formation:'grid',health:2,drift:2.3,deployEvery:2.9,diveSpeed:6.8,score:330}
 ]},
 {id:'level-03',name:'低空投放',palette,player:basePlayer,waves:[
  {label:'试探投放队',count:4,formation:'grid',health:2,drift:1.7,deployEvery:3.8,diveSpeed:6.2,score:260},
  {label:'连续投放队',count:4,formation:'wedge',health:2,drift:2.1,deployEvery:3.05,diveSpeed:6.7,score:310},
  {label:'低空翼龙队',count:4,formation:'stagger',health:2,drift:2.4,deployEvery:2.65,diveSpeed:7.0,score:370}
 ]},
 {id:'level-04',name:'回旋警报',palette,player:basePlayer,waves:[
  {label:'回旋侦察队',count:4,formation:'stagger',health:2,drift:2.2,deployEvery:3.6,diveSpeed:6.4,score:300},
  {label:'折返投放队',count:4,formation:'grid',health:2,drift:2.5,deployEvery:2.95,diveSpeed:6.9,score:350},
  {label:'回旋突袭队',count:5,formation:'wedge',health:2,drift:2.7,deployEvery:2.55,diveSpeed:7.2,score:410}
 ]},
 {id:'level-05',name:'边界拦截',palette,player:basePlayer,waves:[
  {label:'扩散巡航队',count:4,formation:'wedge',health:2,drift:2.5,deployEvery:3.45,diveSpeed:6.6,score:340},
  {label:'边界投放队',count:5,formation:'stagger',health:2,drift:2.7,deployEvery:2.85,diveSpeed:7.0,score:400},
  {label:'压迫翼龙队',count:5,formation:'grid',health:2,drift:2.9,deployEvery:2.4,diveSpeed:7.4,score:470}
 ]},
 {id:'level-06',name:'终端突袭',palette,player:basePlayer,waves:[
  {label:'终端侦察队',count:5,formation:'grid',health:2,drift:2.4,deployEvery:3.25,diveSpeed:6.8,score:390},
  {label:'终端投放队',count:5,formation:'wedge',health:2,drift:2.8,deployEvery:2.7,diveSpeed:7.2,score:450},
  {label:'终端翼龙队',count:6,formation:'stagger',health:2,drift:3.0,deployEvery:2.2,diveSpeed:7.6,score:540}
 ]}
];
export const getLevel=id=>LEVELS.find(level=>level.id===id)||LEVELS[0];
