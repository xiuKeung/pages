import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from './levels.js';

test('每个投放突袭关卡都有可读的波次与安全的节奏参数',()=>{
  assert.equal(LEVELS.length,6,'首批关卡包应包含六关');
  assert.equal(new Set(LEVELS.map(level=>level.id)).size,LEVELS.length,'关卡 ID 必须唯一');
  for(const level of LEVELS){
    assert.ok(level.waves.length>=3);
    assert.ok(level.player.lives>=3);
    for(const wave of level.waves){
      assert.ok(wave.count>0);
      assert.ok(wave.deployEvery>=1.8,'投放间隔须保留反应时间');
      assert.ok(wave.diveSpeed>0&&wave.diveSpeed<=8,'俯冲速度须保留移动空间');
      assert.equal(wave.health,2,'合体翼龙战车固定需要两次命中');
    }
  }
});

test('首批关卡逐步提高投放与俯冲压力',()=>{
  const pressure=level=>level.waves.reduce((sum,wave)=>sum+wave.count+wave.drift+wave.diveSpeed+(5-wave.deployEvery),0);
  assert.ok(pressure(LEVELS.at(-1))>pressure(LEVELS[0]));
});
