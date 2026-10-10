// 关卡只在这里配：合体巡航、投放与俯冲都不写入渲染代码。
export const LEVELS=[{
 id:'trial-01',name:'投放突袭',palette:{sky:'#dfe9e4',fog:'#dfe9e4',accent:'#efb63b'},
 player:{lives:4,fireRate:.28,speed:12},
 waves:[
  {label:'合体侦察队',count:3,health:2,drift:1.5,deployEvery:4.2,diveSpeed:5.8,score:180},
  {label:'分离投放队',count:4,health:2,drift:2.1,deployEvery:3.1,diveSpeed:6.6,score:240},
  {label:'翼龙突袭队',count:4,health:3,drift:2.8,deployEvery:2.25,diveSpeed:7.4,score:320}
 ]
}];
export const getLevel=id=>LEVELS.find(level=>level.id===id)||LEVELS[0];
