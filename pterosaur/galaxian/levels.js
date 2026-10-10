// 关卡只在这里配：扩展时不要在渲染代码中写波次或数值。
export const LEVELS=[{
 id:'trial-01',name:'积木编队试飞',palette:{sky:'#dfe9e4',fog:'#dfe9e4',accent:'#efb63b'},
 player:{lives:3,fireRate:.26,speed:12},
 waves:[
  {label:'巡航编队',rows:2,cols:4,health:1,drift:1.25,diveEvery:3.6,score:100},
  {label:'交错俯冲',rows:2,cols:5,health:1,drift:1.8,diveEvery:2.35,score:150},
  {label:'翼龙指挥机',rows:1,cols:5,health:2,drift:2.2,diveEvery:1.9,score:220}
 ],
 boss:{health:22,shotEvery:1.15,score:1800}
}];
export const getLevel=id=>LEVELS.find(level=>level.id===id)||LEVELS[0];
